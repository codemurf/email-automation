from fastapi import APIRouter
from app.api.endpoints import gmail, agents, chat, auth

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(gmail.router, prefix="/integrations/gmail", tags=["gmail"])
api_router.include_router(agents.router, prefix="/agents", tags=["agents"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])

