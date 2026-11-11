import itertools
import json
from pathlib import Path

from app.services.chunker import build_chunks
from app.services.youtube import Cue

FIXTURES = Path(__file__).parent / "fixtures"


def load_cues(name: str) -> list[Cue]:
    data = json.loads((FIXTURES / name).read_text(encoding="utf-8"))
    return [Cue(start=item["start"], end=item["end"], text=item["text"]) for item in data]


def test_full_chunks_span_45s() -> None:
    chunks = build_chunks(load_cues("cues_punctuated.json"))
    assert len(chunks) == 5
    for chunk in chunks[:-1]:
        assert chunk.end_s - chunk.start_s == 45


def test_last_chunk_is_clamped_to_last_cue_end() -> None:
    chunks = build_chunks(load_cues("cues_punctuated.json"))
    assert chunks[-1].start_s == 140
    assert chunks[-1].end_s == 150


def test_chunks_overlap_by_exactly_10s() -> None:
    chunks = build_chunks(load_cues("cues_punctuated.json"))
    for previous, following in itertools.pairwise(chunks):
        assert following.start_s - previous.start_s == 35
        assert previous.end_s - following.start_s == 10


def test_chunk_text_joins_only_cues_inside_window() -> None:
    cues = load_cues("cues_punctuated.json")
    chunks = build_chunks(cues)
    expected = " ".join(cue.text for cue in cues if 0 <= cue.start < 45)
    assert chunks[0].text == expected


def test_empty_windows_are_skipped() -> None:
    cues = [Cue(start=0, end=2, text="first cue"), Cue(start=100, end=102, text="second cue")]
    chunks = build_chunks(cues)
    assert [chunk.start_s for chunk in chunks] == [0, 70]
    assert [chunk.text for chunk in chunks] == ["first cue", "second cue"]


def test_empty_cues_returns_no_chunks() -> None:
    assert build_chunks([]) == []


def test_unpunctuated_cues_produce_valid_chunks() -> None:
    chunks = build_chunks(load_cues("cues_unpunctuated.json"))
    assert len(chunks) == 5
    for previous, following in itertools.pairwise(chunks):
        assert following.start_s - previous.start_s == 35
    assert all(chunk.text for chunk in chunks)
