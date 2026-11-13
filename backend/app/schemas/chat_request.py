from pydantic import BaseModel

from app.schemas.scope_body import ScopeBody


class ChatRequest(BaseModel):
    message: str
    chat_id: int | None = None
    scope: ScopeBody = ScopeBody()


__all__ = ["ChatRequest"]
