from pydantic import BaseModel, Field

from app.schemas.scope_body import ScopeBody


class ChatRequest(BaseModel):
    message: str
    chat_id: str | None = Field(default=None, pattern=r"^\d{18,24}$")
    scope: ScopeBody = ScopeBody()


__all__ = ["ChatRequest"]
