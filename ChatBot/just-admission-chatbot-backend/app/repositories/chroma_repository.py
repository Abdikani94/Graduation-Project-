from pathlib import Path

import chromadb
from chromadb.api.models.Collection import Collection


class ChromaRepository:
    def __init__(self, db_path: str, collection_name: str) -> None:
        self.db_path = Path(db_path)
        self.collection_name = collection_name

        self.db_path.mkdir(parents=True, exist_ok=True)

        self.client = chromadb.PersistentClient(path=str(self.db_path))
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"description": "JUST admission chatbot knowledge base"},
        )

    def get_collection(self) -> Collection:
        return self.collection

    def count_documents(self) -> int:
        return int(self.collection.count())

    def reset_collection(self) -> None:
        self.client.delete_collection(name=self.collection_name)
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"description": "JUST admission chatbot knowledge base"},
        )