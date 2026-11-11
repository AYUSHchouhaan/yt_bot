import pytest

from app.services.youtube import Cue, clean_cues, parse_vtt, parse_youtube_url


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        ("https://www.youtube.com/watch?v=aircAruvnKk", "aircAruvnKk"),
        ("https://www.youtube.com/watch?v=aircAruvnKk&t=30s", "aircAruvnKk"),
        ("https://youtu.be/aircAruvnKk?t=10", "aircAruvnKk"),
        ("https://www.youtube.com/shorts/aircAruvnKk", "aircAruvnKk"),
        ("https://www.youtube.com/embed/aircAruvnKk", "aircAruvnKk"),
        ("https://example.com/watch?v=aircAruvnKk", None),
    ],
)
def test_parse_youtube_url(url: str, expected: str | None) -> None:
    assert parse_youtube_url(url) == expected


def test_parse_vtt_strips_tags_and_unescapes_text() -> None:
    content = """WEBVTT
Kind: captions
Language: en

00:00:00.000 --> 00:00:05.000 align:start position:0%
Hello <c>world</c>

00:00:05.000 --> 00:00:10.000
Second &amp; last
"""
    cues = parse_vtt(content)
    assert cues == [
        Cue(start=0.0, end=5.0, text="Hello world"),
        Cue(start=5.0, end=10.0, text="Second & last"),
    ]


def test_clean_cues_dedupes_only_auto_captions() -> None:
    repeated = [
        Cue(start=0, end=1, text="hello there"),
        Cue(start=1, end=2, text="hello there"),
        Cue(start=2, end=3, text="general kenobi"),
    ]
    assert clean_cues(repeated, "auto_captions") == [repeated[0], repeated[2]]
    assert clean_cues(repeated, "captions") == repeated
