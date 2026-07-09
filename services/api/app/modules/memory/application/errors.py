"""Application-layer exceptions for the memory module."""


class MemoryFactNotFoundError(Exception):
    """Raised for unknown, forged, or foreign campaigns/memory facts."""


class CampaignNotFoundError(Exception):
    """Raised when a memory command references an unknown or foreign campaign."""


class MemoryFactPersistenceError(Exception):
    """Raised when a memory fact write fails."""

    def __init__(self, retryable: bool = True) -> None:
        """Initialize the error with retryability metadata."""
        self.retryable = retryable
        super().__init__("Memory fact persistence failed")


class MemoryFactValidationError(Exception):
    """Raised when an application-level memory mutation is invalid."""

    def __init__(self, message: str = "At least one field must be provided.") -> None:
        """Initialize the validation error with its client-safe message."""
        self.message = message
        super().__init__(message)
