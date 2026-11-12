# yt_bot — Ingestion & Retrieval Architecture

Covers: transcript acquisition, time-based chunking, vector storage and scoping, retrieval strategy (semantic vs BM25 vs hybrid), reranking, hierarchical indexing, and how the LLM-assignment techniques map onto this project.

---

## 1. Constraints that drive the design

- No video/audio download — captions only.
- Captions arrive as short cues (2–8 s each), often cutting sentences in half.
- Auto-captions have **no punctuation** and repeat rolling lines.
- A playlist can hold hundreds of videos; a chat may target one video or the whole playlist.
- Answers must cite a timestamp, so every chunk must keep `start_s`/`end_s`.

---

## 2. Ingestion pipeline

```
URL
 └─► parse (video id / playlist id)
     └─► metadata            yt-dlp extract_info(download=False)
         └─► cues            youtube-transcript-api → yt-dlp VTT fallback
             └─► clean       dedupe rolling captions (auto-captions only)
                 └─► windows     45 s windows, 35 s stride → 10 s overlap
                     └─► embed   OpenAI text-embedding-3-small, batches of 64
                         └─► insert chunks (+ tsv for BM25)
```

### 2.1 Cue cleaning

Minimal on purpose. Rolling duplicates are the only real problem, and only auto-captions have them. Whitespace and `[Music]` lines are cosmetic and stay.

```python
def clean_cues(cues, source):
    if source != "auto_captions":
        return list(cues)
    out, prev = [], None
    for c in cues:
        if c.text == prev:
            continue
        out.append(c)
        prev = c.text
    return out
```

### 2.2 Cues → time windows

Fixed windows, no sentence splitting. Chunk `n` covers `[start, start + 45)`, the next starts 35 s later, so every chunk shares 10 s with its predecessor.

```python
def build_chunks(cues, window=45, stride=35):
    if not cues:
        return []
    last_end = max(c.end for c in cues)
    chunks, start = [], cues[0].start
    while start < last_end:
        end = min(start + window, last_end)
        text = " ".join(c.text for c in cues if start <= c.start < start + window).strip()
        if text:
            chunks.append(Chunk(text=text, start_s=start, end_s=end))
        start += stride
    return chunks
```

A sentence cut at a boundary is re-covered by the next chunk **if it starts inside the 10 s overlap and lasts ≤10 s**. Longer sentences can still split across both chunks — accepted tradeoff for the simpler implementation. Chunks are not topic-aligned, so one may mix the tail of a point with the start of the next.

### 2.4 Enrichment before embedding

Store display text clean; embed with a header so retrieval can disambiguate speakers and topics:

```python
embed_input = f"{video.title} — {mmss(start_s)}\n{chunk.text}"
```

---

## 3. Storage and scoping (video vs playlist)

Every chunk carries three keys: `user_id`, `video_id`, `playlist_id`.

```sql
create table chunks (
  id bigserial primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  video_id uuid not null references videos(id) on delete cascade,
  playlist_id uuid references playlists(id) on delete set null,   -- denormalized
  chunk_index int not null,
  text text not null,
  start_s numeric, end_s numeric,
  token_count int,
  content_hash text,                       -- skip re-embedding unchanged chunks
  embedding_model text not null default 'text-embedding-3-small',
  embedding vector(1536) not null,
  tsv tsvector generated always as (to_tsvector('english', text)) stored,
  unique (video_id, chunk_index)
);

create index chunks_embedding_idx on chunks using hnsw (embedding vector_cosine_ops);
create index chunks_tsv_idx       on chunks using gin (tsv);
create index chunks_user_idx      on chunks (user_id);
create index chunks_video_idx     on chunks (video_id);
create index chunks_playlist_idx  on chunks (playlist_id);
```

**Scope is a `WHERE` clause, not a separate index/collection:**

| User intent | Predicate | Index used |
|---|---|---|
| Talk to one video inside a playlist | `video_id = :v` | `chunks_video_idx` |
| Talk to the whole playlist | `playlist_id = :p` | `chunks_playlist_idx` |
| Talk across the library | `user_id = :me` | `chunks_user_idx` |

Request shape: `POST /chat { message, scope: "video"|"playlist"|"library", scope_id? }`. The backend maps scope → predicate; the client never sends a raw SQL fragment.

