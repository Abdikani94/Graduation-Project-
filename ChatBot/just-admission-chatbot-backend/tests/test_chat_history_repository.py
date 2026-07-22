from app.core.config import get_settings
from app.repositories.chat_history_repository import ChatHistoryRepository
from app.schemas.chat.history import build_chat_history_record


def test_chat_history_repository_inserts_and_reads_record() -> None:
    settings = get_settings()

    repository = ChatHistoryRepository(
        mongodb_uri=settings.mongodb_uri,
        database_name=settings.mongodb_database,
        collection_name="chat_history_test",
    )

    repository.delete_all_records()

    record = build_chat_history_record(
        question="Medicine monthly fee waa imisa?",
        answer="Medicine monthly fee waa $120.",
        context_found=True,
        retrieved_source_ids=[535, 755, 533],
        retrieved_categories=["Fees"],
        model_name=settings.gemini_model_name,
    )

    inserted_id = repository.insert_chat_record(record)

    assert inserted_id
    assert repository.count_records() == 1

    latest_records = repository.get_latest_records(limit=1)

    assert len(latest_records) == 1
    assert latest_records[0]["question"] == "Medicine monthly fee waa imisa?"
    assert latest_records[0]["answer"] == "Medicine monthly fee waa $120."
    assert latest_records[0]["context_found"] is True
    assert latest_records[0]["retrieved_source_ids"] == [535, 755, 533]
    assert latest_records[0]["retrieved_categories"] == ["Fees"]

    repository.delete_all_records()