from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_dataset_validation_endpoint() -> None:
    response = client.get("/api/v1/dataset/validate")

    assert response.status_code == 200

    data = response.json()

    assert data["total_records"] == 800
    assert data["columns_valid"] is True
    assert data["duplicate_ids"] == 0
    assert data["missing_values"] == 0
    assert data["empty_rows"] == 0
    assert data["ids_sequential"] is True
    assert data["ids_unique"] is True
    assert data["csv_readable"] is True
    assert data["utf8_compatible"] is True
    assert data["ready_for_chromadb"] is True