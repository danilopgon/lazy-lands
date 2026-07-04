"""Infrastructure/port errors for campaign persistence adapters."""


class RepositoryError(Exception):
    """Raised by a CampaignRepository implementation on a write failure.

    This is intentionally outside ``domain``: it describes adapter/port
    persistence failure, not an invalid domain entity or invariant. The
    application layer translates it into ``CampaignPersistenceError`` for HTTP.
    """
