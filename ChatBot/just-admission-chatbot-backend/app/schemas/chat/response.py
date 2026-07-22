from pydantic import BaseModel, Field

from app.schemas.retrieval.result import RetrievedDocument


class ChatResponse(BaseModel):
    question: str = Field(min_length=1)
    answer: str = Field(min_length=1)
    context_found: bool
    retrieved_documents: list[RetrievedDocument]