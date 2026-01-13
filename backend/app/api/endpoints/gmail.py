from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.gmail_service import gmail_service
from app.services.ai_service import ai_service

router = APIRouter()

class ReplyRequest(BaseModel):
    email_id: str
    content: Optional[str] = None
    tone: Optional[str] = "professional"

@router.get("/emails")
async def get_emails():
    """Fetch emails from Gmail (or mock if not connected)"""
    emails = await gmail_service.fetch_emails()
    return {"status": "success", "emails": emails, "mock_mode": gmail_service.mock_mode}

@router.post("/reply")
async def reply_email(request: ReplyRequest):
    """Generate AI reply and send to email"""
    
    print(f"Reply request received - email_id: {request.email_id}, content: '{request.content}', tone: {request.tone}")
    
    # If no content provided or empty string, generate AI reply
    if not request.content or request.content.strip() == "":
        # Get the email to reply to
        emails = await gmail_service.fetch_emails()
        email = next((e for e in emails if e["id"] == request.email_id), None)
        
        if email:
            print(f"Generating AI reply for email from: {email.get('from')}")
            # Generate AI reply
            generated_content = await ai_service.generate_email_reply(
                email_subject=email.get("subject", ""),
                email_body=email.get("body", email.get("snippet", "")),
                sender=email.get("from", ""),
                tone=request.tone or "professional"
            )
            request.content = generated_content
            print(f"Generated content: {request.content[:200]}...")
        else:
            request.content = "Thank you for your email. I have received it and will respond shortly.\n\nBest regards,\nAbhishek"
    
    print(f"Final content to send: {request.content[:200] if request.content else 'EMPTY'}...")
    
    # Send the reply
    result = await gmail_service.send_reply(request.email_id, request.content)
    
    if result.get("success"):
        return {
            "status": "success", 
            "message": "Reply sent", 
            "reply_content": request.content,
            "details": result
        }
    else:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed to send reply"))

@router.post("/generate-reply")
async def generate_reply(email_id: str, tone: str = "professional"):
    """Generate an AI reply without sending"""
    emails = await gmail_service.fetch_emails()
    email = next((e for e in emails if e["id"] == email_id), None)
    
    if not email:
        raise HTTPException(status_code=404, detail="Email not found")
    
    reply_content = await ai_service.generate_email_reply(
        email_subject=email.get("subject", ""),
        email_body=email.get("body", email.get("snippet", "")),
        sender=email.get("from", ""),
        tone=tone
    )
    
    return {
        "status": "success",
        "reply_content": reply_content,
        "email_id": email_id
    }

@router.get("/status")
async def gmail_status():
    """Check if Gmail is connected"""
    return {
        "connected": gmail_service.is_connected(),
        "mock_mode": gmail_service.mock_mode
    }
