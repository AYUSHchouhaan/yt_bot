from typing import Annotated, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages

from app.schemas.citation import Citation
from app.schemas.scope import Scope


class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    query: str
    context: list[dict]
    citations: list[Citation]
    scope: Scope
    user_id: int
    chat_id: int


__all__ = ["ChatState"]
