from pydantic import BaseModel, ConfigDict


class ChatSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str | None
    video_id: int | None
    playlist_id: int | None


__all__ = ["ChatSummary"]
