"""LLM-specific error types for structured validation failures.

LlmOutputValidationError carries enough context for callers to decide
whether to retry, log, or surface to the frontend.
"""


class LlmOutputValidationError(Exception):
    """Raised when an LLM output fails Pydantic validation or JSON parsing.

    Attributes:
        schema_name: Name of the Pydantic model that validation failed for.
        raw_output: The raw LLM output string that caused the failure
            (for logging only — never persisted per docs/05 production rule).
        retryable: Whether the caller may retry the LLM call with the same prompt.
            Defaults to True (per docs/05 "JSON validation" section).
    """

    def __init__(
        self,
        schema_name: str,
        raw_output: str,
        retryable: bool = True,
    ) -> None:
        """Initialize with failed schema name, raw output, and retry flag."""
        self.schema_name = schema_name
        self.raw_output = raw_output
        self.retryable = retryable
        super().__init__(
            f"LLM output validation failed for schema '{schema_name}'. "
            f"Retryable: {retryable}"
        )
