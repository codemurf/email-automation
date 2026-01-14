from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai_service import ai_service
from app.services.gmail_service import gmail_service

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.post("/")
async def chat(request: ChatRequest):
    """AI-powered chat endpoint with email context"""
    
    # Check if user is asking about emails
    email_keywords = ["email", "emails", "inbox", "mail", "summarize", "summary", "urgent", "unread", "work", "personal"]
    message_lower = request.message.lower()
    
    # If asking about emails, fetch them and include in context
    if any(keyword in message_lower for keyword in email_keywords):
        try:
            emails = await gmail_service.fetch_emails(max_results=15)
            
            if emails:
                # Build email context
                email_context = "Here are the user's recent emails:\n\n"
                for i, email in enumerate(emails[:10], 1):
                    email_context += f"{i}. From: {email.get('from', 'Unknown')}\n"
                    email_context += f"   Subject: {email.get('subject', 'No subject')}\n"
                    email_context += f"   Category: {email.get('category', 'unknown')}\n"
                    email_context += f"   Priority: {email.get('priority', 'medium')}\n"
                    email_context += f"   Preview: {email.get('snippet', '')[:100]}...\n\n"
                
                # Send to AI with email context
                response = await ai_service.chat_with_context(request.message, email_context)
                return {"response": response}
        except Exception as e:
            print(f"Error fetching emails for chat: {e}")
    
    # Regular chat without email context
    response = await ai_service.chat(request.message)
    return {"response": response}
