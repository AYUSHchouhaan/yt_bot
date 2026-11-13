import hashlib

from openai import OpenAI

from app.config import settings

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    client = _get_client()
    vectors: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = client.embeddings.create(
            model=settings.openai_embedding_model,
            input=batch,
        )
        vectors.extend(item.embedding for item in response.data)
    return vectors


def embed_query(text: str) -> list[float]:
    client = _get_client()
    response = client.embeddings.create(
        model=settings.openai_embedding_model,
        input=text,
    )
    return response.data[0].embedding
