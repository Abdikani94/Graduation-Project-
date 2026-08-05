from fastapi.testclient import TestClient

from app.main import app
from app.schemas.chat.response import ChatResponse
from app.schemas.retrieval.result import RetrievedDocument
from app.services.gemini.gemini_service import GeminiService

client = TestClient(app)


class FakeChatService:
    def __init__(self, *args, **kwargs) -> None:
        pass

    def ask(self, question: str, top_k: int = 5) -> ChatResponse:
        document = RetrievedDocument(
            id="535",
            question="Medicine monthly fee waa imisa?",
            answer="Medicine monthly fee waa $120.",
            category="Fees",
            content=(
                "Question: Medicine monthly fee waa imisa?\n"
                "Answer: Medicine monthly fee waa $120."
            ),
            distance=0.17,
            metadata={"source_id": 535, "category": "Fees"},
        )

        return ChatResponse(
            question=question,
            answer="Medicine monthly fee waa $120.",
            context_found=True,
            retrieved_documents=[document],
        )


def test_chat_endpoint_returns_grounded_answer(monkeypatch) -> None:
    monkeypatch.setattr(
        "app.api.v1.endpoints.chat.ChatService",
        FakeChatService,
    )

    response = client.post(
        "/api/v1/chat/ask",
        json={
            "question": "Medicine monthly fee waa imisa?",
            "top_k": 3,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["question"] == "Medicine monthly fee waa imisa?"
    assert data["answer"] == "Medicine monthly fee waa $120."
    assert data["context_found"] is True
    assert data["retrieved_documents"][0]["category"] == "Fees"
    assert "$120" in data["retrieved_documents"][0]["answer"]


def test_chatbot_works_without_gemini_api_key() -> None:
    service = GeminiService(
        api_key="",
        model_name="gemini-test",
        admission_contact_phone="618833500",
    )
    document = RetrievedDocument(
        id="1",
        question="Sidee loo codsadaa admission-ka?",
        answer="Buuxi foomka, geli dukumentiyada, kadib bixi lacagta diiwaangelinta.",
        category="Admission",
        content="Question: Sidee loo codsadaa?\nAnswer: Buuxi foomka.",
        distance=0.1,
        metadata={"source_id": 1},
    )

    answer = service.generate_answer(
        question="Sidee loo codsadaa admission-ka?",
        retrieved_documents=[document],
    )

    assert answer == document.answer
