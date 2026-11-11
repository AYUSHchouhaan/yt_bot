from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from httpx import AsyncClient
from sqlalchemy import delete, select

from app.config import settings
from app.db import SessionLocal, engine
from app.models import AppUser

TEST_SECRET = "test-secret-0123456789abcdefghijklmnopqrstuv"


@pytest.fixture(autouse=True)
def local_jwt(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "supabase_jwks_url", "")
    monkeypatch.setattr(settings, "supabase_jwt_secret", TEST_SECRET)


@pytest.fixture
async def cleanup_users() -> list[str]:
    created: list[str] = []
    yield created
    if created:
        async with engine.begin() as conn:
            await conn.execute(delete(AppUser).where(AppUser.supabase_id.in_(created)))


def make_token(
    sub: str,
    *,
    secret: str = TEST_SECRET,
    expires_in: int = 3600,
) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {
            "sub": sub,
            "email": "test@example.com",
            "aud": "authenticated",
            "iat": now,
            "exp": now + timedelta(seconds=expires_in),
            "user_metadata": {
                "full_name": "Test User",
                "avatar_url": "https://example.com/avatar.png",
            },
        },
        secret,
        algorithm="HS256",
    )


async def test_me_requires_authorization(client: AsyncClient) -> None:
    response = await client.get("/me")
    assert response.status_code == 401


async def test_me_rejects_malformed_header(client: AsyncClient) -> None:
    response = await client.get("/me", headers={"Authorization": "Token abc"})
    assert response.status_code == 401


async def test_me_rejects_expired_token(client: AsyncClient) -> None:
    token = make_token(f"expired-{uuid4()}", expires_in=-60)
    response = await client.get(
        "/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401


async def test_me_rejects_bad_signature(client: AsyncClient) -> None:
    token = make_token(
        f"bad-sig-{uuid4()}", secret="wrong-secret-0123456789abcdefghijklmnop"
    )
    response = await client.get(
        "/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401


async def test_me_creates_and_reuses_user(
    client: AsyncClient, cleanup_users: list[str]
) -> None:
    supabase_id = f"test-{uuid4()}"
    cleanup_users.append(supabase_id)
    headers = {"Authorization": f"Bearer {make_token(supabase_id)}"}

    response = await client.get("/me", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["supabase_id"] == supabase_id
    assert body["email"] == "test@example.com"
    assert body["display_name"] == "Test User"
    assert body["avatar_url"] == "https://example.com/avatar.png"

    async with SessionLocal() as session:
        rows = (
            await session.execute(
                select(AppUser).where(AppUser.supabase_id == supabase_id)
            )
        ).scalars().all()
    assert len(rows) == 1

    again = await client.get("/me", headers=headers)
    assert again.status_code == 200
    assert again.json()["id"] == body["id"]
