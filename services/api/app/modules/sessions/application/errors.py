"""Application-layer exceptions for the sessions module.

Raised by queries/commands, not by ``domain`` (no domain-invariant violation
is involved) and not by ``api`` (HTTP mapping is a presentation concern —
see ``api/exception_handlers.py``).
"""


class SessionNotFoundError(Exception):
    """Raised when a targeted campaign returns no rows under caller-scoped RLS.

    Covers both a forged/foreign ``campaign_id`` and an unknown id — mapped
    to a uniform 404, never 403/500 (session-registration spec).
    """


class SessionPersistenceError(Exception):
    """Raised when the session insert itself fails (before any LLM step).

    Only an insert failure surfaces an error to the client (persistence-first
    ordering, design Decision 4) — downstream summarize/suggest failures
    degrade to empty instead of raising this.
    """

    def __init__(self, retryable: bool = True) -> None:
        """Initialize with a retry flag; no row was written on this failure."""
        self.retryable = retryable
        super().__init__("Session persistence failed")


class SessionAlreadyRegisteredError(Exception):
    """Raised when completing a session whose ``status`` is already 'registered'.

    A second complete on the same row is always a bug: it would overwrite the
    played account the DM already recorded. Editing an already-registered
    session is what ``PATCH /sessions/{id}`` is for, so this is NOT retryable —
    replaying the same request can never succeed.

    Defense in depth: this holds even when the frontend's draft predicate is
    wrong, which is the entire point of storing ``status`` explicitly.
    """


class SessionValidationError(Exception):
    """Raised when a direct session application command violates its contract."""


class ExportSelectionError(SessionValidationError):
    """Raised when selected export section IDs are empty, repeated, or unknown."""


class NonExportableSessionError(Exception):
    """Raised when an owned session has no valid persisted export snapshot."""