Why this beats per-playlist collections (Chroma/Qdrant style): no duplication when a video belongs to several playlists, no re-index when membership changes, and a plain `UPDATE chunks SET playlist_id = ... WHERE video_id = ...` re-scopes a video instantly.

If a single playlist ever exceeds tens of millions of chunks, add `PARTITION BY HASH (playlist_id)` — not needed before then.

---

## 4. Retrieval options

| Strategy | Strength | Weakness | Verdict |
|---|---|---|---|
| Dense only (pgvector cosine) | paraphrase, synonyms, "how does it work" questions | misses exact names, acronyms, numbers, code identifiers; weakest on short keyword queries | baseline, not enough alone |
| BM25 only (Postgres FTS / `pg_search`) | exact terms, names, jargon, timestamps | fails on paraphrases and spoken-word variation | good complement |
| **Hybrid + RRF fusion** | best of both; robust to both query styles | two queries, slightly more code | **recommended** |
| + cross-encoder rerank | fixes ordering in the top 20 | extra latency/model cost | v1.1 |

Transcripts are spoken text full of proper nouns ("Karpathy", "HNSW", "RLHF") — dense embeddings routinely miss those, and BM25 nails them. HyDE/query expansion is the alternative, but hybrid is cheaper and more predictable.

### 4.1 Hybrid query with Reciprocal Rank Fusion

```sql
with sem as (
  select c.id, row_number() over (order by c.embedding <=> :qvec) as rnk
  from chunks c
  where c.user_id = :me
    and (:video_id    is null or c.video_id    = :video_id)
    and (:playlist_id is null or c.playlist_id = :playlist_id)
  order by c.embedding <=> :qvec
  limit 40
),
lex as (
  select c.id, row_number() over (
           order by ts_rank_cd(c.tsv, websearch_to_tsquery('english', :q)) desc) as rnk
  from chunks c
  where c.user_id = :me
    and (:video_id    is null or c.video_id    = :video_id)
    and (:playlist_id is null or c.playlist_id = :playlist_id)
    and c.tsv @@ websearch_to_tsquery('english', :q)
  limit 40
),
fused as (
  select id, sum(1.0 / (60 + rnk)) as score          -- RRF, k = 60
  from (select id, rnk from sem union all select id, rnk from lex) u
  group by id
)
select c.id, c.text, c.start_s, c.end_s, v.youtube_video_id, v.title, f.score
from fused f join chunks c on c.id = f.id join videos v on v.id = c.video_id
order by f.score desc
limit 12;
```

Notes:
- `ts_rank_cd` is a TF-IDF-like rank, **not true BM25**. For real BM25 use the `pg_search` extension (ParadeDB) or `rank_bm25` in Python over the already-scoped candidate set (fine for one video/playlist, where a few thousand chunks fit in memory).
- HNSW + filter can under-return; run `set local hnsw.ef_search = 100` and optionally `hnsw.iterative_scan = relaxed_order` (pgvector ≥ 0.8), or over-fetch 100 and cut to 12.
- For playlist-wide questions, cap chunks per video (e.g. max 3 of the 12) so one long video can't monopolize the context.

### 4.2 Reranking (v1.1)

Take the fused top 20, rerank to 6:

- `BAAI/bge-reranker-v2-m3` via `sentence-transformers` (local, ~600 MB, ~50–100 ms for 20 pairs), or
- Cohere Rerank (hosted, cheap per call), or
- LLM listwise rerank with `gpt-4o-mini` returning ordered IDs.

Reranking typically buys 5–15 nDCG points on transcript-style text, more than any chunk-size tweak.

### 4.3 Query expansion (optional, gated)

- Always cheap: lowercase, strip filler ("can you tell me…"), expand known domain acronyms.
- One LLM call → 3 paraphrases + keyword list; run hybrid per variant and RRF across all variants.
- Gate it: only when the query is < 5 tokens or the top fused score is below a threshold. Otherwise it adds latency for no gain.

---

## 5. Hierarchical index (playlist → video → section → chunk)

