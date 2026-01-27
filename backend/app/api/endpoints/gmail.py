from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.services.gmail_service import gmail_service
from app.services.ai_service import ai_service
from app.database import get_db
from app.models import SentEmail

router = APIRouter()

class ReplyRequest(BaseModel):
    email_id: str
    content: Optional[str] = None
    tone: Optional[str] = "professional"
    # Optional fields for saving to database
    original_from: Optional[str] = None
    original_subject: Optional[str] = None

@router.get("/emails")
async def get_emails(db: AsyncSession = Depends(get_db)):
    """Fetch emails from Gmail (or mock if not connected) with sent status"""
    emails = await gmail_service.fetch_emails()
    
    # Get list of sent email IDs from database
    result = await db.execute(select(SentEmail.email_id))
    sent_email_ids = [row[0] for row in result.fetchall()]
    
    # Mark emails that have been replied to
    for email in emails:
        if email.get("id") in sent_email_ids:
            email["columnId"] = "sent"
    
    return {"status": "success", "emails": emails, "mock_mode": gmail_service.mock_mode}

@router.get("/sent-emails")
async def get_sent_emails(db: AsyncSession = Depends(get_db)):
    """Get list of sent email IDs for Kanban board"""
    result = await db.execute(select(SentEmail))
    sent_emails = result.scalars().all()
    return {
        "status": "success",
        "sent_emails": [e.to_dict() for e in sent_emails],
        "sent_email_ids": [e.email_id for e in sent_emails]
    }

@router.post("/reply")
async def reply_email(request: ReplyRequest, db: AsyncSession = Depends(get_db)):
    """Generate AI reply and send to email"""
    
    print(f"Reply request received - email_id: {request.email_id}, content: '{request.content}', tone: {request.tone}")
    
    # Get the email to reply to for context
    emails = await gmail_service.fetch_emails()
    email = next((e for e in emails if e["id"] == request.email_id), None)
    
    original_from = request.original_from or (email.get("from", "") if email else "")
    original_subject = request.original_subject or (email.get("subject", "") if email else "")
    
    # If no content provided or empty string, generate AI reply
    if not request.content or request.content.strip() == "":
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
        # Save to database
        try:
            # Check if already exists
            existing = await db.execute(
                select(SentEmail).where(SentEmail.email_id == request.email_id)
            )
            if not existing.scalar_one_or_none():
                sent_email = SentEmail(
                    email_id=request.email_id,
                    original_from=original_from,
                    original_subject=original_subject,
                    reply_content=request.content
                )
                db.add(sent_email)
                await db.commit()
                print(f"Saved sent email record for {request.email_id}")
        except Exception as e:
            print(f"Error saving sent email: {e}")
            # Don't fail the request if db save fails
        
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

