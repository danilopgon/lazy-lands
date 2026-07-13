"""RLS behavior tests for the initial supabase-setup migration.

Strict-TDD Phase 1 (RED): written BEFORE the migration + seed exist. Tests MUST
fail (or skip when the local stack is down) until Phase 2 applies the migration
and Phase 3 seeds the demo campaign.

These encode the security invariants from docs/07-data-security-and-rls.md and
FR-2/FR-3 of the spec — the security tests that make the 24 policies
behavioral, not textual.

Approach: connect as the postgres superuser, then inside each test open a
transaction that switches to the ``authenticated`` (or ``anon``) role with a
simulated JWT sub claim. ``force_rollback=True`` guarantees no test mutates the
seed data. The superuser bypasses RLS, so we MUST ``SET LOCAL ROLE`` to make
RLS actually apply.
"""

from __future__ import annotations

import contextlib
from collections.abc import Iterator

import psycopg
import pytest
from psycopg import Cursor

# Local Supabase DB DSN (postgres superuser; matches config.toml [db] port).
LOCAL_DB_DSN = "postgresql://postgres:postgres@localhost:54322/postgres"

# Seeded owner of the demo campaign — matches seed.sql + seed-auth.ts FIXED_UUID.
USER_A = "00000000-0000-0000-0000-000000000001"
# A second authenticated user that owns no data.
USER_B = "00000000-0000-0000-0000-000000000002"
# The seeded campaign (owned by USER_A) — matches seed.sql.
SEEDED_CAMPAIGN = "10000000-0000-0000-0000-000000000001"


@pytest.fixture(scope="module")
def db_conn():
    """Connect to the local Supabase Postgres; skip the module if it is down."""
    try:
        conn = psycopg.connect(LOCAL_DB_DSN, connect_timeout=2)
    except psycopg.OperationalError:
        pytest.skip("Local Supabase stack not running on :54322")
    yield conn
    conn.close()


# Roles exercised by these tests. Whitelisted because ``SET LOCAL ROLE`` takes
# a bare identifier, not a bind parameter — the role value is interpolated into
# the SQL string, so it must be one of these internal constants (never user
# input).
_ALLOWED_ROLES = {"authenticated", "anon"}


@contextlib.contextmanager
def as_user(conn: psycopg.Connection, role: str, sub: str | None) -> Iterator[Cursor]:
    """Run a block as ``role`` with a simulated JWT ``sub`` claim, then roll back.

    - ``role`` is ``"authenticated"`` or ``"anon"`` (whitelisted, never user
      input — ``SET LOCAL ROLE`` cannot accept a bind parameter).
    - ``sub`` is the UUID placed in ``request.jwt.claims ->> 'sub'`` so
      ``auth.uid()`` resolves to it. Pass ``None`` for unauthenticated (anon).
    - ``SET LOCAL`` keeps role/claim changes scoped to the transaction.
    - ``force_rollback=True`` guarantees no persistent mutations across tests.
    """
    if role not in _ALLOWED_ROLES:
        raise ValueError(f"unsupported role {role!r}; expected one of {_ALLOWED_ROLES}")
    with conn.transaction(force_rollback=True):
        with conn.cursor() as cur:
            # role is validated against a fixed internal whitelist, so it is
            # safe to interpolate into the SET LOCAL ROLE identifier slot.
            cur.execute(f"set local role {role}")
            if sub is not None:
                claims = f'{{"sub":"{sub}"}}'
                cur.execute(
                    "select set_config('request.jwt.claims', %s, true)", (claims,)
                )
            yield cur


# --- FR-2.2 / Scenario 1: Owner reads own campaign ---------------------------


def test_user_a_reads_own_campaign(db_conn) -> None:
    """User A SELECTs campaigns and gets exactly the 1 owned campaign row."""
    with as_user(db_conn, "authenticated", USER_A) as cur:
        cur.execute("select id from campaigns")
        rows = cur.fetchall()
    assert len(rows) == 1
    assert str(rows[0][0]) == SEEDED_CAMPAIGN


# --- FR-2.2 / Scenario 2: Non-owner silently filtered -----------------------


def test_user_b_reads_zero_campaigns(db_conn) -> None:
    """User B SELECTs campaigns and gets 0 rows (RLS filters silently)."""
    with as_user(db_conn, "authenticated", USER_B) as cur:
        cur.execute("select id from campaigns")
        rows = cur.fetchall()
    assert rows == []


# --- FR-2.2 / Scenario 3: Non-owner INSERT rejected -------------------------


