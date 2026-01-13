from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai_service import ai_service

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.post("/")
async def chat(request: ChatRequest):
    """AI-powered chat endpoint using Z.AI"""
    response = await ai_service.chat(request.message)
    return {"response": response}
