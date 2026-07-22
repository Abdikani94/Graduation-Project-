from pathlib import Path

from app.schemas.dataset.document import KnowledgeDocument
from app.services.dataset.loader import DatasetLoader


class DatasetDocumentBuilder:
    def __init__(self, dataset_path: str | Path) -> None:
        self.dataset_path = Path(dataset_path)
        self.loader = DatasetLoader(self.dataset_path)

    def build_documents(self) -> list[KnowledgeDocument]:
        validation_report = self.loader.validate()

        if not validation_report.ready_for_chromadb:
            raise ValueError(
                f"Dataset is not ready for ChromaDB: {validation_report.issues}"
            )

        dataframe = self.loader.load()
        documents: list[KnowledgeDocument] = []

        for record in dataframe.to_dict(orient="records"):
            source_id = int(record["id"])
            question = str(record["question"]).strip()
            answer = str(record["answer"]).strip()
            category = str(record["category"]).strip()

            content = f"Question: {question}\nAnswer: {answer}"

            document = KnowledgeDocument(
                id=str(source_id),
                question=question,
                answer=answer,
                category=category,
                content=content,
                metadata={
                    "source_id": source_id,
                    "category": category,
                },
            )

            documents.append(document)

        return documents