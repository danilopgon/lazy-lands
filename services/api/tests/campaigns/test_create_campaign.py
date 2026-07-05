"""Use-case tests for CreateCampaign (CP-003, CP-005)."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.modules.campaigns.application.commands.create_campaign import (
    CreateCampaign,
    CreateCampaignCommand,
)
from app.modules.campaigns.application.errors import CampaignPersistenceError
from app.modules.campaigns.domain.arc import NewArc
from app.modules.campaigns.domain.faction import Faction
from app.modules.campaigns.domain.npc import NPC
from app.modules.campaigns.infrastructure.errors import RepositoryError


def _payload(with_children: bool = True) -> CreateCampaignCommand:
    if not with_children:
        return CreateCampaignCommand(title="T", description="D", world_state="W")
    return CreateCampaignCommand(
        title="T",
        description="D",
        world_state="W",
        npcs=[
            NPC(
                name="N",
                description="d",
                current_state="s",
                motivation="m",
                content_source="llm",
            )
        ],
        factions=[
            Faction(
                name="F",
                description="d",
                current_stance="s",
                goals="g",
                content_source="llm",
            )
        ],
        arcs=[
            NewArc(title="A", description="d", priority="high", content_source="llm")
        ],
    )


def test_happy_path_with_children_returns_campaign_id() -> None:
    repo = MagicMock()
    repo.insert_campaign.return_value = "campaign-1"
    use_case = CreateCampaign(repo)

    result = use_case.execute("user-1", _payload(with_children=True))

    assert result == "campaign-1"
    repo.insert_campaign.assert_called_once()
    repo.insert_npcs.assert_called_once()
    repo.insert_factions.assert_called_once()
    repo.insert_arcs.assert_called_once()
    repo.delete_campaign.assert_not_called()


def test_happy_path_empty_children_still_inserts_campaign_only() -> None:
    repo = MagicMock()
    repo.insert_campaign.return_value = "campaign-2"
    use_case = CreateCampaign(repo)

    result = use_case.execute("user-1", _payload(with_children=False))

    assert result == "campaign-2"
    repo.insert_npcs.assert_called_once_with("campaign-2", [])
    repo.insert_factions.assert_called_once_with("campaign-2", [])
    repo.insert_arcs.assert_called_once_with("campaign-2", [])
    repo.delete_campaign.assert_not_called()


def test_npc_insert_failure_triggers_compensating_delete_and_raises_retryable() -> None:
    repo = MagicMock()
    repo.insert_campaign.return_value = "campaign-3"
    repo.insert_npcs.side_effect = RepositoryError("boom")
    use_case = CreateCampaign(repo)

    with pytest.raises(CampaignPersistenceError) as exc_info:
        use_case.execute("user-1", _payload(with_children=True))

    repo.delete_campaign.assert_called_once_with("campaign-3")
    assert exc_info.value.retryable is True
    assert exc_info.value.orphaned_campaign_id is None


def test_arc_insert_failure_after_npc_and_faction_success_still_compensates() -> None:
    repo = MagicMock()
    repo.insert_campaign.return_value = "campaign-4"
    repo.insert_arcs.side_effect = RepositoryError("boom")
    use_case = CreateCampaign(repo)

    with pytest.raises(CampaignPersistenceError):
        use_case.execute("user-1", _payload(with_children=True))

    repo.insert_npcs.assert_called_once()
    repo.insert_factions.assert_called_once()
    repo.delete_campaign.assert_called_once_with("campaign-4")


def test_compensating_delete_failure_surfaces_orphaned_campaign_id() -> None:
    repo = MagicMock()
    repo.insert_campaign.return_value = "campaign-5"
    repo.insert_npcs.side_effect = RepositoryError("boom")
    repo.delete_campaign.side_effect = RepositoryError("delete also failed")
    use_case = CreateCampaign(repo)

    with pytest.raises(CampaignPersistenceError) as exc_info:
        use_case.execute("user-1", _payload(with_children=True))

    assert exc_info.value.orphaned_campaign_id == "campaign-5"
    assert exc_info.value.retryable is True


def test_payload_is_preserved_for_retry_use_case_does_not_mutate_input() -> None:
    repo = MagicMock()
    repo.insert_campaign.return_value = "campaign-6"
    repo.insert_npcs.side_effect = RepositoryError("boom")
    use_case = CreateCampaign(repo)
    payload = _payload(with_children=True)
    original_npcs = list(payload.npcs)

    with pytest.raises(CampaignPersistenceError):
        use_case.execute("user-1", payload)

    assert payload.npcs == original_npcs
