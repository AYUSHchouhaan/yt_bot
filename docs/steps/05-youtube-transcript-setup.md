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
- **`build_chunks(sentences, target=45, lo=35, hi=55, overlap=10)`** — walk sentences, accumulate toward 45 s, guarantee ≥35 s, never exceed 55 s. Cut only on sentence boundaries. Advance the start pointer with 10 s overlap (next chunk begins at the first sentence whose start is within 10 s of the previous chunk's end). Skip chunks under 40 chars. Return `Chunk(text, start_s, end_s)` objects.

### `app/services/__init__.py` — empty.

## How to test

- Write a `scripts/test_transcript.py` that fetches a known video (e.g. a 3Blue1Brown video), prints cue count, sentence count, chunk count, and the first 3 chunks with time ranges. Run with `uv run python scripts/test_transcript.py`.
- Write pytest unit tests for the chunker using synthetic cue fixtures:
  - No chunk ends mid-sentence (every non-final chunk ends with `.`, `!`, or `?`).
  - Every chunk duration is between 30 and 60 s.
  - Consecutive chunks overlap (next chunk's `start_s` ≤ previous chunk's `end_s`).
  - No chunk text is under 40 characters.
  - Works with unpunctuated cues (auto-caption mode) — still produces valid chunks.
