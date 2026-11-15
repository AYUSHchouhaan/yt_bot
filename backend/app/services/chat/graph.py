from typing import Any

from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.schemas.chat_state import ChatState
from app.schemas.scope import Scope
from app.services.chat.nodes import END as ROUTE_END
from app.services.chat.nodes import RETRIEVE, make_agent_node, make_retrieve_node, route
from app.services.rag_tool import RagSearchTool
from app.services.retrieval import resolve_scope


async def build_compiled_graph(
    session: AsyncSession,
    user_id: int,
    scope: Scope,
    *,
    checkpointer: Any,
    llm: Any | None = None,
    resolved: tuple[int | None, int | None] | None = None,
) -> Any:
    """Build a compiled LangGraph agent with the RAG tool.

    The tool (and therefore ``user_id`` / scope) is closed over per request so
    the LLM only emits a query string.  ``checkpointer`` must be supplied by
    the caller so it can manage the connection lifecycle.
    """
    if resolved is None:
        video_id, playlist_id = await resolve_scope(session, user_id, scope)
    else:
        video_id, playlist_id = resolved
    rag_tool = RagSearchTool(session, user_id, video_id, playlist_id)

    if llm is None:
        llm = ChatOpenAI(
            model=settings.openai_chat_model,
            api_key=settings.openai_api_key,
        )
    llm_with_tools = llm.bind_tools([rag_tool.as_tool()])

    graph = StateGraph(ChatState)
    graph.add_node("agent", make_agent_node(llm_with_tools))
    graph.add_node("retrieve", make_retrieve_node(rag_tool))
    graph.add_edge(START, "agent")
    graph.add_conditional_edges(
        "agent", route, {RETRIEVE: RETRIEVE, ROUTE_END: END}
    )
    graph.add_edge("retrieve", "agent")

    return graph.compile(checkpointer=checkpointer)


__all__ = ["build_compiled_graph"]
