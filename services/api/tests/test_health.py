from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint_identifies_service() -> None:
    client = TestClient(app)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "lazy-lands-api"}
