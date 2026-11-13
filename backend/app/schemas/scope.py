from typing import TypedDict

from app.schemas.scope_kind import ScopeKind


class Scope(TypedDict, total=False):
    kind: ScopeKind
    id: int | None


__all__ = ["Scope"]
