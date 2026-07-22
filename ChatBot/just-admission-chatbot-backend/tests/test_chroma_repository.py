from app.core.config import get_settings
from app.repositories.chroma_repository import ChromaRepository


def test_chroma_collection_contains_indexed_documents() -> None:
    settings = get_settings()

    repository = ChromaRepository(
        db_path=settings.chroma_db_path,
        collection_name=settings.chroma_collection_name,
    )

    assert repository.get_collection().name == settings.chroma_collection_name
    assert repository.count_documents() == 800