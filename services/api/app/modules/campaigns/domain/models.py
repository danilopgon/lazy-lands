"""Compatibility barrel for campaign domain models.

The domain now gives each aggregate/entity its own module. This file remains
so older imports from ``domain.models`` keep working during Block 5 review.
"""

from app.modules.campaigns.domain.arc import Arc
from app.modules.campaigns.domain.campaign import Campaign
from app.modules.campaigns.domain.enums import ArcStatus, ContentSource, Priority
from app.modules.campaigns.domain.faction import Faction
from app.modules.campaigns.domain.npc import NPC

__all__ = [
    "Arc",
    "ArcStatus",
    "Campaign",
    "ContentSource",
    "Faction",
    "NPC",
    "Priority",
]
