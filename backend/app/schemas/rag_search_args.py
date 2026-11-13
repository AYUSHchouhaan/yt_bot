from pydantic import BaseModel


class RagSearchArgs(BaseModel):
    query: str


__all__ = ["RagSearchArgs"]
