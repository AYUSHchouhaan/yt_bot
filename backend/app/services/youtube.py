import html
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path

import yt_dlp
from youtube_transcript_api import (
    NoTranscriptFound,
    TranscriptsDisabled,
    YouTubeTranscriptApi,
)

_VIDEO_URL = "https://www.youtube.com/watch?v={video_id}"
_PLAYLIST_URL = "https://www.youtube.com/playlist?list={playlist_id}"
_VIDEO_ID_PATTERN = re.compile(
    r"(?:youtu\.be/|youtube(?:-nocookie)?\.com/(?:watch\?[^#]*?\bv=|shorts/|embed/))"
    r"([A-Za-z0-9_-]{11})"
)
_PLAYLIST_ID_PATTERN = re.compile(r"[?&]list=([A-Za-z0-9_-]+)")
_VTT_TIMESTAMP = re.compile(r"(\d+:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d+:\d{2}:\d{2}\.\d{3})")
_VTT_TAG = re.compile(r"<[^>]+>")


@dataclass
class Cue:
    start: float
    end: float
    text: str


def parse_youtube_url(url: str) -> str | None:
    match = _VIDEO_ID_PATTERN.search(url)
    return match.group(1) if match else None


def parse_playlist_url(url: str) -> str | None:
    match = _PLAYLIST_ID_PATTERN.search(url)
    return match.group(1) if match else None


@dataclass
class PlaylistItem:
    youtube_video_id: str
    title: str | None = None


@dataclass
class PlaylistInfo:
    playlist_id: str
    title: str
    items: list[PlaylistItem]


def fetch_playlist(playlist_id: str) -> PlaylistInfo:
    options = {
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "extract_flat": "in_playlist",
    }
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(
            _PLAYLIST_URL.format(playlist_id=playlist_id), download=False
        )

    items: list[PlaylistItem] = []
    for entry in info.get("entries") or []:
        video_id = entry.get("id")
        if not video_id:
            continue
        items.append(PlaylistItem(youtube_video_id=video_id, title=entry.get("title")))

    return PlaylistInfo(
        playlist_id=playlist_id,
        title=info.get("title") or playlist_id,
        items=items,
    )


def fetch_metadata(video_id: str) -> dict:
    options = {"skip_download": True, "quiet": True, "no_warnings": True}
    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(_VIDEO_URL.format(video_id=video_id), download=False)
    return {
        "video_id": video_id,
        "title": info.get("title"),
        "channel": info.get("channel") or info.get("uploader"),
        "duration": info.get("duration"),
        "thumbnail": info.get("thumbnail"),
    }


def fetch_transcript(
    video_id: str, languages: list[str] | None = None
) -> tuple[list[Cue], str]:
    languages = languages or ["en"]
    try:
        fetched = YouTubeTranscriptApi().fetch(video_id, languages=languages)
    except (NoTranscriptFound, TranscriptsDisabled):
        return _fetch_auto_captions(video_id, languages), "auto_captions"

    cues = [
        Cue(
            start=float(snippet.start),
            end=float(snippet.start) + float(snippet.duration),
            text=snippet.text,
        )
        for snippet in fetched.snippets
    ]
    return cues, "captions"


def clean_cues(cues: list[Cue], source: str = "captions") -> list[Cue]:
    if source != "auto_captions":
        return list(cues)

    cleaned: list[Cue] = []
    previous: str | None = None
    for cue in cues:
        if cue.text == previous:
            continue
        cleaned.append(cue)
        previous = cue.text
    return cleaned


def parse_vtt(content: str) -> list[Cue]:
    cues: list[Cue] = []
    for block in re.split(r"\n\s*\n", content.strip()):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        timing_index = next((i for i, line in enumerate(lines) if "-->" in line), None)
        if timing_index is None:
            continue

        match = _VTT_TIMESTAMP.search(lines[timing_index])
        if match is None:
            continue

        text = " ".join(
            _clean_vtt_text(line) for line in lines[timing_index + 1 :]
        ).strip()
        if text:
            cues.append(
                Cue(
                    start=_parse_timestamp(match.group(1)),
                    end=_parse_timestamp(match.group(2)),
                    text=text,
                )
            )
    return cues


def _fetch_auto_captions(video_id: str, languages: list[str]) -> list[Cue]:
    with tempfile.TemporaryDirectory() as tmp:
        options = {
            "skip_download": True,
            "quiet": True,
            "no_warnings": True,
            "writesubtitles": False,
            "writeautomaticsub": True,
            "subtitleslangs": languages,
            "subtitlesformat": "vtt",
            "outtmpl": str(Path(tmp) / "%(id)s.%(ext)s"),
        }
        with yt_dlp.YoutubeDL(options) as ydl:
            ydl.download([_VIDEO_URL.format(video_id=video_id)])

        vtt_files = sorted(Path(tmp).glob("*.vtt"))
        if not vtt_files:
            raise RuntimeError(f"No transcript available for video {video_id}")
        return parse_vtt(vtt_files[0].read_text(encoding="utf-8"))


def _clean_vtt_text(text: str) -> str:
    return html.unescape(_VTT_TAG.sub("", text)).strip()


def _parse_timestamp(timestamp: str) -> float:
    hours, minutes, seconds = timestamp.split(":")
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
