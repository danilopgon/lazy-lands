"""GenerateNextSessionUseCase — context → LLM → validated draft persistence."""

import logging
import time

from starlette.concurrency import run_in_threadpool

from app.modules.generation.application.context_builder import (
    build_prompt_context,
    estimate_tokens,
)
from app.modules.generation.application.contracts import (
    GeneratedSessionOutput,
    GenerateSessionResponse,
    GenerationDirection,
)
from app.modules.generation.application.errors import (
    GenerationNotFoundError,
    GenerationPersistenceError,
)
from app.modules.generation.domain.ports import GenerationRepository
from app.modules.sessions.infrastructure.errors import RepositoryError
from app.shared.llm.errors import LlmOutputValidationError
from app.shared.llm.port import LlmProvider
from app.shared.prompts import render_prompt

logger = logging.getLogger(__name__)

PROMPT_VERSION = "generate_session_v1"
MAX_GENERATION_TOKENS = 2000


class GenerateNextSessionUseCase:
    """Generate a structured next-session proposal for a caller-owned campaign."""

    def __init__(
        self, repository: GenerationRepository, llm_provider: LlmProvider
    ) -> None:
        """Initialize with repository and LLM provider ports."""
        self._repository = repository
        self._llm_provider = llm_provider

    async def execute(
        self, campaign_id: str, direction: GenerationDirection
    ) -> GenerateSessionResponse:
        """Generate, validate, persist, and return a draft session proposal."""
        raw_context = await run_in_threadpool(
            self._repository.get_generation_context, campaign_id
        )
        if raw_context is None:
            raise GenerationNotFoundError()

        prompt_context = build_prompt_context(raw_context, direction)
        prompt = render_prompt("generate_session_v1.jinja", **prompt_context)
        estimated_context_size = estimate_tokens(prompt)
        if estimated_context_size > MAX_GENERATION_TOKENS:
            logger.warning(
                "Generation context exceeds budget campaign_id=%s estimated=%s",
                campaign_id,
                estimated_context_size,
            )

        started = time.perf_counter()
        try:
            output = await self._llm_provider.complete_json(
                prompt, GeneratedSessionOutput
            )
        except LlmOutputValidationError:
            duration_ms = int((time.perf_counter() - started) * 1000)
            trace_json = self._build_trace_json(
                raw_context=raw_context,
                estimated_context_size=estimated_context_size,
                duration_ms=duration_ms,
                error_code="llm_output_validation_failed",
            )
            await run_in_threadpool(
                self._repository.record_generation_trace, campaign_id, trace_json
            )
            raise
        duration_ms = int((time.perf_counter() - started) * 1000)
        trace_json = self._build_trace_json(
            raw_context=raw_context,
            estimated_context_size=estimated_context_size,
            duration_ms=duration_ms,
            error_code=None,
        )
        session_data = {
            "summary": output.synopsis,
            "consequences": None,
            "generated_content": output.content_for_persistence().model_dump(
                mode="json"
            ),
            "trace_json": trace_json,
        }
        try:
            session = await run_in_threadpool(
                self._repository.create_generated_session, campaign_id, session_data
            )
        except RepositoryError as exc:
            raise GenerationPersistenceError(retryable=True) from exc

        return GenerateSessionResponse(
            id=session["id"],
            session_number=session["session_number"],
            title=output.title,
            synopsis=output.synopsis,
            main_objective=output.main_objective,
            twist=output.twist,
            encounters=output.encounters,
            faction_reactions=output.faction_reactions,
            arc_progression=output.arc_progression,
            continuity_links=output.continuity_links,
            trace_id=session["id"],
        )

    def _build_trace_json(
        self,
        raw_context: dict,
        estimated_context_size: int,
        duration_ms: int,
        error_code: str | None,
    ) -> dict:
        campaign = raw_context["campaign"]
        return {
            "provider": type(self._llm_provider).__name__,
            "model": getattr(self._llm_provider, "model", "unknown"),
            "prompt_version": PROMPT_VERSION,
            "estimated_context_size": estimated_context_size,
            "duration_ms": duration_ms,
            "error_code": error_code,
            "context_summary": {
                "campaign_id": campaign["id"],
                "summarized_up_to_session": campaign.get("summarized_up_to_session"),
            },
        }
