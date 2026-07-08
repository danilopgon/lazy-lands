"""Infrastructure/port errors for session persistence adapters."""


class RepositoryError(Exception):
    """Raised by a SessionRepository implementation on a read/write failure.

    Outside ``domain``: describes adapter/port failure, not an invalid
    domain entity. The application layer translates it into
    ``SessionPersistenceError`` (insert path) or lets it degrade to empty
    (summarize/suggest path).
    """
