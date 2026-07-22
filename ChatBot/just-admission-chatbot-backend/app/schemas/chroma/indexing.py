from pydantic import BaseModel, Field


class ChromaIndexingReport(BaseModel):
    collection_name: str
    documents_prepared: int = Field(ge=0)
    documents_indexed: int = Field(ge=0)
    collection_count: int = Field(ge=0)
    embedding_model_name: str
    reset_collection: bool
    success: bool
    issues: list[str]