def test_user_b_cannot_insert_session_into_user_a_campaign(db_conn) -> None:
    """User B INSERTing a session into A's campaign is rejected by RLS.

    An INSERT failing the ``WITH CHECK`` predicate raises
    ``InsufficientPrivilege`` (psycopg maps the ``new row violates row-level
    security policy`` error here).
    """
    with as_user(db_conn, "authenticated", USER_B) as cur:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            cur.execute(
                "insert into sessions (campaign_id, session_number) values (%s, 99)",
                (SEEDED_CAMPAIGN,),
            )


# --- FR-3.3 / Scenario: anon gets permission denied, NOT an empty set --------


def test_anon_cannot_select_campaigns(db_conn) -> None:
    """The `anon` role has NO table GRANT, so SELECT raises permission denied
    (InsufficientPrivilege), NOT an empty result set."""
    with as_user(db_conn, "anon", None) as cur:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            cur.execute("select id from campaigns")


# --- Child-entity ownership checks ------------------------------------------


def test_user_a_reads_two_seeded_sessions(db_conn) -> None:
    """User A SELECTs sessions and sees exactly the 2 seeded sessions."""
    with as_user(db_conn, "authenticated", USER_A) as cur:
        cur.execute("select id from sessions order by session_number")
        rows = cur.fetchall()
    assert len(rows) == 2


def test_user_b_reads_zero_sessions(db_conn) -> None:
    """User B SELECTs sessions and gets 0 rows (parent campaign not owned)."""
    with as_user(db_conn, "authenticated", USER_B) as cur:
        cur.execute("select id from sessions")
        rows = cur.fetchall()
    assert rows == []


# --- NPC ownership via parent campaign ---------------------------------------


def test_user_a_can_crud_own_npc(db_conn) -> None:
    """User A can create, read, and update npcs for their own campaign."""
    with as_user(db_conn, "authenticated", USER_A) as cur:
        cur.execute(
            """
            insert into npcs (campaign_id, name)
            values (%s, 'Herman Vale')
            returning id
            """,
            (SEEDED_CAMPAIGN,),
        )
        npc_id = cur.fetchone()[0]

        cur.execute("select name from npcs where id = %s", (npc_id,))
        assert cur.fetchone()[0] == "Herman Vale"

        cur.execute(
            "update npcs set name = 'Herman the Bitter' where id = %s returning name",
            (npc_id,),
        )
        assert cur.fetchone()[0] == "Herman the Bitter"


def test_user_b_cannot_select_insert_or_update_user_a_npcs(db_conn) -> None:
    """User B is filtered from A's npcs and cannot mutate A's campaign."""
    with as_user(db_conn, "authenticated", USER_A) as cur:
        cur.execute(
            "insert into npcs (campaign_id, name) values (%s, 'Seed NPC')",
            (SEEDED_CAMPAIGN,),
        )
        cur.execute("select id from npcs where campaign_id = %s", (SEEDED_CAMPAIGN,))
        assert cur.fetchall() != []

    with as_user(db_conn, "authenticated", USER_B) as cur:
        cur.execute("select id from npcs where campaign_id = %s", (SEEDED_CAMPAIGN,))
        assert cur.fetchall() == []

    with as_user(db_conn, "authenticated", USER_B) as cur:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            cur.execute(
                "insert into npcs (campaign_id, name) "
                "values (%s, 'Should not persist')",
                (SEEDED_CAMPAIGN,),
            )

    with as_user(db_conn, "authenticated", USER_B) as cur:
        cur.execute(
            "update npcs set name = 'hijacked' where campaign_id = %s returning id",
            (SEEDED_CAMPAIGN,),
        )
        assert cur.fetchall() == []


# --- Faction ownership via parent campaign -----------------------------------


def test_user_a_can_crud_own_faction(db_conn) -> None:
    """User A can create, read, and update factions for their own campaign."""
    with as_user(db_conn, "authenticated", USER_A) as cur:
        cur.execute(
            """
            insert into factions (campaign_id, name)
            values (%s, 'The Salt Guild')
            returning id
            """,
            (SEEDED_CAMPAIGN,),
        )
        faction_id = cur.fetchone()[0]

        cur.execute("select name from factions where id = %s", (faction_id,))
        assert cur.fetchone()[0] == "The Salt Guild"

        cur.execute(
            "update factions set name = 'The Broken Guild' "
            "where id = %s returning name",
            (faction_id,),
        )
        assert cur.fetchone()[0] == "The Broken Guild"


