from app.core.config import get_settings
from app.services.retrieval.retrieval_service import RetrievalService


def test_retrieval_service_finds_medicine_monthly_fee() -> None:
    settings = get_settings()

    service = RetrievalService(
        chroma_db_path=settings.chroma_db_path,
        collection_name=settings.chroma_collection_name,
        embedding_model_name=settings.embedding_model_name,
    )

    result = service.retrieve("Medicine monthly fee waa imisa?", top_k=3)

    assert result.total_results == 3

    top_result = result.results[0]

    assert "Medicine" in top_result.question or "Medicine" in top_result.answer
    assert "$120" in top_result.answer
    assert top_result.category == "Fees"