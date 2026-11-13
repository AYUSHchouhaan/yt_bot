from pydantic import BaseModel

from app.schemas.citation import Citation


class ChatResponse(BaseModel):
    chat_id: int
    answer: str
    citations: list[Citation]


__all__ = ["ChatResponse"]
