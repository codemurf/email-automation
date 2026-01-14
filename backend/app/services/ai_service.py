import os
import aiohttp
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

class AIService:
    def __init__(self):
        self.api_key = os.getenv("ZAI_API_KEY")
        self.base_url = "https://api.z.ai/api/coding/paas/v4"
        self.model = os.getenv("ZAI_MODEL", "GLM-4.7")

    async def generate_email_reply(self, email_subject: str, email_body: str, sender: str, tone: str = "professional") -> str:
        """Generate an AI reply to an email using Z.AI"""
        
        # Extract sender's first name from email (e.g., "John Doe <john@example.com>" -> "John")
        import re
        sender_name = "there"  # Default fallback
        
        # Try to extract name from format "Name <email@example.com>"
        name_match = re.match(r'^([^<]+)', sender)
        if name_match:
            full_name = name_match.group(1).strip().strip('"')
            if full_name and '@' not in full_name:
                sender_name = full_name.split()[0]  # Get first name only
        
        # If still no name, try to extract from email prefix
        if sender_name == "there":
            email_match = re.search(r'([a-zA-Z0-9._%+-]+)@', sender)
            if email_match:
                email_prefix = email_match.group(1)
                # Capitalize first letter of email prefix
                sender_name = email_prefix.split('.')[0].capitalize()
        
        if not self.api_key:
            return f"Hi {sender_name},\n\nThank you for your email regarding '{email_subject}'. I have received it and will respond shortly.\n\nBest regards,\nAbhishek"
        
        prompt = f"""You are an AI email assistant writing emails on behalf of Abhishek. Generate a {tone}, helpful reply to the following email.

From: {sender}
Subject: {email_subject}
Content: {email_body}

Write a concise reply that:
1. Starts with "Hi {sender_name}," as the greeting
2. Acknowledges the email content
3. Addresses any questions or concerns
4. Matches the requested tone: {tone}
5. Is not too long (2-4 paragraphs max)
6. Ends with a sign-off like "Best regards,\nAbhishek"

Reply:"""

        try:
            print(f"Calling Z.AI API with model: {self.model}")
            print(f"API Key present: {bool(self.api_key)}")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "user", "content": f"Write a short {tone} email reply to this email. From: {sender}, Subject: {email_subject}, Body: {email_body[:200]}. Sign as Abhishek. Just give me the reply text, nothing else."}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 2000
                    }
                ) as response:
                    response_text = await response.text()
                    print(f"Z.AI Response status: {response.status}")
                    print(f"Z.AI Response body: {response_text[:500]}")
                    
                    if response.status == 200:
                        import json
                        data = json.loads(response_text)
                        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        if content:
                            return content.strip()
                        else:
                            print("WARNING: AI returned empty content, using fallback")
                            return f"Hi {sender_name},\n\nThank you for your email regarding '{email_subject}'. I have received it and will respond shortly.\n\nBest regards,\nAbhishek"
                    else:
                        print(f"AI API Error: {response.status} - {response_text[:200]}")
                        return f"Hi {sender_name},\n\nThank you for your email regarding '{email_subject}'. I have received it and will respond shortly.\n\nBest regards,\nAbhishek"
        except Exception as e:
            print(f"AI Generation Error: {e}")
            return f"Hi {sender_name},\n\nThank you for your email regarding '{email_subject}'. I have received it and will respond shortly.\n\nBest regards,\nAbhishek"

    async def chat(self, message: str) -> str:
        """General chat with AI for the chat assistant"""
        
        if not self.api_key:
            return "I'm your AI assistant. How can I help you with your emails today?"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": "You are MailGen, an AI email assistant. Help users manage their inbox, summarize emails, draft replies, and answer questions about email management. Be concise and helpful."},
                            {"role": "user", "content": message}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1000
                    }
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data["choices"][0]["message"]["content"].strip()
                    else:
                        return "I'm having trouble connecting right now. Please try again."
        except Exception as e:
            print(f"Chat Error: {e}")
            return "I'm having trouble connecting right now. Please try again."

    async def chat_with_context(self, message: str, email_context: str) -> str:
        """Chat with AI including email context"""
        
        if not self.api_key:
            # Provide a helpful response even without API key
            return f"Based on your emails, here's a summary:\n\n{email_context}\n\nNote: Connect your AI API key for more detailed analysis."
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": f"You are MailGen, an AI email assistant. The user has asked about their emails. Here is the context of their recent emails:\n\n{email_context}\n\nHelp the user by analyzing, summarizing, or answering questions about these emails. Be concise and helpful."},
                            {"role": "user", "content": message}
                        ],
                        "temperature": 0.7,
                        "max_tokens": 1500
                    }
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data["choices"][0]["message"]["content"].strip()
                    else:
                        return f"I found your emails! Here's a quick overview:\n\n{email_context}"
        except Exception as e:
            print(f"Chat with context Error: {e}")
            return f"Here are your recent emails:\n\n{email_context}"


# Singleton instance
ai_service = AIService()
