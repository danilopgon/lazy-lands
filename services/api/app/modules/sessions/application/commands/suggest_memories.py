"""SuggestMemories use case — proposes 0-5 transient memory facts from a session.

Input is built via a DIRECT relational fetch by ``campaign_id`` (campaign
state, NPCs, factions, open arcs, active memory facts) — no RAG, embeddings,
or vector search (explicit non-goal, memory-suggestions spec). Suggestions
are never persisted by this use case.
"""

from starlette.concurrency import run_in_threadpool

from app.modules.sessions.application.contracts import (
    MemorySuggestion,
    MemorySuggestionsOutput,
)
from app.modules.sessions.domain.ports import SessionRepository
from app.shared.llm.port import LlmProvider
from app.shared.prompts import render_prompt


class SuggestMemories:
    """Proposes memory facts for the DM to review — never writes them."""

    def __init__(
        self, llm_provider: LlmProvider, repository: SessionRepository
    ) -> None:
        """Initialize with the LLM provider and the SessionRepository."""
        self._llm_provider = llm_provider
        self._repository = repository

    async def execute(self, campaign_id: str, session: dict) -> list[MemorySuggestion]:
        """Return 0-5 validated memory suggestions for the given session.

        Args:
            campaign_id: The owning campaign's id.
            session: The just-persisted session row (``summary``,
                ``consequences``).

        Returns:
            A list of 0-5 ``MemorySuggestion`` — transient, never persisted.

        Raises:
            LlmOutputValidationError: If the LLM's output fails validation
                (propagates so the caller can degrade-to-empty).
        """
        campaign = await run_in_threadpool(self._repository.get_campaign, campaign_id)
        context = await run_in_threadpool(
            self._repository.get_suggestion_context, campaign_id
        )

        prompt = render_prompt(
            "suggest_memory_facts_v1.jinja",
            accumulated_summary=(campaign or {}).get("accumulated_summary"),
            world_state=(campaign or {}).get("world_state"),
            npcs=context["npcs"],
            factions=context["factions"],
            arcs=context["arcs"],
            memory_facts=context["memory_facts"],
            session=session,
        )
        output = await self._llm_provider.complete_json(prompt, MemorySuggestionsOutput)
        return output.suggestions
