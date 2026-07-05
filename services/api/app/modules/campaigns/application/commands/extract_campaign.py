"""ExtractCampaign use case — renders the extraction prompt and calls the LLM seam.

LLM-only; no database access (statelessness is enforced by simply never
importing a repository here — see campaign-extraction spec, CE-006).
"""

from app.modules.campaigns.application.contracts import ExtractCampaignOutput
from app.shared.llm.port import LlmProvider
from app.shared.prompts import render_prompt


class ExtractCampaign:
    """Extracts a structured campaign scaffold from a DM's free-text premise."""

    def __init__(self, llm_provider: LlmProvider) -> None:
        """Initialize with the LLM provider to call."""
        self._llm_provider = llm_provider

    async def execute(self, raw_text: str) -> ExtractCampaignOutput:
        """Render the versioned prompt and validate the LLM's JSON output.

        Args:
            raw_text: The DM's free-text campaign premise (100-8000 chars,
                enforced by ``ExtractRequest`` at the route boundary).

        Returns:
            A validated ``ExtractCampaignOutput``.

        Raises:
            LlmOutputValidationError: If the LLM's output fails
                ``parse_llm_json`` validation (propagates unchanged — the
                route/error-handler layer maps it to a retryable HTTP error).
        """
        prompt = render_prompt("extract_campaign_v1.jinja", raw_text=raw_text)
        return await self._llm_provider.complete_json(prompt, ExtractCampaignOutput)
