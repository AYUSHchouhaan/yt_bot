# Step 05 — YouTube Transcript Setup

**Goal:** fetch a video's metadata and transcript, then build fixed 45 s chunks with a 10 s overlap. Pure data pipeline — no database writes yet.

**Prerequisite:** Step 04.

## What to implement

### `app/services/youtube.py`
- **`parse_youtube_url(url)`** — regex extract the 11-char video ID from `watch?v=`, `youtu.be/`, `shorts/`, `embed/` shapes.
- **`fetch_metadata(video_id)`** — use `yt_dlp.YoutubeDL` with `skip_download=True` to get title, channel, duration, thumbnail.
- **`fetch_transcript(video_id, languages)`** — try `YouTubeTranscriptApi().fetch()` first (returns cues with `start` + `duration`). Catch `NoTranscriptFound`/`TranscriptsDisabled` and fall back to `yt-dlp` auto-subs as VTT (`writeautomaticsub=True`, `subtitlesformat="vtt"`), then parse the VTT file's time ranges and text. Return `(cues, source)` where source is `"captions"` or `"auto_captions"`.
- **`clean_cues(cues, source)`** — minimal. Deduplicate consecutive identical lines **only when `source == "auto_captions"`**, because rolling captions repeat the previous line and would otherwise duplicate text inside chunks. Leave whitespace and `[Music]`/`[Applause]` lines alone — they are cosmetic and not worth filtering.
- Use a `Cue` dataclass with `start`, `end`, `text`.

### `app/services/chunker.py`
- **`build_chunks(cues, window=45, stride=35)`** — fixed-time windows over the cue list. Start at the first cue's `start`; each chunk covers `[t, t + window)`, and the next window starts at `t + stride`. Select the cues whose start falls inside the window, join their text, and emit a `Chunk(text, start_s=t, end_s=min(t + window, last_cue_end))`. Skip windows with no text.
- No sentence splitting or offset mapping. The overlap is what re-covers a sentence cut at a window boundary.

### Overlap rule

- Chunk 1 `[0, 45]` → chunk 2 starts at `35` → chunk 3 at `70`. Overlap is always `window − stride = 10 s`.
- A sentence that straddles a boundary is fully re-included in the next chunk **as long as it starts inside the 10 s overlap and lasts no more than 10 s**. A longer sentence can still be split across both chunks — accepted tradeoff for a simpler implementation.
- Chunks are not aligned to sentences or topics, so a chunk may mix the tail of one point with the start of the next.
- Expect ~100 chunks per hour of video.

### `app/services/__init__.py` — empty.

## How to test

- `tests/test_transcript_live.py` — an opt-in live test that fetches a known video (e.g. a 3Blue1Brown video) and prints cue count, chunk count, and the first 3 chunks with time ranges. Mark it `@pytest.mark.network` and skip unless `RUN_NETWORK_TESTS=1`, so the default `uv run pytest` stays offline.
- `tests/test_chunker.py` — unit tests for the chunker using synthetic cue fixtures (put the fixtures in `tests/fixtures/`, not inline scripts):
  - Every full chunk spans 45 s; the final chunk may be shorter and ends at the last cue's end.
  - Windows advance by a fixed 35 s, so consecutive chunks always overlap by exactly 10 s: `next.start_s − prev.start_s == 35`.
  - Chunk count is roughly 100 per hour (`3600 / stride`).
  - Only cues whose start falls inside the window are included; text is the joined cue text.
  - Empty windows are skipped, and an empty cue list returns no chunks.
  - Works identically with unpunctuated cues (auto-caption mode).
