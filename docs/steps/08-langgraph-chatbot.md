# Step 08 — LangGraph Chatbot

**Goal:** a multi-turn chatbot over ingested video/playlist transcripts. A LangGraph agent decides whether to call the RAG tool, runs hybrid search when it does, and answers grounded with citations. State (messages, context, citations) is persisted per chat via PostgresSaver so the agent remembers prior turns. Non-streaming JSON responses.

**Prerequisite:** Step 07.

## State shape

```python
class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]   # full history; persisted by the checkpointer
    query: str                  # the latest user message text; updated every turn
    context: list[dict]         # retrieved chunks: {text, start_s, end_s, title, youtube_id, score}
    citations: list[dict]       # {youtube_id, title, start_s, score} for the final answer
    scope: dict                 # {kind: "video"|"playlist"|"library", id?: int}
    user_id: int
    chat_id: int
```

- `messages` is the source of truth for multi-turn memory — it accumulates `HumanMessage`, `AIMessage` (with tool calls), and `ToolMessage` (retrieved chunks) across turns.
- `query` is set from the incoming user message at the start of each turn; the LLM nodes read it.
- `context` is filled by the retrieve node and read by the answer step. It is **not** wiped between turns, so a follow-up can reuse chunks already fetched this chat (the agent decides whether to re-call the tool).
- `scope` + `user_id` are bound per chat and closed over by the tool, so the LLM only emits a query string and the backend injects the scope.

## What to implement

### `app/services/rag_tool.py`
- Wrap `hybrid_search` (step 07) as a LangChain tool. Built **per request** with `user_id` and `scope` closed over, so the tool signature seen by the LLM is just `rag_search(query: str) -> str`:
  - Runs `hybrid_search(session, query, user_id, scope.video_id, scope.playlist_id)`.
  - Writes the hits into `state.context` (via the tool's return / a side channel).
  - Returns `build_context(hits)` so the `ToolMessage` carries the numbered excerpts the LLM cites.

### `app/services/chat_graph.py`
- Build the graph with three nodes:
  1. **`agent_node`** — `gpt-4o-mini` with `rag_search` bound via `bind_tools`. System prompt: *"You are a YouTube transcript assistant. If the user's question needs facts from the video, call `rag_search`. If the messages already contain the answer or the question is chitchat, answer directly. When you use excerpts, cite them as [1], [2]. If the answer is not in the excerpts, say you couldn't find it."* Returns an `AIMessage` — either a `tool_call` or a final answer.
  2. **`retrieve_node`** — tool executor: runs the tool calls from the last `AIMessage`, appends `ToolMessage`(s), and updates `state.context` + `state.citations` from the hits.
  3. **`answer_node`** (optional explicit final step) — a no-tools LLM call that takes `query` + `context` + `messages` and produces the grounded answer. Only needed if you want to force a clean final pass; the ReAct loop (`agent → retrieve → agent`) already produces the answer on the second `agent` visit.
- Edges:
  - `START → agent_node`
  - `agent_node →` conditional: if the last `AIMessage` has `tool_calls`, go to `retrieve_node`; else go to `END`.
  - `retrieve_node → agent_node` (loop back so the agent answers with the retrieved context).
- **Checkpointer:** `PostgresSaver` (`langgraph-checkpoint-postgres`) on the same `DATABASE_URL`. `thread_id = str(chat_id)`. On each new user message, load the checkpoint (restores full `messages` + prior `context`), append the `HumanMessage`, invoke. This is what makes it a real multi-turn chatbot — no manual history threading.

### `app/routers/chat.py`
- **`POST /chat`** — body `{message, chat_id?, scope}` where `scope = {kind, id?}`. Protected.
  - No `chat_id` → create a `Chat` row (set `video_id`/`playlist_id` from scope when scoped), return the new `chat_id`.
  - Append the user `Message` row.
  - Invoke the compiled graph with `thread_id=chat_id`, `state.query = message`, `state.scope`, `state.user_id`.
  - Take the final `AIMessage` text + `state.citations`.
  - Insert the assistant `Message` (with `citations` JSONB).
  - Return **`{chat_id, answer, citations}`** — one JSON object, no SSE, no streaming.
- **`GET /chats`** — list the user's chats for the sidebar (id, title, scoped video/playlist).
- **`GET /chats/{id}`** — return the message history for a chat (from the `messages` table, or by reading the latest checkpoint).
- **`GET /library`** — list the user's videos + playlists with status, for the scope selector (step 09).

Wire the router into `main.py`.

## Dependencies

Add to `backend/pyproject.toml`: `langgraph`, `langchain-openai`, `langgraph-checkpoint-postgres`.

## How to test

- After ingesting a video, `POST /chat` with a factual question → `{chat_id, answer, citations}`; the top citation's `start_s` is within ±30 s.
- Ask a follow-up that references the previous turn ("and what did they say after that?") → the agent answers using `messages` history without necessarily re-calling `rag_search`.
- Send "hi" → the agent answers directly, `rag_search` is **not** called.
- Send a question whose answer is absent → the agent refuses rather than hallucinating.
- `tests/test_chat_graph.py` — monkeypatch the LLM (`bind_tools` call) and `hybrid_search`; assert:
  - The tool is called for a factual query and not called for chitchat.
  - `context` from turn N is visible in the state at turn N+1 (PostgresSaver round-trip).
  - `citations` are returned and a `messages` row is created for both user and assistant.
  - Scope filtering: user B's graph never sees user A's chunks.
