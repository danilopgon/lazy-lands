"""Application errors for the generation module."""


class GenerationNotFoundError(Exception):
    """Raised when the campaign is unknown or not visible to the caller."""


class GenerationPersistenceError(Exception):
    """Raised when a generated draft cannot be persisted."""

    def __init__(self, retryable: bool = True) -> None:
        """Initialize with a retryability flag for HTTP mapping."""
        self.retryable = retryable
        super().__init__("Generated session persistence failed")
