from fastapi import APIRouter, Depends, HTTPException

from app.core.config import Settings, get_settings
from app.schemas.chat.request import ChatRequest
from app.schemas.chat.response import ChatResponse
from app.services.chat.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/ask", response_model=ChatResponse)
def ask_chatbot(
    request: ChatRequest,
    settings: Settings = Depends(get_settings),
) -> ChatResponse:
    try:
        service = ChatService(
         chroma_db_path=settings.chroma_db_path,
         collection_name=settings.chroma_collection_name,
         embedding_model_name=settings.embedding_model_name,
         gemini_api_key=settings.gemini_api_key,
         gemini_model_name=settings.gemini_model_name,
         admission_contact_phone=settings.admission_contact_phone,
         mongodb_uri=settings.mongodb_uri,
         mongodb_database=settings.mongodb_database,
        
        )

        return service.ask(
            question=request.question,
            top_k=request.top_k,
        )

    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error