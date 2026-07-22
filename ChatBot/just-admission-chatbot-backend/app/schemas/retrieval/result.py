from pydantic import BaseModel, Field


class RetrievedDocument(BaseModel):
    id: str
    question: str
    answer: str
    category: str
    content: str
    distance: float | None = None
    metadata: dict[str, str | int | float | bool | None]


class RetrievalResult(BaseModel):
    query: str = Field(min_length=1)
    total_results: int = Field(ge=0)
    results: list[RetrievedDocument]