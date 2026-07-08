"""Use-case tests for SummarizeCampaign (rolling summary, self-healing delta)."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.modules.sessions.application.commands.summarize_campaign import (
    SummarizeCampaign,
)
from app.modules.sessions.application.contracts import CampaignSummaryOutput
from app.shared.llm.providers.fake import FakeLlmProvider


@pytest.mark.asyncio
async def test_first_session_establishes_summary() -> None:
    provider = FakeLlmProvider()
    provider.register(
        CampaignSummaryOutput, {"accumulated_summary": "The party arrived at port."}
    )
    repo = MagicMock()
    repo.get_sessions_since.return_value = [
        {"session_number": 1, "summary": "The party arrived.", "consequences": None}
    ]
    use_case = SummarizeCampaign(llm_provider=provider, repository=repo)
    campaign = {"id": "campaign-1", "accumulated_summary": None, "summarized_up_to_session": None}

    await use_case.execute(campaign, {"id": "session-1", "session_number": 1})

    repo.get_sessions_since.assert_called_once_with("campaign-1", 0)
    repo.update_campaign_summary.assert_called_once_with(
        "campaign-1", "The party arrived at port.", 1
    )


@pytest.mark.asyncio
async def test_later_session_folds_only_delta_since_summarized_up_to() -> None:
    provider = FakeLlmProvider()
    provider.register(
        CampaignSummaryOutput, {"accumulated_summary": "Updated summary."}
    )
    repo = MagicMock()
    repo.get_sessions_since.return_value = [
        {"session_number": 3, "summary": "A third session happened.", "consequences": None}
    ]
    use_case = SummarizeCampaign(llm_provider=provider, repository=repo)
    campaign = {
        "id": "campaign-1",
        "accumulated_summary": "Sessions 1-2 summary.",
        "summarized_up_to_session": 2,
    }

    await use_case.execute(campaign, {"id": "session-3", "session_number": 3})

    repo.get_sessions_since.assert_called_once_with("campaign-1", 2)
    repo.update_campaign_summary.assert_called_once_with(
        "campaign-1", "Updated summary.", 3
    )


@pytest.mark.asyncio
async def test_previously_skipped_sessions_self_heal_together_with_the_new_one() -> None:
    provider = FakeLlmProvider()
    provider.register(CampaignSummaryOutput, {"accumulated_summary": "Healed summary."})
    repo = MagicMock()
    # summarized_up_to_session=1, but sessions 2 and 3 both exist unsummarized.
    repo.get_sessions_since.return_value = [
        {"session_number": 2, "summary": "Skipped session.", "consequences": None},
        {"session_number": 3, "summary": "New session.", "consequences": None},
    ]
    use_case = SummarizeCampaign(llm_provider=provider, repository=repo)
    campaign = {
        "id": "campaign-1",
        "accumulated_summary": "Session 1 summary.",
        "summarized_up_to_session": 1,
    }

    await use_case.execute(campaign, {"id": "session-3", "session_number": 3})

    repo.get_sessions_since.assert_called_once_with("campaign-1", 1)
    # summarized_up_to_session is set app-side to the newest included session.
    repo.update_campaign_summary.assert_called_once_with(
        "campaign-1", "Healed summary.", 3
    )
