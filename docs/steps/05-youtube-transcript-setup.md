# Step 05 — YouTube Transcript Setup

**Goal:** fetch a video's metadata and transcript, clean the cues, build sentence-aligned 45 s chunks. Pure data pipeline — no database writes yet.

**Prerequisite:** Step 04.

## What to implement

### `app/services/youtube.py`
- **`parse_youtube_url(url)`** — regex extract the 11-char video ID from `watch?v=`, `youtu.be/`, `shorts/`, `embed/` shapes.
- **`fetch_metadata(video_id)`** — use `yt_dlp.YoutubeDL` with `skip_download=True` to get title, channel, duration, thumbnail.
- **`fetch_transcript(video_id, languages)`** — try `YouTubeTranscriptApi().fetch()` first (returns cues with `start` + `duration`). Catch `NoTranscriptFound`/`TranscriptsDisabled` and fall back to `yt-dlp` auto-subs as VTT (`writeautomaticsub=True`, `subtitlesformat="vtt"`), then parse the VTT file's time ranges and text. Return `(cues, source)` where source is `"captions"` or `"auto_captions"`.
- **`clean_cues(cues)`** — strip extra whitespace, drop `[Music]`/`[Applause]` lines, deduplicate consecutive identical lines (auto-captions repeat rolling text).
- Use a `Cue` dataclass with `start`, `end`, `text`.

### `app/services/chunker.py`
- **`cues_to_sentences(cues)`** — two modes:
  - If the joined text has punctuation: concatenate all cues, build a char-offset-to-time map, split on `[.!?]`, map each sentence back to the first/last cue's timestamps.
  - If no punctuation (auto-captions): group consecutive cues into ~12 s pseudo-sentences on cue boundaries.
- **`build_chunks(sentences, target=45, lo=35, hi=55, overlap=10)`** — walk sentences, accumulate toward 45 s, guarantee ≥35 s, never exceed 55 s. Cut only on sentence boundaries. Skip chunks under 40 chars. Return `Chunk(text, start_s, end_s)` objects.

### Overlap rule (get this right)

- The next chunk starts **10 s before the previous chunk's end**, not at a fixed step. Step between starts ≈ chunk length − 10, so roughly 35–45 s.
- Example: chunk 1 `[0, 45]` → chunk 2 starts at **35** → chunk 3 starts at ~70. If chunk 1 is `[0, 55]`, chunk 2 starts at **45**.
- The 35–55 bounds constrain **length**, not the start offset. The overlap is always 10 s — never "10 or 20 depending".
- Sentence alignment nudges the start to the first sentence boundary at or after `end − 10`, so the real overlap is 10–15 s.
- Expect ~100 chunks per hour of video.

### `app/services/__init__.py` — empty.

## How to test

- `tests/test_transcript_live.py` — an opt-in live test that fetches a known video (e.g. a 3Blue1Brown video) and prints cue count, sentence count, chunk count, and the first 3 chunks with time ranges. Mark it `@pytest.mark.network` and skip unless `RUN_NETWORK_TESTS=1`, so the default `uv run pytest` stays offline.
- `tests/test_chunker.py` — unit tests for the chunker using synthetic cue fixtures (put the fixtures in `tests/fixtures/`, not inline scripts):
  - No chunk ends mid-sentence (every non-final chunk ends with `.`, `!`, or `?`).
  - Every chunk duration is between 30 and 60 s.
  - Consecutive chunks overlap by a constant ~10 s: `previous.end_s − next.start_s ≈ 10` (10–15 s after sentence alignment), not a varying 10–20 s.
  - Chunk count is roughly 100 per hour (step ≈ length − 10).
  - No chunk text is under 40 characters.
  - Works with unpunctuated cues (auto-caption mode) — still produces valid chunks.
