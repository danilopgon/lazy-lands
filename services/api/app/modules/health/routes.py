"""Health-check route for liveness probes."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    """Return a static liveness payload."""
    return {"status": "ok", "service": "lazy-lands-api"}
