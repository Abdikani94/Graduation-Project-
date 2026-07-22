from pydantic import BaseModel, Field


class KnowledgeDocument(BaseModel):
    id: str = Field(min_length=1)
    question: str = Field(min_length=1)
    answer: str = Field(min_length=1)
    category: str = Field(min_length=1)
    content: str = Field(min_length=1)
    metadata: dict[str, str | int]