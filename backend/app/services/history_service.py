import json
import os
from datetime import datetime
from typing import List, Dict

HISTORY_FILE = "data/chat_history.json"

class HistoryService:
    def __init__(self):
        os.makedirs("data", exist_ok=True)
        if not os.path.exists(HISTORY_FILE):
            with open(HISTORY_FILE, "w") as f:
                json.dump([], f)

    def load_history(self) -> List[Dict]:
        """Load full chat history"""
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading history: {e}")
            return []

    def save_message(self, role: str, content: str):
        """Save a new message to history"""
        try:
            history = self.load_history()
            history.append({
                "id": str(int(datetime.now().timestamp() * 1000)),
                "role": role,
                "content": content,
                "timestamp": datetime.now().isoformat()
            })
            
            # Keep last 500 messages to avoid huge files
            if len(history) > 500:
                history = history[-500:]
            
            with open(HISTORY_FILE, "w") as f:
                json.dump(history, f, indent=2)
        except Exception as e:
            print(f"Error saving history: {e}")

    def get_recent_context(self, limit: int = 5) -> str:
        """Get recent messages formatted as context string"""
        history = self.load_history()
        context = ""
        for msg in history[-limit:]:
            # Truncate very long messages in context to save tokens
            content = msg.get('content', '')
            if len(content) > 500:
                content = content[:500] + "..."
            context += f"{msg.get('role', 'user').upper()}: {content}\n"
        return context

    def clear_history(self):
        """Clear chat history"""
        with open(HISTORY_FILE, "w") as f:
            json.dump([], f)

history_service = HistoryService()
