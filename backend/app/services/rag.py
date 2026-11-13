from typing import Any


def _mmss(seconds: float) -> str:
    total = int(seconds)
    return f"{total // 60}:{total % 60:02d}"


def build_context(hits: list[dict[str, Any]]) -> str:
    if not hits:
        return "No relevant transcript excerpts were found."

    blocks = []
    for i, hit in enumerate(hits, start=1):
        title = hit.get("title") or "Untitled video"
        blocks.append(f"[{i}] {title} @ {_mmss(hit['start_s'])}\n{hit['text']}")
    return "\n\n".join(blocks)


def build_citations(hits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "youtube_id": hit.get("youtube_id"),
            "title": hit.get("title"),
            "start_s": hit["start_s"],
            "score": hit.get("score"),
        }
        for hit in hits
    ]
