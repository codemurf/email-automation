import asyncio
import json
from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

router = APIRouter()

# Mock Agent Registry
AGENTS = [
    {"agent_id": "coordinator", "name": "Coordinator Agent", "role": "Orchestrator", "status": "idle", "progress": 0, "logs": [], "current_task": "Waiting for workflow"},
    {"agent_id": "email-reader", "name": "Email Reader", "role": "Ingestion", "status": "idle", "progress": 0, "logs": [], "current_task": "Idle"},
    {"agent_id": "summarizer", "name": "Summarizer Agent", "role": "Analysis", "status": "idle", "progress": 0, "logs": [], "current_task": "Idle"},
    {"agent_id": "reply-writer", "name": "Reply Writer", "role": "Generation", "status": "idle", "progress": 0, "logs": [], "current_task": "Idle"},
]

@router.get("/status")
async def get_agent_status():
    return {"status": "success", "agents": AGENTS}

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
            # In a real app, this would listen to a redis queue or internal event bus
            if random.random() < 0.1:
                agent = random.choice(AGENTS)
                update = {
                    "type": "status",
                    "data": {
                        "agents": AGENTS  # Should technically update state here
                    }
                }
                yield {
                    "event": "message",
                    "data": json.dumps(update)
                }
    
    return EventSourceResponse(event_generator())

import random
