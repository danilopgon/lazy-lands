"""Schema verification tests for the initial supabase-setup migration.

Strict-TDD Phase 1 (RED): these tests are written BEFORE the migration file
exists. They MUST fail (or skip when the local stack is down) until
``supabase/migrations/<timestamp>_initial_schema.sql`` is applied by Phase 2.

Connection target: the local Supabase Postgres on port 54322 (the DB port from
``supabase/config.toml``). These are integration tests, not unit tests: a
module-level fixture probes the DSN and ``pytest.skip``s the whole module when
the stack is unreachable so plain ``uv run pytest`` and CI stay green.
"""

from __future__ import annotations

import psycopg
import pytest

# Local Supabase DB DSN (postgres superuser; matches config.toml [db] port).
LOCAL_DB_DSN = "postgresql://postgres:postgres@localhost:54322/postgres"

# The six campaign tables mandated by docs/07-data-security-and-rls.md.
EXPECTED_TABLES = {
    "campaigns",
    "sessions",
    "memory_facts",
    "npcs",
    "factions",
    "arcs",
}

# Authoritative enum values come from docs/03-domain-model.md (domain source of
# truth), NOT the stale table in proposal/design. See the T-06 note in tasks.md.
EXPECTED_ENUMS: dict[str, set[str]] = {
    "content_source": {"llm", "edited", "manual"},
    "arc_status": {"active", "dormant", "resolved", "discarded"},
    "priority": {"high", "medium", "low"},
    "importance": {"high", "medium", "low"},
    "memory_status": {"active", "archived"},
    "session_status": {"draft", "registered"},
}

# Expected column data_types per docs/07. Enum columns are intentionally
# absent here — they carry the enum type (data_type == "USER-DEFINED") and are
# verified separately via EXPECTED_ENUM_COLUMNS (udt_name == enum type).
EXPECTED_COLUMN_TYPES: dict[str, dict[str, str]] = {
    "campaigns": {
        "id": "uuid",
        "user_id": "uuid",
        "title": "text",
        "description": "text",
        "world_state": "text",
        "system": "text",
        "tone": "text",
        "accumulated_summary": "text",
        "summarized_up_to_session": "integer",
        "created_at": "timestamp with time zone",
        "updated_at": "timestamp with time zone",
    },
    "sessions": {
        "id": "uuid",
        "campaign_id": "uuid",
        "session_number": "integer",
        "summary": "text",
        "consequences": "text",
        "generated_content": "jsonb",
        "trace_json": "jsonb",
        "created_at": "timestamp with time zone",
        "updated_at": "timestamp with time zone",
    },
    "memory_facts": {
        "id": "uuid",
        "campaign_id": "uuid",
        "source_session_id": "uuid",
        "content": "text",
        "type": "text",
        "created_at": "timestamp with time zone",
        "updated_at": "timestamp with time zone",
    },
    "npcs": {
        "id": "uuid",
        "campaign_id": "uuid",
        "name": "text",
        "description": "text",
        "current_state": "text",
        "motivation": "text",
        "created_at": "timestamp with time zone",
        "updated_at": "timestamp with time zone",
    },
    "factions": {
        "id": "uuid",
        "campaign_id": "uuid",
        "name": "text",
        "description": "text",
        "current_stance": "text",
        "goals": "text",
        "created_at": "timestamp with time zone",
        "updated_at": "timestamp with time zone",
    },
    "arcs": {
        "id": "uuid",
        "campaign_id": "uuid",
        "title": "text",
        "description": "text",
        "created_at": "timestamp with time zone",
        "updated_at": "timestamp with time zone",
    },
    # NOTE: "arcs" also has an enum-typed "content_source" column (added by the
    # block-5 migration), listed in EXPECTED_ENUM_COLUMNS below, not here — enum
    # columns are verified separately (data_type == "USER-DEFINED").
}

# Enum-typed columns: (table, column) -> enum type name (udt_name in pg_catalog).
# Matches the migration ordering: enums declared first, then columns reference them.
EXPECTED_ENUM_COLUMNS: dict[tuple[str, str], str] = {
    ("npcs", "content_source"): "content_source",
    ("factions", "content_source"): "content_source",
    ("arcs", "status"): "arc_status",
    ("arcs", "priority"): "priority",
    ("arcs", "content_source"): "content_source",
    ("memory_facts", "importance"): "importance",
    ("memory_facts", "status"): "memory_status",
    ("sessions", "status"): "session_status",
}

