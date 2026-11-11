from typing import Any

import jwt
from jwt import PyJWKClient

from app.config import settings

_JWK_ALGORITHMS = ["RS256", "ES256"]
_HS_ALGORITHMS = ["HS256"]

_jwk_client: PyJWKClient | None = None
_jwk_client_url: str | None = None


def _get_jwk_client(url: str) -> PyJWKClient:
    global _jwk_client, _jwk_client_url
    if _jwk_client is None or _jwk_client_url != url:
        _jwk_client = PyJWKClient(url, cache_keys=True)
        _jwk_client_url = url
    return _jwk_client


def verify_token(token: str) -> dict[str, Any]:
    """Verify a Supabase access token and return its claims.

    Uses the project's JWKS when configured (asymmetric signing keys),
    otherwise falls back to the shared HS256 secret. Always checks ``exp``
    and an audience of ``authenticated``. Raises ``jwt.PyJWTError`` when the
    token is invalid or verification is not configured.
    """
    if settings.supabase_jwks_url:
        signing_key = _get_jwk_client(
            settings.supabase_jwks_url
        ).get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=_JWK_ALGORITHMS,
            audience="authenticated",
            options={"require": ["exp"]},
        )

    if not settings.supabase_jwt_secret:
        raise jwt.InvalidTokenError(
            "Configure SUPABASE_JWKS_URL or SUPABASE_JWT_SECRET to verify tokens"
        )

    return jwt.decode(
        token,
        settings.supabase_jwt_secret,
        algorithms=_HS_ALGORITHMS,
        audience="authenticated",
        options={"require": ["exp"]},
    )
