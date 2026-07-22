from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.config import Settings, get_settings
from app.schemas.retrieval.result import RetrievalResult
from app.services.retrieval.retrieval_service import RetrievalService

router = APIRouter(prefix="/retrieval", tags=["Retrieval"])


@router.get("/search", response_model=RetrievalResult)
def search_documents(
    query: str = Query(..., min_length=1),
    top_k: int = Query(default=5, ge=1, le=10),
    settings: Settings = Depends(get_settings),
) -> RetrievalResult:
    try:
        service = RetrievalService(
            chroma_db_path=settings.chroma_db_path,
            collection_name=settings.chroma_collection_name,
            embedding_model_name=settings.embedding_model_name,
        )

        return service.retrieve(query=query, top_k=top_k)

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error