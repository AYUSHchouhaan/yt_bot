from pydantic import BaseModel


class Citation(BaseModel):
    youtube_id: str | None = None
    title: str | None = None
    start_s: float
    score: float | None = None


__all__ = ["Citation"]
