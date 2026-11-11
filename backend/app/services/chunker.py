from dataclasses import dataclass

from app.services.youtube import Cue


@dataclass
class Chunk:
    text: str
    start_s: float
    end_s: float


def build_chunks(
    cues: list[Cue], window: float = 45, stride: float = 35
) -> list[Chunk]:
    if not cues:
        return []

    last_end = max(cue.end for cue in cues)
    chunks: list[Chunk] = []
    start = cues[0].start

    while start < last_end:
        end = min(start + window, last_end)
        text = " ".join(
            cue.text for cue in cues if start <= cue.start < start + window
        ).strip()
        if text:
            chunks.append(Chunk(text=text, start_s=start, end_s=end))
        start += stride

    return chunks
