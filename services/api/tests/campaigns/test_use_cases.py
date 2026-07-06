"""Use-case tests for campaign read paths."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.modules.campaigns.application.errors import CampaignNotFoundError
from app.modules.campaigns.application.queries.get_campaign_detail import (
    GetCampaignDetail,
)
from app.modules.campaigns.application.queries.get_campaigns import GetCampaigns

CAMPAIGN_ID = "11111111-1111-4111-8111-111111111111"


def test_get_campaigns_returns_repository_rows_in_existing_order() -> None:
    repo = MagicMock()
    repo.list_campaigns.return_value = [
        {"id": "new", "title": "New", "updated_at": "2026-07-02T00:00:00Z"},
        {"id": "old", "title": "Old", "updated_at": "2026-07-01T00:00:00Z"},
    ]

    result = GetCampaigns(repo).execute()

    assert [campaign.id for campaign in result] == ["new", "old"]
    repo.list_campaigns.assert_called_once_with()


def test_get_campaigns_returns_empty_list() -> None:
    repo = MagicMock()
    repo.list_campaigns.return_value = []

    result = GetCampaigns(repo).execute()

    assert result == []


def test_get_campaign_detail_composes_campaign_children_and_arcs() -> None:
    repo = MagicMock()
    repo.get_campaign.return_value = {
        "id": CAMPAIGN_ID,
        "title": "Sombras",
        "description": "A frontier chronicle",
        "world_state": "The town waits.",
        "system": None,
        "tone": None,
        "updated_at": "2026-07-02T00:00:00Z",
    }
    repo.get_campaign_children.return_value = (
        [{"id": "npc-1", "name": "Toblen"}],
        [{"id": "faction-1", "name": "Guild"}],
        [{"id": "arc-1", "title": "Missing caravan", "status": "active"}],
    )

    detail = GetCampaignDetail(repo).execute(CAMPAIGN_ID)

    assert detail.id == CAMPAIGN_ID
    assert [npc.id for npc in detail.npcs] == ["npc-1"]
    assert [faction.id for faction in detail.factions] == ["faction-1"]
    assert [arc.id for arc in detail.arcs] == ["arc-1"]
    repo.get_campaign.assert_called_once_with(CAMPAIGN_ID)
    repo.get_campaign_children.assert_called_once_with(CAMPAIGN_ID)


def test_get_campaign_detail_rejects_malformed_id_before_repository_query() -> None:
    repo = MagicMock()

    with pytest.raises(CampaignNotFoundError):
        GetCampaignDetail(repo).execute("undefined")

    repo.get_campaign.assert_not_called()
    repo.get_campaign_children.assert_not_called()


def test_get_campaign_detail_raises_not_found_when_campaign_not_visible() -> None:
    repo = MagicMock()
    repo.get_campaign.return_value = None

    with pytest.raises(CampaignNotFoundError):
        GetCampaignDetail(repo).execute(CAMPAIGN_ID)

    repo.get_campaign.assert_called_once_with(CAMPAIGN_ID)
    repo.get_campaign_children.assert_not_called()
