"""
History Service - Hybrid storage using both file and database
For production, use database-only storage
"""
import json
import os
from datetime import datetime
from typing import List, Dict, Optional
import asyncio

HISTORY_FILE = "data/chat_history.json"


class HistoryService:
    def __init__(self):
        os.makedirs("data", exist_ok=True)
        if not os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "w") as f:
                json.dump([], f)

    def load_history(self) -> List[Dict]:
        """Load chat history from file (sync for backward compatibility)"""
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading history: {e}")
            return []

    async def load_history_from_db(self) -> List[Dict]:
        """Load chat history from database"""
        from app.database import async_session_maker
        from app.models import ChatMessage
        from sqlalchemy import select
        
        try:
            async with async_session_maker() as session:
                result = await session.execute(
                    select(ChatMessage).order_by(ChatMessage.timestamp.asc()).limit(100)
                )
                messages = result.scalars().all()
                return [m.to_dict() for m in messages]
        except Exception as e:
            print(f"Error loading history from DB: {e}")
            return self.load_history()  # Fallback to file

    def save_message(self, role: str, content: str, session_id: str = None):
        """Save a message to file (sync)"""
        try:
            history = self.load_history()
            history.append({
                "id": str(int(datetime.now().timestamp() * 1000)),
                "role": role,
                "content": content,
                "session_id": session_id,
                "timestamp": datetime.now().isoformat()
            })
            
            # Keep last 500 messages
            if len(history) > 500:
                history = history[-500:]
            
            with open(HISTORY_FILE, "w") as f:
                json.dump(history, f, indent=2)
                
            # Also save to database async
            asyncio.create_task(self._save_to_db(role, content, session_id))
        except Exception as e:
            print(f"Error saving history: {e}")

    async def _save_to_db(self, role: str, content: str, session_id: str = None):
        """Save message to database"""
        from app.database import async_session_maker
        from app.models import ChatMessage
        
        try:
            async with async_session_maker() as session:
                message = ChatMessage(role=role, content=content, session_id=session_id)
                session.add(message)
                await session.commit()
        except Exception as e:
            print(f"Error saving to DB: {e}")

    def get_recent_context(self, limit: int = 5) -> str:
        """Get recent messages as context string"""
        history = self.load_history()
        context = ""
        for msg in history[-limit:]:
            content = msg.get('content', '')
            if len(content) > 500:
                content = content[:500] + "..."
            context += f"{msg.get('role', 'user').upper()}: {content}\n"
        return context

    def clear_history(self):
        """Clear chat history from file"""
        with open(HISTORY_FILE, "w") as f:
            json.dump([], f)

    async def clear_history_db(self):
        """Clear chat history from database"""
        from app.database import async_session_maker
        from app.models import ChatMessage
        from sqlalchemy import delete
        
        try:
            async with async_session_maker() as session:
                await session.execute(delete(ChatMessage))
                await session.commit()
        except Exception as e:
            print(f"Error clearing DB history: {e}")


# Singleton
history_service = HistoryService()
