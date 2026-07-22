from app.services.dataset.document_builder import DatasetDocumentBuilder


def test_document_builder_creates_chroma_ready_documents() -> None:
    documents = DatasetDocumentBuilder("data/just_dataset.csv").build_documents()

    assert len(documents) == 800

    first_document = documents[0]
    last_document = documents[-1]

    assert first_document.id == "1"
    assert last_document.id == "800"

    assert first_document.question
    assert first_document.answer
    assert first_document.category
    assert first_document.content.startswith("Question:")
    assert "Answer:" in first_document.content

    assert first_document.metadata["source_id"] == 1
    assert "category" in first_document.metadata