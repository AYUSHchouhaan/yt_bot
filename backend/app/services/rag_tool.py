from typing import Any

from langchain_core.tools import StructuredTool
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.rag_search_args import RagSearchArgs
from app.services.rag import build_context
from app.services.retrieval import hybrid_search


class RagSearchTool:
    """Wraps ``hybrid_search`` as a LangChain tool with per-request closures.

    The LLM only sees ``rag_search(query: str) -> str``; ``user_id`` and the
    resolved scope (``video_id`` / ``playlist_id``) are closed over so the
    backend injects them, not the model.
    """

    def __init__(
        self,
        session: AsyncSession,
        user_id: int,
        video_id: int | None,
        playlist_id: int | None,
    ) -> None:
        self.session = session
        self.user_id = user_id
        self.video_id = video_id
        self.playlist_id = playlist_id
        self.last_hits: list[dict[str, Any]] = []

    async def run(self, query: str) -> str:
        hits = await hybrid_search(
            self.session,
            query,
            self.user_id,
            self.video_id,
            self.playlist_id,
        )
        self.last_hits = hits
        return build_context(hits)

    def as_tool(self) -> StructuredTool:
        return StructuredTool.from_function(
            name="rag_search",
            description=(
                "Search ingested video/playlist transcripts for relevant "
                "excerpts. Use when the user asks about video content that "
                "requires facts from the transcript."
            ),
            coroutine=self.run,
            args_schema=RagSearchArgs,
        )
