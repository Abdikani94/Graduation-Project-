from app.core.config import get_settings
from app.core.logging import configure_logging
from app.services.chroma.indexing_service import ChromaIndexingService


def main() -> None:
    configure_logging()

    settings = get_settings()

    service = ChromaIndexingService(
        dataset_path=settings.dataset_path,
        chroma_db_path=settings.chroma_db_path,
        collection_name=settings.chroma_collection_name,
        embedding_model_name=settings.embedding_model_name,
    )

    report = service.index_documents(reset_collection=True)

    print(report.model_dump())

    if not report.success:
        raise SystemExit("ChromaDB indexing failed.")


if __name__ == "__main__":
    main()