"""Transport-level security and safe error-reporting guarantees."""

import logging
import re
from collections.abc import Iterator
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from app.main import add_request_context, app, logger
from app.shared.config import settings
from app.shared.errors import AppError

_BOOM_PATH = "/_test_sensitive_boom"
_APP_ERROR_PATH = "/_test_sensitive_app_error"
_SECURITY_HEADERS = {
    "content-security-policy": (
        "default-src 'none'; base-uri 'none'; form-action 'none'; "
        "frame-ancestors 'none'; object-src 'none'"
    ),
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), geolocation=(), microphone=()",
}


@pytest.fixture
def client_with_sensitive_boom() -> Iterator[TestClient]:
    """Expose a temporary route whose exception contains sensitive sentinels."""

    async def boom() -> None:
        raise RuntimeError("upstream-token campaign-content complete-prompt")

    async def app_error() -> None:
        raise AppError("campaign-content")

    app.add_api_route(_BOOM_PATH, boom, methods=["GET"])
    app.add_api_route(_APP_ERROR_PATH, app_error, methods=["GET"])
    try:
        yield TestClient(app, raise_server_exceptions=False)
    finally:
        app.router.routes = [
            route
            for route in app.router.routes
            if getattr(route, "path", None) not in {_BOOM_PATH, _APP_ERROR_PATH}
        ]


def test_api_response_sets_security_headers_and_request_id(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO)
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    for name, value in _SECURITY_HEADERS.items():
        assert response.headers[name] == value
    request_id = response.headers["x-request-id"]
    assert re.fullmatch(r"[0-9a-f]{32}", request_id)
    assert request_id in caplog.text
    assert "strict-transport-security" not in response.headers


def test_request_completion_log_is_safe_info_event(
    caplog: pytest.LogCaptureFixture,
) -> None:
    assert logger.getEffectiveLevel() == logging.INFO
    assert logger.getEffectiveLevel() > logging.DEBUG

    caplog.set_level(logging.INFO, logger=logger.name)
    response = TestClient(app).get(
        "/health", headers={"Authorization": "Bearer request-token"}
    )

    request_id = response.headers["x-request-id"]
    assert any(
        record.levelno == logging.INFO
        and record.getMessage()
        == (
            "Request complete "
            f"request_id={request_id} method=GET path=/health status_code=200"
        )
        for record in caplog.records
    )
    assert "request-token" not in caplog.text


@pytest.mark.asyncio
async def test_request_completion_log_removes_crlf_from_path(
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.INFO, logger=logger.name)

    async def call_next(_request: object) -> JSONResponse:
        return JSONResponse(content={})

    request = SimpleNamespace(
        state=SimpleNamespace(),
        method="GET",
        url=SimpleNamespace(path="/health\r\nforged-log-entry"),
    )
    response = await add_request_context(request, call_next)

    assert response.status_code == 200
    completion_logs = [
        record.getMessage()
        for record in caplog.records
        if record.getMessage().startswith("Request complete ")
    ]
    assert len(completion_logs) == 1
    assert "\r" not in completion_logs[0]
    assert "\n" not in completion_logs[0]
    assert "path=/healthforged-log-entry" in completion_logs[0]


def test_api_preflight_keeps_cors_and_security_headers() -> None:
    origin = settings.api_cors_origins[0]
    response = TestClient(app).options(
        "/health",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert response.headers["x-request-id"]
    assert response.headers["x-frame-options"] == "DENY"


def test_api_documentation_routes_are_disabled() -> None:
    client = TestClient(app)

    for path in ("/docs", "/redoc", "/openapi.json"):
        assert client.get(path).status_code == 404


def test_dependency_audit_uses_the_locked_service_dependencies() -> None:
    workflow = (
        Path(__file__).resolve().parents[3] / ".github" / "workflows" / "ci.yml"
    ).read_text(encoding="utf-8")

    requirements_path = "$RUNNER_TEMP/lazy-lands-api-requirements.txt"
    assert (
        "uv export --locked --format requirements-txt "
        f'--output-file "{requirements_path}"'
    ) in workflow
    assert f'pip-audit --requirement "{requirements_path}" --strict' in workflow
    assert "pip-audit --local" not in workflow
    assert (
        "- name: Dependency audit\n"
        "        continue-on-error: true\n"
        "        working-directory: services/api"
    ) in workflow


def test_unhandled_error_is_sanitized_and_correlatable(
    client_with_sensitive_boom: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    response = client_with_sensitive_boom.get(
        _BOOM_PATH,
        headers={"Authorization": "Bearer request-token"},
    )

    assert response.status_code == 500
    assert response.json() == {"error": "Internal server error."}
    request_id = response.headers["x-request-id"]
    assert re.fullmatch(r"[0-9a-f]{32}", request_id)
    assert request_id in caplog.text
    assert "exception_type=RuntimeError" in caplog.text
    assert "exception_location=" in caplog.text
    for sensitive_value in (
        "request-token",
        "upstream-token",
        "campaign-content",
        "complete-prompt",
    ):
        assert sensitive_value not in response.text
        assert sensitive_value not in caplog.text


def test_app_error_does_not_expose_exception_message(
    client_with_sensitive_boom: TestClient,
) -> None:
    response = client_with_sensitive_boom.get(_APP_ERROR_PATH)

    assert response.status_code == 400
    assert response.json() == {"error": "The request could not be completed."}
    assert "campaign-content" not in response.text
