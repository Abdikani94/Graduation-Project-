from datetime import UTC, datetime

from pydantic import BaseModel, Field


class ChatHistoryCreate(BaseModel):
    question: str = Field(min_length=1)
    answer: str = Field(min_length=1)
    context_found: bool
    retrieved_source_ids: list[int]
    retrieved_categories: list[str]
    model_name: str = Field(min_length=1)


class ChatHistoryRecord(ChatHistoryCreate):
    id: str
    created_at: datetime


def build_chat_history_record(
    question: str,
    answer: str,
    context_found: bool,
    retrieved_source_ids: list[int],
    retrieved_categories: list[str],
    model_name: str,
) -> dict:
    record = ChatHistoryCreate(
        question=question,
        answer=answer,
        context_found=context_found,
        retrieved_source_ids=retrieved_source_ids,
        retrieved_categories=retrieved_categories,
        model_name=model_name,
    )

    data = record.model_dump()
    data["created_at"] = datetime.now(UTC)

    return data