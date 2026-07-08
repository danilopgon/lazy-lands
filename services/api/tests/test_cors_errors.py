"""Unhandled 500s must still carry CORS headers.

Starlette runs the catch-all `Exception` handler in ServerErrorMiddleware, the
outermost layer, so its response never passes back through CORSMiddleware. The
handler must therefore set the CORS headers itself; otherwise a browser sees an
opaque CORS failure that masks the real 500 (and blocks the error body).
"""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.shared.config import settings

_BOOM_PATH = "/_test_boom"


@pytest.fixture
def client_with_boom() -> Iterator[TestClient]:
    """Register a route that raises, yield a client, then remove the route."""

    async def boom() -> None:
        raise RuntimeError("boom")

    app.add_api_route(_BOOM_PATH, boom, methods=["GET"])
    try:
        yield TestClient(app, raise_server_exceptions=False)
    finally:
        app.router.routes = [
            route
            for route in app.router.routes
            if getattr(route, "path", None) != _BOOM_PATH
        ]


def test_unhandled_500_reflects_allowed_origin(
    client_with_boom: TestClient,
) -> None:
    origin = settings.api_cors_origins[0]

    response = client_with_boom.get(_BOOM_PATH, headers={"Origin": origin})

    assert response.status_code == 500
    assert response.headers["access-control-allow-origin"] == origin
    assert response.headers["access-control-allow-credentials"] == "true"


def test_unhandled_500_omits_cors_for_unknown_origin(
    client_with_boom: TestClient,
) -> None:
    response = client_with_boom.get(
        _BOOM_PATH, headers={"Origin": "https://evil.example.com"}
    )

    assert response.status_code == 500
    assert "access-control-allow-origin" not in response.headers


def test_unhandled_500_without_origin_has_no_cors(
    client_with_boom: TestClient,
) -> None:
    response = client_with_boom.get(_BOOM_PATH)

    assert response.status_code == 500
    assert "access-control-allow-origin" not in response.headers