def test_user_b_cannot_select_insert_or_update_user_a_factions(db_conn) -> None:
    """User B is filtered from A's factions and cannot mutate A's campaign."""
    with as_user(db_conn, "authenticated", USER_A) as cur:
        cur.execute(
            "insert into factions (campaign_id, name) values (%s, 'Seed Faction')",
            (SEEDED_CAMPAIGN,),
        )
        cur.execute(
            "select id from factions where campaign_id = %s", (SEEDED_CAMPAIGN,)
        )
        assert cur.fetchall() != []

    with as_user(db_conn, "authenticated", USER_B) as cur:
        cur.execute(
            "select id from factions where campaign_id = %s", (SEEDED_CAMPAIGN,)
        )
        assert cur.fetchall() == []

    with as_user(db_conn, "authenticated", USER_B) as cur:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            cur.execute(
                "insert into factions (campaign_id, name) "
                "values (%s, 'Should not persist')",
                (SEEDED_CAMPAIGN,),
            )

    with as_user(db_conn, "authenticated", USER_B) as cur:
        cur.execute(
            "update factions set name = 'hijacked' where campaign_id = %s returning id",
            (SEEDED_CAMPAIGN,),
        )
        assert cur.fetchall() == []


# --- Memory fact ownership and composite FK checks ---------------------------


def test_user_a_can_crud_own_memory_fact(db_conn) -> None:
    """User A can create, read, and archive memory_facts for their campaign."""
    with as_user(db_conn, "authenticated", USER_A) as cur:
        cur.execute(
            """
            insert into memory_facts (
                campaign_id, content, type, importance, status
            )
            values (
                %s, 'The warehouse fire changed guild politics.',
                'consequence', 'high', 'active'
            )
            returning id
            """,
            (SEEDED_CAMPAIGN,),
        )
        memory_id = cur.fetchone()[0]

        cur.execute("select content from memory_facts where id = %s", (memory_id,))
        assert cur.fetchone()[0] == "The warehouse fire changed guild politics."

        cur.execute(
            """
            update memory_facts
            set status = 'archived'
            where id = %s
            returning status
            """,
            (memory_id,),
        )
        assert cur.fetchone()[0] == "archived"


def test_user_b_cannot_select_insert_or_update_user_a_memory_facts(db_conn) -> None:
    """User B is filtered from A's memories and cannot mutate A's campaign."""
    with as_user(db_conn, "authenticated", USER_B) as cur:
        cur.execute(
            "select id from memory_facts where campaign_id = %s",
            (SEEDED_CAMPAIGN,),
        )
        assert cur.fetchall() == []

    with as_user(db_conn, "authenticated", USER_B) as cur:
        with pytest.raises(psycopg.errors.InsufficientPrivilege):
            cur.execute(
                """
                insert into memory_facts (campaign_id, content, status)
                values (%s, 'Should not persist', 'active')
                """,
                (SEEDED_CAMPAIGN,),
            )

    with as_user(db_conn, "authenticated", USER_B) as cur:
        cur.execute(
            """
            update memory_facts
            set status = 'archived'
            where campaign_id = %s
            returning id
            """,
            (SEEDED_CAMPAIGN,),
        )
        assert cur.fetchall() == []


@contextlib.contextmanager
def as_user_with_cross_campaign_session(
    conn: psycopg.Connection,
) -> Iterator[tuple[Cursor, str]]:
    """Create a temporary second campaign/session before switching to USER_A."""
    other_campaign = "20000000-0000-0000-0000-0000000000b7"
    other_session = "20000000-0000-0000-0000-000000000007"
    with conn.transaction(force_rollback=True):
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into campaigns (id, user_id, title)
                values (%s, %s, 'Temporary other campaign')
                on conflict (id) do nothing
                """,
                (other_campaign, USER_A),
            )
            cur.execute(
                """
                insert into sessions (id, campaign_id, session_number)
                values (%s, %s, 777)
                on conflict (id) do nothing
                """,
                (other_session, other_campaign),
            )
            cur.execute("set local role authenticated")
            claims = f'{{"sub":"{USER_A}"}}'
            cur.execute("select set_config('request.jwt.claims', %s, true)", (claims,))
            yield cur, other_session


def test_memory_fact_rejects_cross_campaign_source_session(db_conn) -> None:
    """The composite FK rejects a source_session_id from another campaign."""
    with as_user_with_cross_campaign_session(db_conn) as (cur, other_session):
        with pytest.raises(psycopg.errors.ForeignKeyViolation):
            cur.execute(
                """
                insert into memory_facts (
                    campaign_id, source_session_id, content, status
                )
                values (%s, %s, 'Cross-campaign session should fail', 'active')
                """,
                (SEEDED_CAMPAIGN, other_session),
            )
