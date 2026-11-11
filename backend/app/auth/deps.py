from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import verify_token
from app.db import get_session
from app.models import AppUser


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: str
    display_name: str | None = None
    avatar_url: str | None = None


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    if not authorization:
        raise _unauthorized("Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise _unauthorized("Invalid Authorization header")

    try:
        claims = verify_token(token.strip())
    except jwt.PyJWTError as exc:
        raise _unauthorized("Invalid or expired token") from exc

    supabase_id = claims.get("sub")
    if not supabase_id:
        raise _unauthorized("Token is missing the sub claim")

    metadata = claims.get("user_metadata") or {}
    return CurrentUser(
        id=supabase_id,
        email=claims.get("email") or "",
        display_name=metadata.get("full_name") or metadata.get("name"),
        avatar_url=metadata.get("avatar_url") or metadata.get("picture"),
    )


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]
SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def get_db_user(user: CurrentUserDep, session: SessionDep) -> AppUser:
    db_user = (
        await session.execute(select(AppUser).where(AppUser.supabase_id == user.id))
    ).scalar_one_or_none()
    if db_user is not None:
        return db_user

    await session.execute(
        insert(AppUser)
        .values(
            supabase_id=user.id,
            email=user.email,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
        )
        .on_conflict_do_nothing(index_elements=["supabase_id"])
    )
    await session.commit()

    return (
        await session.execute(select(AppUser).where(AppUser.supabase_id == user.id))
    ).scalar_one()


DbUserDep = Annotated[AppUser, Depends(get_db_user)]
