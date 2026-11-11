import os

import pytest

from app.services.chunker import build_chunks
from app.services.youtube import clean_cues, fetch_transcript

pytestmark = pytest.mark.network


@pytest.mark.skipif(
    os.getenv("RUN_NETWORK_TESTS") != "1",
    reason="set RUN_NETWORK_TESTS=1 to run network tests",
)
def test_transcript_pipeline() -> None:
    cues, source = fetch_transcript("aircAruvnKk", ["en"])
    cues = clean_cues(cues, source)
    chunks = build_chunks(cues)

    print(f"source={source} cues={len(cues)} chunks={len(chunks)}")
    for chunk in chunks[:3]:
        print(f"[{chunk.start_s:.1f}-{chunk.end_s:.1f}] {chunk.text[:120]}")

    assert cues
    assert chunks
