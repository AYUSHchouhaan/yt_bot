from app.services.rag import build_citations, build_context


def test_build_context_empty() -> None:
    assert "No relevant" in build_context([])


def test_build_context_numbered_blocks() -> None:
    hits = [
        {
            "title": "Quantum Mechanics 101",
            "start_s": 125.0,
            "text": "The wave function collapses on measurement.",
        },
        {
            "title": "Physics Lab",
            "start_s": 7.0,
            "text": "Today we observe interference patterns.",
        },
    ]
    ctx = build_context(hits)
    assert "[1] Quantum Mechanics 101 @ 2:05" in ctx
    assert "The wave function collapses on measurement." in ctx
    assert "[2] Physics Lab @ 0:07" in ctx
    assert "Today we observe interference patterns." in ctx


def test_build_context_untitled_fallback() -> None:
    ctx = build_context([{"start_s": 0.0, "text": "hello"}])
    assert "Untitled video" in ctx


def test_build_citations() -> None:
    hits = [
        {
            "youtube_id": "abc123",
            "title": "Video A",
            "start_s": 60.0,
            "score": 0.9,
            "text": "irrelevant",
        },
        {
            "youtube_id": "def456",
            "title": "Video B",
            "start_s": 120.0,
            "score": 0.5,
            "text": "irrelevant",
        },
    ]
    citations = build_citations(hits)
    assert len(citations) == 2
    assert citations[0] == {
        "youtube_id": "abc123",
        "title": "Video A",
        "start_s": 60.0,
        "score": 0.9,
    }
    assert citations[1] == {
        "youtube_id": "def456",
        "title": "Video B",
        "start_s": 120.0,
        "score": 0.5,
    }
