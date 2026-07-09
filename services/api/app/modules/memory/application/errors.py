"""Application-layer exceptions for the memory module."""


class MemoryFactNotFoundError(Exception):
    """Raised for unknown, forged, or foreign campaigns/memory facts."""


class MemoryFactPersistenceError(Exception):
    """Raised when a memory fact write fails."""

    def __init__(self, retryable: bool = True) -> None:
        """Initialize the error with retryability metadata."""
        self.retryable = retryable
        super().__init__("Memory fact persistence failed")


class MemoryFactValidationError(Exception):
    """Raised when an application-level memory mutation is invalid."""