Useful for playlists (and for the assignment's point 2), overkill for a single video.

```
playlist (root)
└── video                      summary, embedding over summary
    └── section / chapter      YT chapters if present, else 8–12 min time blocks
        └── chunk              45 s leaf
```

```sql
create table sections (
  id uuid primary key,
  user_id uuid not null,
  playlist_id uuid references playlists(id) on delete cascade,
  video_id uuid not null references videos(id) on delete cascade,
  parent_id uuid references sections(id) on delete cascade,   -- video node
  kind text not null,                -- 'video' | 'chapter' | 'block'
  title text,
  start_s numeric, end_s numeric,
  summary text,
  embedding vector(1536)             -- embedding of the summary
);
alter table chunks add column section_id uuid references sections(id);
```

Two-stage retrieval:

1. **Route:** embed the question, match against `sections.embedding` (video/chapter summaries) filtered to the playlist → keep the top 3 sections.
2. **Drill:** run hybrid retrieval only inside `section_id IN (...)`.

Benefits: fewer wasted chunks, better "which video covers X" answers, and a natural map-reduce path for playlist-wide questions (summarize per video → synthesize). Cost: one summarization call per chapter at ingest (~free with `gpt-4o-mini`).

YouTube chapters come from `yt-dlp`'s `chapters` key when the uploader defined them; otherwise fall back to fixed time blocks or topic segmentation.

---

## 6. Mapping the LLM assignment to this project

| Assignment point | Adapted to yt_bot | Verdict |
|---|---|---|
| **2. Hierarchical tree indexing** (book → chapter → section → chunk) | playlist → video → chapter/section → 45 s chunk, `sections` table + summary embeddings | **Yes, for playlists.** Root = playlist instead of textbook. Skip for single videos. |
| **3. Query expansion** | LLM rewrite + keyword extraction, gated by short/low-confidence queries | **Yes, optional.** Small quality win, small latency cost. |
| **3. Hybrid retrieval** (BM25 + dense) | Postgres FTS (`ts_rank_cd`) or `pg_search` BM25 + pgvector, fused with RRF | **Yes, recommended for v1.** Same DB, no extra service. |
| **3. Re-ranking** | cross-encoder or Cohere over the fused top 20 | **Yes, v1.1.** Highest ROI after hybrid. |
| **3. Evaluation** | labeled Q/A set (30–50 per video), Recall@k / MRR / nDCG@10, ablation table | **Yes — and do it.** It's how you justify 45 s windows and hybrid over dense-only. |
| **4. Multi-document retrieval** | playlist scope = multi-video; per-video chunk cap; map-reduce summaries for cross-video questions | **Yes.** This is exactly the playlist use case. |
| **4. Hierarchical traversal** | route at video/chapter level, then chunk-level hybrid inside those sections | **Yes for playlists**, skip for single video. |
| **4. Grounded generation** | prompt restricted to excerpts, refuse when absent, per-answer citations with timestamps | **Already in the design.** Timestamps are stronger than chapter citations. |

What does **not** transfer: 300-page PDF extraction, fixed chapter structure (YouTube chapters are often missing), and page-number citations. Everything else ports almost directly — the assignment is essentially the same RAG problem with a different corpus.

---

## 7. Evaluation plan (small, but do it)

1. Pick 3 videos of different styles (lecture, interview, tutorial).
2. Write 20 questions each, with the correct `(video_id, timestamp)` as the gold answer.
3. Measure, per configuration: Recall@8 (was a correct chunk retrieved), MRR, nDCG@10.
4. Ablations: 30 s / 45 s / 60 s windows · dense only · BM25 only · hybrid · hybrid+rerank · with/without query expansion.
5. Keep the table in `docs/` — it doubles as the assignment's "document your findings" section.

Cheap sanity checks before the full eval:
- Ask something answerable only at a known timestamp → citation within ±30 s.
- Ask something absent → model must refuse.
- Search an exact proper noun → BM25 leg must surface it.
- Ask a paraphrase with no shared keywords → dense leg must surface it.

---

## 8. Pitfalls

1. **Chunk by time, not by characters** — character offsets carry no timestamps, so citations become unusable.
2. **Auto-captions need cleaning before embedding** — rolling duplicates inflate similarity scores and waste context.
3. **Re-ingest must delete old chunks** in the same transaction, keyed by `video_id`, or duplicates silently accumulate (the unique index helps, but stale chunks from a longer old transcript remain).
4. **Filtered ANN under-return** — always over-fetch and verify with `EXPLAIN ANALYZE`.
5. **Cap chunks per video** in playlist scope, or the longest video wins every query.
6. **Store `embedding_model`** on every chunk; a future model swap must be detectable, not guessable.
