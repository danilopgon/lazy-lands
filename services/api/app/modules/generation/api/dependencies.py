"""FastAPI dependency providers for generation handlers."""

from typing import Annotated

from fastapi import Depends
from supabase import Client

from app.modules.generation.application.generate_session import (
    GenerateNextSessionUseCase,
)
from app.modules.generation.infrastructure.repository import (
    SupabaseGenerationRepository,
)
from app.shared.database import get_user_supabase_client
from app.shared.llm.dependencies import get_llm_provider
from app.shared.llm.port import LlmProvider


def provide_generate_next_session(
    client: Annotated[Client, Depends(get_user_supabase_client)],
    llm_provider: Annotated[LlmProvider, Depends(get_llm_provider)],
) -> GenerateNextSessionUseCase:
    """Build the generation use case with caller-scoped persistence."""
    return GenerateNextSessionUseCase(
        SupabaseGenerationRepository(client), llm_provider
    )
