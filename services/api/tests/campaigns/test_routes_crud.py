"""Route tests for the WU3 CRUD endpoints: PATCH /campaigns/{id} and
POST/PATCH/DELETE on /npcs, /factions, /arcs (entity-management spec).

Uses a mocked Supabase client (faked PostgREST chain) via dependency
overrides, matching test_routes_create.py — the RLS/ownership behaviour these
map is exercised end to end against a real client in test_ownership.py.
"""

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.shared.database import get_user_supabase_client
from app.shared.security import AuthContext, get_auth_context

CAMPAIGN_ID = "11111111-1111-1111-1111-111111111111"


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def _auth_and_cleanup():
    app.dependency_overrides[get_auth_context] = lambda: AuthContext(
        user_id="user-1", access_token="token-1"
    )
    yield
    app.dependency_overrides.clear()


def _mock_client(
    *,
    select_data: list | None = None,
    write_data: list | None = None,
) -> MagicMock:
    """A mock client whose SELECT (.eq.execute) and write (.execute) chains
    return the given rows. `select_data` feeds get_campaign (the create
    pre-check); `write_data` feeds insert/update/delete `.execute().data`."""
    client = MagicMock()
    table = client.table.return_value
    select_result = MagicMock(data=select_data if select_data is not None else [])
    write_result = MagicMock(data=write_data if write_data is not None else [])
    # get_campaign pre-check: .select().eq().execute()
    table.select.return_value.eq.return_value.execute.return_value = select_result
    # writes: insert().execute(), update().eq().execute(), delete().eq().execute()
    table.insert.return_value.execute.return_value = write_result
    table.update.return_value.eq.return_value.execute.return_value = write_result
    table.delete.return_value.eq.return_value.execute.return_value = write_result
    return client


def _use(client: MagicMock) -> None:
    app.dependency_overrides[get_user_supabase_client] = lambda: client


# ── PATCH /campaigns/{id} ────────────────────────────────────────────────


def test_patch_campaign_returns_updated_row(client) -> None:
    _use(
        _mock_client(
            write_data=[{"id": CAMPAIGN_ID, "title": "T", "world_state": "new"}]
        )
    )
    response = client.patch(f"/campaigns/{CAMPAIGN_ID}", json={"world_state": "new"})
    assert response.status_code == 200
    assert response.json()["world_state"] == "new"


def test_patch_campaign_empty_body_returns_422(client) -> None:
    _use(_mock_client())
    response = client.patch(f"/campaigns/{CAMPAIGN_ID}", json={})
    assert response.status_code == 422


def test_patch_campaign_rls_miss_returns_404(client) -> None:
    _use(_mock_client(write_data=[]))
    response = client.patch(f"/campaigns/{CAMPAIGN_ID}", json={"world_state": "new"})
    assert response.status_code == 404


# ── /npcs, /factions, /arcs share the same shape ─────────────────────────

ENTITIES = [
    (
        "/npcs",
        {"campaign_id": CAMPAIGN_ID, "name": "Sildar"},
        {"name": "Sildar the Bold"},
        {"id": "npc-1", "name": "Sildar"},
    ),
    (
        "/factions",
        {"campaign_id": CAMPAIGN_ID, "name": "Alliance"},
        {"name": "The Alliance"},
        {"id": "fac-1", "name": "Alliance"},
    ),
    (
        "/arcs",
        {"campaign_id": CAMPAIGN_ID, "title": "The Pact"},
        {"title": "The Broken Pact"},
        {"id": "arc-1", "title": "The Pact"},
    ),
]


@pytest.mark.parametrize("prefix,create_body,_patch,row", ENTITIES)
def test_create_entity_returns_201_when_parent_visible(
    client, prefix, create_body, _patch, row
) -> None:
    _use(_mock_client(select_data=[{"id": CAMPAIGN_ID}], write_data=[row]))
    response = client.post(prefix, json=create_body)
    assert response.status_code == 201
    assert response.json()["id"] == row["id"]


