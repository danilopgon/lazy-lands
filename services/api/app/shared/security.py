from typing import Annotated

from fastapi import Header, HTTPException, status


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    # TODO: verify Supabase JWT before returning a user identity.
    return authorization
