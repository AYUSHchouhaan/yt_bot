from typing import Annotated, Any, TypedDict
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import psycopg
from langchain_core.messages import AIMessage, BaseMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.services.rag import build_citations
from app.services.rag_tool import RagSearchTool
from app.services.retrieval import resolve_scope

SYSTEM_PROMPT = (
    "You are a YouTube transcript assistant. If the user's question needs facts "
    "from the video, call `rag_search`. If the messages already contain the answer "
    "or the question is chitchat, answer directly. When you use excerpts, cite them "
    "as [1], [2]. If the answer is not in the excerpts, say you couldn't find it."
)


class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    query: str
    context: list[dict[str, Any]]
    citations: list[dict[str, Any]]
    scope: dict[str, Any]
    user_id: int
    chat_id: int


def _psycopg_url(database_url: str) -> str:
    """Convert an asyncpg-style DATABASE_URL to one psycopg accepts.

    Strips ``+asyncpg`` from the scheme and translates the ``ssl`` query
    parameter (asyncpg) to ``sslmode`` (psycopg / libpq).
    """
    parsed = urlparse(database_url.replace("+asyncpg", ""))
    params = dict(parse_qsl(parsed.query))
    if "ssl" in params:
        params.setdefault("sslmode", params.pop("ssl"))
    return urlunparse(parsed._replace(query=urlencode(params)))


async def create_checkpointer_conn(database_url: str) -> psycopg.AsyncConnection:
    """Create an async psycopg connection for ``AsyncPostgresSaver``.

    ``autocommit`` is enabled so that ``setup()`` can run
    ``CREATE INDEX CONCURRENTLY`` outside a transaction block.
    """
    conn = await psycopg.AsyncConnection.connect(database_url)
    await conn.set_autocommit(True)
    return conn


async def build_compiled_graph(
    session: AsyncSession,
    user_id: int,
    scope: dict[str, Any],
    *,
    checkpointer: Any,
    llm: Any | None = None,
) -> Any:
    """Build a compiled LangGraph agent with the RAG tool.

    The tool (and therefore ``user_id`` / scope) is closed over per request so
    the LLM only emits a query string.  ``checkpointer`` must be supplied by
    the caller so it can manage the connection lifecycle.
    """
    video_id, playlist_id = await resolve_scope(session, user_id, scope)
    rag_tool = RagSearchTool(session, user_id, video_id, playlist_id)

    if llm is None:
        llm = ChatOpenAI(
            model=settings.openai_chat_model,
            api_key=settings.openai_api_key,
        )
    llm_with_tools = llm.bind_tools([rag_tool.as_tool()])

    async def agent_node(state: ChatState) -> dict[str, Any]:
        messages = list(state["messages"])
        if not any(isinstance(m, SystemMessage) for m in messages):
            messages = [SystemMessage(content=SYSTEM_PROMPT), *messages]
        response = await llm_with_tools.ainvoke(messages)
        return {"messages": [response]}

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
        return {"messages": tool_messages, "context": context, "citations": citations}

    def route(state: ChatState) -> str:
        last_msg = state["messages"][-1]
        if isinstance(last_msg, AIMessage) and last_msg.tool_calls:
            return "retrieve"
        return "end"

    graph = StateGraph(ChatState)
    graph.add_node("agent", agent_node)
    graph.add_node("retrieve", retrieve_node)
    graph.add_edge(START, "agent")
    graph.add_conditional_edges("agent", route, {"retrieve": "retrieve", "end": END})
    graph.add_edge("retrieve", "agent")

    return graph.compile(checkpointer=checkpointer)
