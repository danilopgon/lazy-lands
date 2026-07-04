"""Tests for the per-user, JWT-bound Supabase client factory (PU-001, NFR-PU-1).

RED phase: create_user_supabase_client / get_user_supabase_client do not exist
yet in shared/database.py at the start of Phase 1.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch


def test_create_user_supabase_client_authenticates_with_token() -> None:
    """The returned client MUST have .postgrest.auth() invoked with the token."""
    from app.shared.database import create_user_supabase_client  # noqa: PLC0415

    with patch("app.shared.database.create_client") as mock_create:
        mock_client = MagicMock()
        mock_create.return_value = mock_client

        result = create_user_supabase_client("user-token-abc")

        mock_client.postgrest.auth.assert_called_once_with("user-token-abc")
        assert result is mock_client


def test_create_user_supabase_client_is_fresh_per_call_no_lru_cache() -> None:
    """Two calls MUST produce two independent create_client invocations.

    Contrast with get_supabase_client()'s @lru_cache singleton — that pattern
    is forbidden here because the client carries a request-scoped credential.
    """
    from app.shared.database import create_user_supabase_client  # noqa: PLC0415

    with patch("app.shared.database.create_client") as mock_create:
        mock_create.side_effect = [MagicMock(), MagicMock()]

        first = create_user_supabase_client("token-1")
        second = create_user_supabase_client("token-2")

        assert mock_create.call_count == 2
        assert first is not second


def test_client_isolation_different_tokens_no_shared_state_leak() -> None:
    """Two requests with different tokens MUST get independent client instances."""
    from app.shared.database import create_user_supabase_client  # noqa: PLC0415

    with patch("app.shared.database.create_client") as mock_create:
        client_a = MagicMock()
        client_b = MagicMock()
        mock_create.side_effect = [client_a, client_b]

        result_a = create_user_supabase_client("token-user-a")
        result_b = create_user_supabase_client("token-user-b")

        assert result_a is client_a
        assert result_b is client_b
        client_a.postgrest.auth.assert_called_once_with("token-user-a")
        client_b.postgrest.auth.assert_called_once_with("token-user-b")


def test_get_user_supabase_client_is_importable() -> None:
    from app.shared.database import get_user_supabase_client  # noqa: PLC0415

    assert callable(get_user_supabase_client)
