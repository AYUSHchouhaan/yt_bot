from pydantic import BaseModel

from app.schemas.message_out import MessageOut


class ChatDetail(BaseModel):
    id: int
    title: str | None
    video_id: int | None
    playlist_id: int | None
    messages: list[MessageOut]


__all__ = ["ChatDetail"]
