"""Campaign HTTP response DTOs.

``CampaignSummary`` and ``CampaignDetailResponse`` (the read models returned
by the query handlers) live in ``application/read_models/`` — they are owned
by the application layer, not the HTTP boundary. ``CreateCampaignResponse``
stays here: it is a pure presentation concern (wrapping the command's raw
``str`` campaign id into a JSON ``{"id": ...}`` body) with no application-side
consumer.
"""

from pydantic import BaseModel


class CreateCampaignResponse(BaseModel):
    """``POST /campaigns`` success response body."""

    id: str
