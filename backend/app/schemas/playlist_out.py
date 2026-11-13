from pydantic import BaseModel, ConfigDict


class PlaylistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    youtube_playlist_id: str
    title: str
    item_count: int


__all__ = ["PlaylistOut"]
