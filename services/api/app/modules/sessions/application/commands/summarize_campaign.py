"""SummarizeCampaign use case — folds new sessions into the rolling summary.

Renders the versioned prompt with the delta since ``summarized_up_to_session``
(self-healing: any previously skipped/failed sessions are included alongside
the newest one, design Decision 4), validates via ``complete_json`` +
``CampaignSummaryOutput`` (ADR-09), and updates the campaign at the
repository boundary. ``summarized_up_to_session`` is always set app-side to
the newest included session number — never LLM-emitted.
"""

from starlette.concurrency import run_in_threadpool

from app.modules.sessions.application.contracts import CampaignSummaryOutput
from app.modules.sessions.domain.ports import SessionRepository
from app.shared.llm.port import LlmProvider
from app.shared.prompts import render_prompt


class SummarizeCampaign:
    """Updates a campaign's ``accumulated_summary``/``summarized_up_to_session``."""

    def __init__(
        self, llm_provider: LlmProvider, repository: SessionRepository
    ) -> None:
        """Initialize with the LLM provider and the SessionRepository."""
        self._llm_provider = llm_provider
        self._repository = repository

    async def execute(self, campaign: dict, session: dict) -> None:
        """Fold the delta of unsummarized sessions into the campaign summary.

        Args:
            campaign: The campaign row (must include ``id``,
                ``accumulated_summary``, ``summarized_up_to_session``).
            session: The just-persisted session row (used only to log/trace;
                the actual delta is re-fetched to include any previously
                skipped sessions).

        Raises:
            LlmOutputValidationError: If the LLM's output fails validation
                (propagates so the caller can degrade-to-empty, per
                RegisterSession's persistence-first ordering).
        """
        _ = session
        summarized_up_to = campaign.get("summarized_up_to_session") or 0
        delta_sessions = await run_in_threadpool(
            self._repository.get_sessions_since, campaign["id"], summarized_up_to
        )
        if not delta_sessions:
            return

        prompt = render_prompt(
            "summarize_campaign_v1.jinja",
            previous_summary=campaign.get("accumulated_summary") or "",
            sessions=delta_sessions,
        )
        output = await self._llm_provider.complete_json(prompt, CampaignSummaryOutput)

        newest_session_number = max(s["session_number"] for s in delta_sessions)
        await run_in_threadpool(
            self._repository.update_campaign_summary,
            campaign["id"],
            output.accumulated_summary,
            newest_session_number,
        )
