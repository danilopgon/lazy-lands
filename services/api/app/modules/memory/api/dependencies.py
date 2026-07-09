"""FastAPI dependency providers for memory handlers."""

from typing import Annotated

from fastapi import Depends
from supabase import Client

from app.modules.memory.application.commands.create_memory_fact import CreateMemoryFact
from app.modules.memory.application.commands.update_memory_fact import UpdateMemoryFact
from app.modules.memory.application.queries.list_memory_facts import ListMemoryFacts
from app.modules.memory.infrastructure.repository import SupabaseMemoryRepository
from app.shared.database import get_user_supabase_client


def provide_create_memory_fact(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> CreateMemoryFact:
    """Build the CreateMemoryFact command handler."""
    return CreateMemoryFact(SupabaseMemoryRepository(client))


def provide_list_memory_facts(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> ListMemoryFacts:
    """Build the ListMemoryFacts query handler."""
    return ListMemoryFacts(SupabaseMemoryRepository(client))


def provide_update_memory_fact(
    client: Annotated[Client, Depends(get_user_supabase_client)],
) -> UpdateMemoryFact:
    """Build the UpdateMemoryFact command handler."""
    return UpdateMemoryFact(SupabaseMemoryRepository(client))
