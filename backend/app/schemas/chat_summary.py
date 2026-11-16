from pydantic import BaseModel


class ChatSummary(BaseModel):
    id: str
    title: str | None
    video_id: int | None
    playlist_id: int | None


__all__ = ["ChatSummary"]
