import asyncio
import json
import random
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from typing import Optional

from app.services.ai_service import ai_service

router = APIRouter()

# Mock Agent Registry
AGENTS = [
    {"agent_id": "coordinator", "name": "Coordinator Agent", "role": "Orchestrator", "status": "idle", "progress": 0, "logs": [], "current_task": "Waiting for workflow"},
    {"agent_id": "email-reader", "name": "Email Reader", "role": "Ingestion", "status": "idle", "progress": 0, "logs": [], "current_task": "Idle"},
    {"agent_id": "summarizer", "name": "Summarizer Agent", "role": "Analysis", "status": "idle", "progress": 0, "logs": [], "current_task": "Idle"},
    {"agent_id": "reply-writer", "name": "Reply Writer", "role": "Generation", "status": "idle", "progress": 0, "logs": [], "current_task": "Idle"},
]

class ReplyRequest(BaseModel):
    email_subject: str
    email_body: str
    sender: str
    tone: str = "professional"

@router.get("/status")
async def get_agent_status():
    return {"status": "success", "agents": AGENTS}

@router.post("/reply/generate")
async def generate_reply(request: ReplyRequest):
    """Generate an AI reply for an email"""
    import asyncio
    
    # Simulate agent work
    AGENTS[3]["status"] = "working" # Reply Writer
    AGENTS[3]["current_task"] = f"Drafting reply to {request.sender}"
    AGENTS[3]["progress"] = 20
    
    # Generate content
    reply = await ai_service.generate_email_reply(
        request.email_subject,
        request.email_body,
        request.sender,
        request.tone
    )
    
    AGENTS[3]["progress"] = 100
    AGENTS[3]["status"] = "idle"
    AGENTS[3]["current_task"] = "Reply generated"
    
    return {"status": "success", "reply": reply}

@router.get("/events/stream")
async def message_stream():
    """Real-time SSE stream for agent updates"""
    async def event_generator():
        while True:
            # Check for disconnected client
            if await asyncio.sleep(1): # Heartbeat every 1s
                yield {
                    "event": "heartbeat",
                    "data": json.dumps({"type": "heartbeat", "timestamp": str(asyncio.get_event_loop().time())})
                }
            
            # Simulate random agent activity occasionally
            if random.random() < 0.1:
                agent = random.choice(AGENTS)
                update = {
                    "type": "status",
                    "data": {
                        "agents": AGENTS
                    }
                }
                yield {
                    "event": "message",
                    "data": json.dumps(update)
                }
    
    return EventSourceResponse(event_generator())
