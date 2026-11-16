from pydantic import BaseModel, ConfigDict


class VideoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    youtube_video_id: str
    title: str | None
    channel: str | None
    duration_s: int | None
    thumbnail_url: str | None
    status: str
    playlist_id: int | None


__all__ = ["VideoOut"]