# ALL expected single-column FK constraints with ON DELETE CASCADE.
# (child_table, child_column) -> (parent_schema, parent_table, parent_column)
EXPECTED_CASCADE_FKS: dict[tuple[str, str], tuple[str, str, str]] = {
    ("campaigns", "user_id"): ("auth", "users", "id"),
    ("sessions", "campaign_id"): ("public", "campaigns", "id"),
    ("npcs", "campaign_id"): ("public", "campaigns", "id"),
    ("factions", "campaign_id"): ("public", "campaigns", "id"),
    ("arcs", "campaign_id"): ("public", "campaigns", "id"),
    ("memory_facts", "campaign_id"): ("public", "campaigns", "id"),
}

# Composite tenant-scoped FK for memory_facts.source_session_id.
EXPECTED_COMPOSITE_CASCADE_FKS: dict[
    tuple[str, tuple[str, ...]], tuple[str, tuple[str, ...]]
] = {
    ("memory_facts", ("campaign_id", "source_session_id")): (
        "sessions",
        ("campaign_id", "id"),
    ),
}

TEST_AUTH_USER_ID = "00000000-0000-0000-0000-00000000f001"


@pytest.fixture(scope="module")
def db_conn():
    """Connect to the local Supabase Postgres; skip the module if it is down.

    Integration guard: these tests require ``pnpm supabase start`` to be
    running. A plain ``uv run pytest`` (no Docker/stack) must stay green.
    """
    try:
        conn = psycopg.connect(LOCAL_DB_DSN, connect_timeout=2)
    except psycopg.OperationalError:
        pytest.skip("Local Supabase stack not running on :54322")
    yield conn
    conn.close()


def test_all_expected_tables_exist(db_conn) -> None:
    """All six campaign tables MUST exist in the public schema."""
    with db_conn.cursor() as cur:
        cur.execute(
            "select table_name from information_schema.tables "
            "where table_schema = 'public'"
        )
        present = {row[0] for row in cur.fetchall()}
    assert present >= EXPECTED_TABLES, f"missing tables: {EXPECTED_TABLES - present}"


@pytest.mark.parametrize(("enum_name", "expected_values"), list(EXPECTED_ENUMS.items()))
def test_enum_has_expected_values(
    db_conn, enum_name: str, expected_values: set[str]
) -> None:
    """Each enum type MUST exist with the exact member values."""
    with db_conn.cursor() as cur:
        cur.execute(
            "select e.enumlabel from pg_type t "
            "join pg_enum e on e.enumtypid = t.oid "
            "where t.typname = %s",
            (enum_name,),
        )
        labels = {row[0] for row in cur.fetchall()}
    assert labels == expected_values, (
        f"enum {enum_name}: expected {expected_values}, got {labels}"
    )


@pytest.mark.parametrize("table_name", sorted(EXPECTED_COLUMN_TYPES))
def test_table_columns_match_docs07(db_conn, table_name: str) -> None:
    """Every table MUST have exactly the columns + types from docs/07."""
    with db_conn.cursor() as cur:
        cur.execute(
            "select column_name, data_type, udt_name, is_nullable "
            "from information_schema.columns "
            "where table_schema = 'public' and table_name = %s",
            (table_name,),
        )
        rows = {r[0]: (r[1], r[2], r[3]) for r in cur.fetchall()}

    expected_types = EXPECTED_COLUMN_TYPES[table_name]
    # Union in the enum columns so the counts match docs/07 exactly.
    enum_columns = {col for (tbl, col) in EXPECTED_ENUM_COLUMNS if tbl == table_name}
    expected_columns = set(expected_types) | enum_columns

    assert set(rows) == expected_columns, (
        f"{table_name}: missing {expected_columns - set(rows)}, "
        f"extra {set(rows) - expected_columns}"
    )

    # Verify built-in column data_types.
    for col, dtype in expected_types.items():
        actual_dtype, _actual_udt, _nullable = rows[col]
        assert actual_dtype == dtype, (
            f"{table_name}.{col}: expected {dtype}, got {actual_dtype}"
        )

    # Verify enum columns are typed as their enum (USER-DEFINED + udt_name).
    for col in enum_columns:
        actual_dtype, actual_udt, _nullable = rows[col]
        expected_enum = EXPECTED_ENUM_COLUMNS[(table_name, col)]
        assert actual_dtype == "USER-DEFINED", (
            f"{table_name}.{col}: expected enum column, got {actual_dtype}"
        )
        assert actual_udt == expected_enum, (
            f"{table_name}.{col}: expected udt_name {expected_enum}, got {actual_udt}"
        )


