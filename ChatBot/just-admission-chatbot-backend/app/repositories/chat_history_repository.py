from typing import Any

from pymongo import MongoClient
from pymongo.collection import Collection


class ChatHistoryRepository:
    def __init__(
        self,
        mongodb_uri: str,
        database_name: str,
        collection_name: str = "chat_history",
    ) -> None:
        self.client: MongoClient = MongoClient(mongodb_uri)
        self.database = self.client[database_name]
        self.collection: Collection = self.database[collection_name]

    def insert_chat_record(self, record: dict[str, Any]) -> str:
        result = self.collection.insert_one(record)
        return str(result.inserted_id)

    def count_records(self) -> int:
        return int(self.collection.count_documents({}))

    def get_latest_records(self, limit: int = 10) -> list[dict[str, Any]]:
        records = self.collection.find().sort("created_at", -1).limit(limit)
        return list(records)

    def delete_all_records(self) -> int:
        result = self.collection.delete_many({})
        return int(result.deleted_count)