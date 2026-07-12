"""GenerationSectionRegenerator — SectionRegenerator adapter (generation -> sessions).

Implements ``sessions.domain.ports.SectionRegenerator``. This is the only
compile-time edge between the two modules: ``generation`` depends on
``sessions``' port definition through structural typing, ``sessions`` never
imports ``generation`` at module level (design Decision 1).
"""

import logging
import time
from typing import Any

from starlette.concurrency import run_in_threadpool

from app.modules.generation.application.contracts import (
    CANONICAL_SECTION_LABELS,
    RegeneratedSectionOutput,
)
from app.modules.generation.application.errors import GenerationNotFoundError
from app.modules.generation.domain.ports import GenerationRepository
from app.shared.llm.port import LlmProvider
from app.shared.prompts import render_prompt

logger = logging.getLogger(__name__)


class GenerationSectionRegenerator:
    """Regenerate one generated-session section for a caller-owned campaign."""

    def __init__(
        self, repository: GenerationRepository, llm_provider: LlmProvider
    ) -> None:
        """Initialize with the generation repository and LLM provider ports."""
        self._repository = repository
        self._llm_provider = llm_provider

    async def regenerate_section(
        self,
        campaign_id: str,
        section_id: str,
        current_sections: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Render the per-section prompt, call the LLM, and return a plain dict."""
        raw_context = await run_in_threadpool(
            self._repository.get_generation_context, campaign_id
        )
        if raw_context is None:
            raise GenerationNotFoundError()

        prompt_version = f"regenerate_{section_id}_v1"
        prompt = render_prompt(
            f"regenerate_section_{section_id}_v1.jinja",
            campaign=raw_context.get("campaign") or {},
            npcs=list(raw_context.get("npcs") or []),
            factions=list(raw_context.get("factions") or []),
            arcs=list(raw_context.get("arcs") or []),
            memory_facts=list(raw_context.get("memory_facts") or []),
            current_sections=current_sections,
        )

        started = time.perf_counter()
        output = await self._llm_provider.complete_json(
            prompt, RegeneratedSectionOutput
        )
        duration_ms = int((time.perf_counter() - started) * 1000)

        return {
            "id": section_id,
            "label": CANONICAL_SECTION_LABELS.get(section_id, section_id.title()),
            "body": output.body,
            "origin": "scribe",
            "trace_json": {
                "provider": type(self._llm_provider).__name__,
                "model": getattr(self._llm_provider, "model", "unknown"),
                "prompt_version": prompt_version,
                "duration_ms": duration_ms,
                "context_summary": {"campaign_id": campaign_id},
            },
        }