@pytest.mark.parametrize("table_name", sorted(EXPECTED_TABLES))
def test_uuid_primary_key_defaults_to_gen_random_uuid(db_conn, table_name: str) -> None:
    """Every table MUST have ``id uuid PRIMARY KEY DEFAULT gen_random_uuid()``."""
    with db_conn.cursor() as cur:
        cur.execute(
            "select column_default from information_schema.columns "
            "where table_schema = 'public' and table_name = %s "
            "and column_name = 'id'",
            (table_name,),
        )
        row = cur.fetchone()
    assert row is not None, f"{table_name}.id column missing"
    default = row[0] or ""
    assert "gen_random_uuid" in default, (
        f"{table_name}.id default should call gen_random_uuid(), got {default!r}"
    )


@pytest.mark.parametrize("table_name", sorted(EXPECTED_TABLES))
def test_timestamps_not_null_default_now(db_conn, table_name: str) -> None:
    """``created_at``/``updated_at`` MUST be NOT NULL with ``now()`` default."""
    with db_conn.cursor() as cur:
        cur.execute(
            "select column_name, is_nullable, column_default "
            "from information_schema.columns "
            "where table_schema = 'public' and table_name = %s "
            "and column_name in ('created_at', 'updated_at')",
            (table_name,),
        )
        rows = {r[0]: (r[1], r[2]) for r in cur.fetchall()}
    for col in ("created_at", "updated_at"):
        assert col in rows, f"{table_name}.{col} missing"
        nullable, default = rows[col]
        assert nullable == "NO", f"{table_name}.{col} must be NOT NULL"
        assert default is not None, (
            f"{table_name}.{col} default must be now(), got {default!r}"
        )
        assert "now()" in default, (
            f"{table_name}.{col} default must be now(), got {default!r}"
        )


def test_cascade_foreign_keys_exist(db_conn) -> None:
    """All single-column ownership FKs MUST exist with ON DELETE CASCADE."""
    with db_conn.cursor() as cur:
        cur.execute(
            """
            select
                cl.relname            as child_table,
                att.attname           as child_column,
                ref_ns.nspname        as parent_schema,
                ref.relname           as parent_table,
                ref_att.attname       as parent_column,
                con.confdeltype
            from pg_constraint con
            join pg_class cl        on con.conrelid    = cl.oid
            join pg_namespace cl_ns on cl.relnamespace = cl_ns.oid
            join pg_class ref       on con.confrelid   = ref.oid
            join pg_namespace ref_ns on ref.relnamespace = ref_ns.oid
            join pg_attribute att   on att.attrelid    = cl.oid
                                    and att.attnum = con.conkey[1]
            join pg_attribute ref_att on ref_att.attrelid = ref.oid
                                    and ref_att.attnum = con.confkey[1]
            where con.contype = 'f'
              and cl_ns.nspname = 'public'
              and array_length(con.conkey, 1) = 1
            """
        )
        fks = {(r[0], r[1]): (r[2], r[3], r[4], r[5]) for r in cur.fetchall()}

    for (child_tbl, child_col), (
        parent_schema,
        parent_tbl,
        parent_col,
    ) in EXPECTED_CASCADE_FKS.items():
        key = (child_tbl, child_col)
        assert key in fks, (
            f"missing FK on {child_tbl}.{child_col} -> {parent_tbl}.{parent_col}"
        )
        actual_parent_schema, actual_parent, actual_parent_col, del_type = fks[key]
        assert (actual_parent_schema, actual_parent, actual_parent_col) == (
            parent_schema,
            parent_tbl,
            parent_col,
        ), (
            f"{child_tbl}.{child_col} references "
            f"{actual_parent_schema}.{actual_parent}.{actual_parent_col}, expected "
            f"{parent_schema}.{parent_tbl}.{parent_col}"
        )
        # confdeltype 'c' == ON DELETE CASCADE.
        assert del_type == "c", (
            f"{child_tbl}.{child_col} FK is not ON DELETE CASCADE "
            f"(confdeltype={del_type!r})"
        )


