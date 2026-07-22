from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_retrieval_endpoint_returns_medicine_fee() -> None:
    response = client.get(
        "/api/v1/retrieval/search",
        params={
            "query": "Medicine monthly fee waa imisa?",
            "top_k": 3,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["query"] == "Medicine monthly fee waa imisa?"
    assert data["total_results"] == 3
    assert len(data["results"]) == 3

    top_result = data["results"][0]

    assert top_result["category"] == "Fees"
    assert "Medicine" in top_result["question"] or "Medicine" in top_result["answer"]
    assert "$120" in top_result["answer"]