@pytest.mark.parametrize("prefix,create_body,_patch,row", ENTITIES)
def test_create_entity_forged_parent_returns_404_via_precheck(
    client, prefix, create_body, _patch, row
) -> None:
    # get_campaign pre-check sees no visible parent -> 404, not a 500 from the
    # INSERT `with check` 42501 (design 6.4).
    _use(_mock_client(select_data=[], write_data=[row]))
    response = client.post(prefix, json=create_body)
    assert response.status_code == 404


@pytest.mark.parametrize("prefix,_create,patch_body,row", ENTITIES)
def test_patch_entity_returns_200(client, prefix, _create, patch_body, row) -> None:
    _use(_mock_client(write_data=[row]))
    response = client.patch(f"{prefix}/{row['id']}", json=patch_body)
    assert response.status_code == 200


@pytest.mark.parametrize("prefix,_create,_patch,row", ENTITIES)
def test_patch_entity_empty_body_returns_422(
    client, prefix, _create, _patch, row
) -> None:
    _use(_mock_client())
    response = client.patch(f"{prefix}/{row['id']}", json={})
    assert response.status_code == 422


@pytest.mark.parametrize("prefix,_create,patch_body,row", ENTITIES)
def test_patch_entity_rls_miss_returns_404(
    client, prefix, _create, patch_body, row
) -> None:
    _use(_mock_client(write_data=[]))
    response = client.patch(f"{prefix}/{row['id']}", json=patch_body)
    assert response.status_code == 404


@pytest.mark.parametrize("prefix,_create,_patch,row", ENTITIES)
def test_delete_entity_returns_204(client, prefix, _create, _patch, row) -> None:
    _use(_mock_client(write_data=[row]))
    response = client.delete(f"{prefix}/{row['id']}")
    assert response.status_code == 204


@pytest.mark.parametrize("prefix,_create,_patch,row", ENTITIES)
def test_delete_entity_rls_miss_returns_404(
    client, prefix, _create, _patch, row
) -> None:
    _use(_mock_client(write_data=[]))
    response = client.delete(f"{prefix}/{row['id']}")
    assert response.status_code == 404


@pytest.mark.parametrize(
    "prefix,field",
    [("/npcs", "name"), ("/factions", "name"), ("/arcs", "title")],
)
def test_patch_entity_null_required_field_returns_422(client, prefix, field) -> None:
    # name/title map to NOT NULL columns; an explicit null must be a 422, not a
    # 500 from a DB constraint violation (design 6.4 / uniform error contract).
    _use(_mock_client())
    response = client.patch(f"{prefix}/some-id", json={field: None})
    assert response.status_code == 422


@pytest.mark.parametrize("field", ["status", "priority"])
def test_patch_arc_null_status_or_priority_returns_422(client, field) -> None:
    # An arc must keep a lifecycle state; nulling status/priority is a 422, not
    # a silent invalid arc (the DB columns are nullable, so the use case guards).
    _use(_mock_client())
    response = client.patch("/arcs/some-id", json={field: None})
    assert response.status_code == 422


@pytest.mark.parametrize(
    "prefix,body,row",
    [
        ("/npcs", {"name": "New"}, {"id": "npc-1", "name": "New"}),
        ("/factions", {"name": "New"}, {"id": "fac-1", "name": "New"}),
        ("/arcs", {"title": "New"}, {"id": "arc-1", "title": "New"}),
    ],
)
def test_patch_entity_stamps_content_source_edited(client, prefix, body, row) -> None:
    # A DM edit flips provenance to "edited" so the UI badge shows ✎, not ✦.
    mock = _mock_client(write_data=[row])
    _use(mock)
    client.patch(f"{prefix}/{row['id']}", json=body)
    changes = mock.table.return_value.update.call_args[0][0]
    assert changes["content_source"] == "edited"


def test_create_npc_unauthenticated_returns_401() -> None:
    app.dependency_overrides.clear()
    local_client = TestClient(app)
    response = local_client.post(
        "/npcs", json={"campaign_id": CAMPAIGN_ID, "name": "X"}
    )
    assert response.status_code == 401
