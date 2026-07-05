"""Application-layer exceptions for the campaigns module.

Raised by queries/commands, not by ``domain`` (no domain-invariant violation
is involved — these describe application-level outcomes: an RLS miss, or a
persistence failure translated from ``infrastructure.errors.RepositoryError``)
and not by ``api`` (HTTP mapping is a presentation concern — see
``api/exception_handlers.py``).
"""


class CampaignPersistenceError(Exception):
    """Raised when the create-campaign use case cannot fully persist a campaign.

    Attributes:
        retryable: Whether the frontend may retry with the same reviewed
            payload. Always True today (design Decision 5).
        orphaned_campaign_id: Set only when the compensating delete itself
            failed — surfaced so it can be manually cleaned up.
    """

    def __init__(
        self,
        retryable: bool = True,
        orphaned_campaign_id: str | None = None,
    ) -> None:
        """Initialize with retry flag and optional orphaned campaign id."""
        self.retryable = retryable
        self.orphaned_campaign_id = orphaned_campaign_id
        super().__init__("Campaign persistence failed")


class CampaignNotFoundError(Exception):
    """Raised when a targeted resource returns no rows under caller-scoped RLS."""
