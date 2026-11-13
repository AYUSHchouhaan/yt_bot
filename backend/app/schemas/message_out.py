from typing import Any

from pydantic import BaseModel, ConfigDict


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    citations: list[dict[str, Any]] | None


__all__ = ["MessageOut"]
