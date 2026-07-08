"""Infrastructure/port errors for session persistence adapters."""


class RepositoryError(Exception):
    """Raised by a SessionRepository implementation on a read/write failure.

    Outside ``domain``: describes adapter/port failure, not an invalid
    domain entity. The application layer translates it into
    ``SessionPersistenceError`` (insert path) or lets it degrade to empty
    (summarize/suggest path).
    """


class SessionNumberConflictError(RepositoryError):
    """Raised when the ``(campaign_id, session_number)`` unique constraint fires.

    A subclass of ``RepositoryError`` so any caller catching the base class
    (e.g. ``RegisterSession``'s existing ``except RepositoryError`` mapping to
    ``SessionPersistenceError``) still works unchanged if a retry loop gives
    up. The repository itself catches this specific error to recompute
    ``MAX(session_number) + 1`` and retry (bounded attempts) before it ever
    reaches the application layer, hardening the read-then-insert race
    between concurrent/retried session registrations for the same campaign.
    """
