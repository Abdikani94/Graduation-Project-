from fastapi import APIRouter

from app.api.v1.endpoints import chat, dataset, health, retrieval

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(dataset.router)
api_router.include_router(retrieval.router)
api_router.include_router(chat.router)