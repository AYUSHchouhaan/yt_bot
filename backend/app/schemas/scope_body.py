from pydantic import BaseModel

from app.schemas.scope_kind import ScopeKind


class ScopeBody(BaseModel):
    kind: ScopeKind = "library"
    id: int | None = None


__all__ = ["ScopeBody"]
