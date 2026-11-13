from collections.abc import Callable
from typing import Any

from langchain_core.messages import AIMessage, SystemMessage, ToolMessage

from app.schemas.chat_state import ChatState
from app.services.chat.prompts import SYSTEM_PROMPT
from app.services.rag import build_citations
from app.services.rag_tool import RagSearchTool

RETRIEVE = "retrieve"
END = "end"


def make_agent_node(
    llm_with_tools: Any,
) -> Callable[[ChatState], Any]:
    async def agent_node(state: ChatState) -> dict[str, Any]:
        messages = list(state["messages"])
        if not any(isinstance(m, SystemMessage) for m in messages):
            messages = [SystemMessage(content=SYSTEM_PROMPT), *messages]
        response = await llm_with_tools.ainvoke(messages)
        return {"messages": [response]}

    return agent_node


def make_retrieve_node(
    rag_tool: RagSearchTool,
) -> Callable[[ChatState], Any]:
    async def retrieve_node(state: ChatState) -> dict[str, Any]:
        last_msg = state["messages"][-1]
        tool_messages: list[ToolMessage] = []
        context = list(state.get("context") or [])
        citations = list(state.get("citations") or [])
        for tc in last_msg.tool_calls:
            if tc["name"] == "rag_search":
                result = await rag_tool.run(tc["args"]["query"])
                tool_messages.append(
                    ToolMessage(content=result, tool_call_id=tc["id"])
                )
                context.extend(rag_tool.last_hits)
                citations.extend(build_citations(rag_tool.last_hits))
        return {
            "messages": tool_messages,
            "context": context,
            "citations": citations,
        }

    return retrieve_node


def route(state: ChatState) -> str:
    last_msg = state["messages"][-1]
    if isinstance(last_msg, AIMessage) and last_msg.tool_calls:
        return RETRIEVE
    return END


__all__ = ["END", "RETRIEVE", "make_agent_node", "make_retrieve_node", "route"]
