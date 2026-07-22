import logging
from pathlib import Path

from app.repositories.chroma_repository import ChromaRepository
from app.schemas.chroma.indexing import ChromaIndexingReport
from app.services.dataset.document_builder import DatasetDocumentBuilder
from app.services.embedding.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class ChromaIndexingService:
    def __init__(
        self,
        dataset_path: str | Path,
        chroma_db_path: str,
        collection_name: str,
        embedding_model_name: str,
    ) -> None:
        self.dataset_path = Path(dataset_path)
        self.collection_name = collection_name
        self.embedding_model_name = embedding_model_name

        self.document_builder = DatasetDocumentBuilder(self.dataset_path)
        self.embedding_service = EmbeddingService(embedding_model_name)
        self.chroma_repository = ChromaRepository(
            db_path=chroma_db_path,
            collection_name=collection_name,
        )

    def index_documents(
        self,
        reset_collection: bool = True,
        batch_size: int = 100,
    ) -> ChromaIndexingReport:
        issues: list[str] = []

        try:
            documents = self.document_builder.build_documents()
            documents_prepared = len(documents)

            if reset_collection:
                logger.info("Resetting ChromaDB collection: %s", self.collection_name)
                self.chroma_repository.reset_collection()

            collection = self.chroma_repository.get_collection()

            documents_indexed = 0

            for start_index in range(0, documents_prepared, batch_size):
                batch = documents[start_index : start_index + batch_size]

                ids = [document.id for document in batch]
                contents = [document.content for document in batch]
                metadatas = [document.metadata for document in batch]

                embeddings = self.embedding_service.embed_texts(contents)

                collection.add(
                    ids=ids,
                    documents=contents,
                    metadatas=metadatas,
                    embeddings=embeddings,
                )

                documents_indexed += len(batch)

                logger.info(
                    "Indexed batch: %s/%s documents",
                    documents_indexed,
                    documents_prepared,
                )

            collection_count = self.chroma_repository.count_documents()

            success = (
                documents_prepared == 800
                and documents_indexed == 800
                and collection_count == 800
            )

            if not success:
                issues.append(
                    "Indexing completed, but document counts do not match expected 800."
                )

            return ChromaIndexingReport(
                collection_name=self.collection_name,
                documents_prepared=documents_prepared,
                documents_indexed=documents_indexed,
                collection_count=collection_count,
                embedding_model_name=self.embedding_model_name,
                reset_collection=reset_collection,
                success=success,
                issues=issues,
            )

        except Exception as error:
            logger.exception("ChromaDB indexing failed")

            return ChromaIndexingReport(
                collection_name=self.collection_name,
                documents_prepared=0,
                documents_indexed=0,
                collection_count=self.chroma_repository.count_documents(),
                embedding_model_name=self.embedding_model_name,
                reset_collection=reset_collection,
                success=False,
                issues=[str(error)],
            )