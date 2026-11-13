from pydantic import BaseModel

from app.schemas.playlist_out import PlaylistOut
from app.schemas.video_out import VideoOut


class LibraryOut(BaseModel):
    videos: list[VideoOut]
    playlists: list[PlaylistOut]


__all__ = ["LibraryOut"]
