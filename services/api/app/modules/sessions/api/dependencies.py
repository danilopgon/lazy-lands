"""FastAPI dependency providers for sessions handlers.

Mirrors the campaigns module's provider pattern: route bodies never wire
infrastructure directly.
"""

from typing import Annotated

from fastapi import Depends
from supabase import Client

from app.modules.sessions.application.commands.export_session import ExportSession
from app.modules.sessions.application.commands.regenerate_section import (
    RegenerateSectionUseCase,
)
from app.modules.sessions.application.commands.register_session import RegisterSession
from app.modules.sessions.application.commands.suggest_memories import SuggestMemories
from app.modules.sessions.application.commands.summarize_campaign import (
    SummarizeCampaign,
)
from app.modules.sessions.application.commands.update_session import (
    UpdateSessionUseCase,
)
from app.modules.sessions.application.queries.get_session import GetSessionUseCase
from app.modules.sessions.application.queries.get_sessions import GetSessions
from app.modules.sessions.domain.ports import PdfRenderer
from app.modules.sessions.infrastructure.pdf_renderer import WeasyPrintPdfRenderer
from app.modules.sessions.infrastructure.repository import SupabaseSessionRepository
from app.shared.database import get_user_supabase_client
from app.shared.llm.dependencies import get_llm_provider
from app.shared.llm.port import LlmProvider


def provide_register_session(
    client: Annotated[Client, Depends(get_user_supabase_client)],
    llm_provider: Annotated[LlmProvider, Depends(get_llm_provider)],
) -> RegisterSession:
    """Build the RegisterSession command handler with its collaborators."""
    repository = SupabaseSessionRepository(client)
    summarize = SummarizeCampaign(llm_provider=llm_provider, repository=repository)
    suggest = SuggestMemories(llm_provider=llm_provider, repository=repository)
    return RegisterSession(repository, summarize, suggest)


def provide_get_sessions(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> GetSessions:
    """Build the GetSessions query handler with the caller-scoped repository."""
    return GetSessions(SupabaseSessionRepository(client))


def provide_get_session(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> GetSessionUseCase:
    """Build the single-session detail query handler."""
    return GetSessionUseCase(SupabaseSessionRepository(client))


def provide_update_session(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> UpdateSessionUseCase:
    """Build the session detail update handler."""
    return UpdateSessionUseCase(SupabaseSessionRepository(client))


def provide_export_session(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> ExportSession:
    """Build the export command with the caller-RLS-scoped repository."""
    return ExportSession(SupabaseSessionRepository(client))


def provide_pdf_renderer() -> PdfRenderer:
    """Provide the local PDF renderer without exposing request data to it."""
    return WeasyPrintPdfRenderer()


def provide_regenerate_section(
    client: Annotated[Client, Depends(get_user_supabase_client)],
    llm_provider: Annotated[LlmProvider, Depends(get_llm_provider)],
) -> RegenerateSectionUseCase:
    """Build the single-section regeneration handler.

    This is the composition root — the only place ``sessions`` may know
    about the ``generation`` adapter. The import is function-local (not at
    module scope) so ``sessions/api/dependencies.py`` never imports
    ``generation`` at module level, matching the compile-time edge
    ``generation -> sessions`` from the design (no cycle).
    """
    from app.modules.generation.application.regenerate_section_service import (
        GenerationSectionRegenerator,
    )
    from app.modules.generation.infrastructure.repository import (
        SupabaseGenerationRepository,
    )

    repository = SupabaseSessionRepository(client)
    regenerator = GenerationSectionRegenerator(
        SupabaseGenerationRepository(client), llm_provider
    )
    return RegenerateSectionUseCase(repository, regenerator)