def test_memory_facts_source_session_fk_is_campaign_scoped(db_conn) -> None:
    """``source_session_id`` MUST reference a session within the same campaign."""
    with db_conn.cursor() as cur:
        cur.execute(
            """
            select
                child.relname as child_table,
                array_agg(child_att.attname order by ordinality) as child_columns,
                parent.relname as parent_table,
                array_agg(parent_att.attname order by ordinality) as parent_columns,
                con.confdeltype
            from pg_constraint con
            join pg_class child on child.oid = con.conrelid
            join pg_namespace child_ns on child_ns.oid = child.relnamespace
            join pg_class parent on parent.oid = con.confrelid
            cross join unnest(con.conkey, con.confkey) with ordinality
                as keys(child_attnum, parent_attnum, ordinality)
            join pg_attribute child_att on child_att.attrelid = child.oid
                and child_att.attnum = keys.child_attnum
            join pg_attribute parent_att on parent_att.attrelid = parent.oid
                and parent_att.attnum = keys.parent_attnum
            where con.contype = 'f'
              and child_ns.nspname = 'public'
              and child.relname = 'memory_facts'
              and parent.relname = 'sessions'
            group by child.relname, parent.relname, con.confdeltype
            """
        )
        fks = {
            (row[0], tuple(row[1])): (row[2], tuple(row[3]), row[4])
            for row in cur.fetchall()
        }

    for (child_tbl, child_cols), (
        parent_tbl,
        parent_cols,
    ) in EXPECTED_COMPOSITE_CASCADE_FKS.items():
        key = (child_tbl, child_cols)
        assert key in fks, (
            f"missing composite FK on {child_tbl}.{child_cols} -> "
            f"{parent_tbl}.{parent_cols}"
        )
        actual_parent, actual_parent_cols, del_type = fks[key]
        assert (actual_parent, actual_parent_cols) == (parent_tbl, parent_cols)
        assert del_type == "c"


def test_memory_fact_cannot_reference_session_from_another_campaign(db_conn) -> None:
    """Tenant boundary is enforced by the composite source-session FK."""
    campaign_a = "10000000-0000-0000-0000-00000000aaa1"
    campaign_b = "10000000-0000-0000-0000-00000000bbb1"
    session_b = "20000000-0000-0000-0000-00000000bbb1"

    with db_conn.transaction(force_rollback=True), db_conn.cursor() as cur:
        cur.execute(
            """
                insert into auth.users (
                    id,
                    aud,
                    role,
                    email,
                    encrypted_password,
                    email_confirmed_at,
                    raw_app_meta_data,
                    raw_user_meta_data,
                    created_at,
                    updated_at
                )
                values (
                    %s,
                    'authenticated',
                    'authenticated',
                    'schema-fk-test@lazylands.test',
                    '',
                    now(),
                    '{"provider":"email","providers":["email"]}'::jsonb,
                    '{}'::jsonb,
                    now(),
                    now()
                )
                on conflict (id) do nothing
                """,
            (TEST_AUTH_USER_ID,),
        )
        cur.execute(
            "insert into campaigns (id, user_id, title) values (%s, %s, %s)",
            (campaign_a, TEST_AUTH_USER_ID, "Campaign A"),
        )
        cur.execute(
            "insert into campaigns (id, user_id, title) values (%s, %s, %s)",
            (campaign_b, TEST_AUTH_USER_ID, "Campaign B"),
        )
        cur.execute(
            "insert into sessions (id, campaign_id, session_number) values (%s, %s, 1)",
            (session_b, campaign_b),
        )

        with pytest.raises(psycopg.errors.ForeignKeyViolation):
            cur.execute(
                "insert into memory_facts "
                "(campaign_id, source_session_id, content) values (%s, %s, %s)",
                (campaign_a, session_b, "Cross-campaign fact"),
            )


@pytest.mark.parametrize("table_name", sorted(EXPECTED_TABLES))
def test_rls_enabled_on_table(db_conn, table_name: str) -> None:
    """``pg_class.relrowsecurity`` MUST be true for every campaign table."""
    with db_conn.cursor() as cur:
        cur.execute(
            "select relrowsecurity from pg_class "
            "where relname = %s and relnamespace = 'public'::regnamespace",
            (table_name,),
        )
        row = cur.fetchone()
    assert row is not None, f"{table_name} not found in pg_class"
    assert row[0] is True, f"{table_name} does not have RLS enabled"


def test_exactly_24_rls_policies_exist(db_conn) -> None:
    """Exactly 24 RLS policies (SELECT/INSERT/UPDATE/DELETE × 6 tables)."""
    with db_conn.cursor() as cur:
        cur.execute("select count(*) from pg_policies where schemaname = 'public'")
        count = cur.fetchone()[0]
    assert count == 24, f"expected 24 RLS policies, found {count}"
