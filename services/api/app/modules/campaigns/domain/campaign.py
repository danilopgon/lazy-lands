"""Campaign aggregate root."""

from pydantic import BaseModel, ConfigDict


class Campaign(BaseModel):
    """A DM's campaign, owned by exactly one Supabase auth user."""

    model_config = ConfigDict(frozen=True)

    id: str
    user_id: str
    title: str
    description: str
    world_state: str
