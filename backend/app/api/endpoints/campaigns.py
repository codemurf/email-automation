import csv
import io
import asyncio
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db, async_session_maker
from app.models import Campaign, Recipient, CampaignLog
from app.services.gmail_service import gmail_service
from app.services.ai_service import ai_service

router = APIRouter()


class CampaignCreate(BaseModel):
    name: str
    description: str = ""
    subject: str
    template: str
    tone: str = "professional"
    type: str = "email"


@router.post("/create")
async def create_campaign(campaign: CampaignCreate, db: AsyncSession = Depends(get_db)):
    """Create a new email campaign"""
    campaign_id = f"camp_{int(datetime.now().timestamp())}"
    
    new_campaign = Campaign(
        id=campaign_id,
        name=campaign.name,
        description=campaign.description,
        subject=campaign.subject,
        template=campaign.template,
        tone=campaign.tone,
        type=campaign.type,
        status="draft"
    )
    
    db.add(new_campaign)
    await db.commit()
    await db.refresh(new_campaign)
    
    return {"status": "success", "campaign": new_campaign.to_dict()}


@router.get("")
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    """List all campaigns"""
    result = await db.execute(
        select(Campaign)
        .options(selectinload(Campaign.recipients), selectinload(Campaign.logs))
        .order_by(Campaign.created_at.desc())
    )
    campaigns = result.scalars().all()
    return {"status": "success", "campaigns": [c.to_dict() for c in campaigns]}


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific campaign"""
    result = await db.execute(
        select(Campaign)
        .options(selectinload(Campaign.recipients), selectinload(Campaign.logs))
        .where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return {"status": "success", "campaign": campaign.to_dict()}


@router.post("/{campaign_id}/upload")
async def upload_recipients(
    campaign_id: str, 
    file: UploadFile = File(...), 
    db: AsyncSession = Depends(get_db)
):
    """Upload CSV file with recipient emails"""
    result = await db.execute(
        select(Campaign)
        .options(selectinload(Campaign.recipients), selectinload(Campaign.logs))
        .where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    content = await file.read()
    decoded = content.decode('utf-8')
    
    # Clear existing recipients
    for recipient in campaign.recipients:
        await db.delete(recipient)
    
    # Parse CSV and add new recipients
    reader = csv.DictReader(io.StringIO(decoded))
    recipients_count = 0
    
    for row in reader:
        email = row.get('email', row.get('Email', '')).strip()
        name = row.get('name', row.get('Name', '')).strip()
        
        if email and '@' in email:
            new_recipient = Recipient(
                campaign_id=campaign_id,
                email=email,
                name=name or email.split('@')[0].capitalize(),
                status="pending"
            )
            db.add(new_recipient)
            recipients_count += 1
    
    # Add log entry
    log = CampaignLog(
        campaign_id=campaign_id,
        message=f"Uploaded {recipients_count} recipients from {file.filename}"
    )
    db.add(log)
    
    await db.commit()
    
    # Refresh to get updated data
    await db.refresh(campaign)
    result = await db.execute(
        select(Campaign)
        .options(selectinload(Campaign.recipients), selectinload(Campaign.logs))
        .where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one()
    
    return {
        "status": "success",
        "recipients_count": recipients_count,
        "campaign": campaign.to_dict()
    }


@router.post("/{campaign_id}/start")
async def start_campaign(
    campaign_id: str, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Start sending emails for a campaign"""
    result = await db.execute(
        select(Campaign)
        .options(selectinload(Campaign.recipients), selectinload(Campaign.logs))
        .where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if len(campaign.recipients) == 0:
        raise HTTPException(status_code=400, detail="No recipients uploaded. Please upload a CSV file first.")
    
    if campaign.status == "active":
        raise HTTPException(status_code=400, detail="Campaign is already running")
    
    campaign.status = "active"
    log = CampaignLog(
        campaign_id=campaign_id,
        message=f"Campaign started. Sending to {len(campaign.recipients)} recipients."
    )
    db.add(log)
    await db.commit()
    
    # Start background task to send emails
    background_tasks.add_task(send_campaign_emails, campaign_id)
    
    await db.refresh(campaign)
    result = await db.execute(
        select(Campaign)
        .options(selectinload(Campaign.recipients), selectinload(Campaign.logs))
        .where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one()
    
    return {"status": "success", "message": "Campaign started", "campaign": campaign.to_dict()}


async def send_campaign_emails(campaign_id: str):
    """Background task to send emails for a campaign"""
    async with async_session_maker() as db:
        result = await db.execute(
            select(Campaign)
            .options(selectinload(Campaign.recipients), selectinload(Campaign.logs))
            .where(Campaign.id == campaign_id)
        )
        campaign = result.scalar_one_or_none()
        
        if not campaign:
            return
        
        for recipient in campaign.recipients:
            # Check if campaign is still active
            await db.refresh(campaign)
            if campaign.status != "active":
                break
            
            if recipient.status != "pending":
                continue
            
            try:
                # Replace template variables
                final_content = campaign.template.replace("{{name}}", recipient.name or "there")
                final_content = final_content.replace("{{email}}", recipient.email)
                
                # Send email via Gmail
                result = await gmail_service.send_email(
                    to=recipient.email,
                    subject=campaign.subject,
                    body=final_content
                )
                
                if result.get("success"):
                    recipient.status = "sent"
                    recipient.sent_at = datetime.utcnow()
                    campaign.sent += 1
                    
                    log = CampaignLog(
                        campaign_id=campaign_id,
                        message=f"✅ Sent to {recipient.email}"
                    )
                    db.add(log)
                else:
                    recipient.status = "failed"
                    recipient.error = result.get("error", "Unknown error")
                    campaign.failed += 1
                    
                    log = CampaignLog(
                        campaign_id=campaign_id,
                        message=f"❌ Failed to send to {recipient.email}: {recipient.error}"
                    )
                    db.add(log)
            
            except Exception as e:
                recipient.status = "failed"
                recipient.error = str(e)
                campaign.failed += 1
                
                log = CampaignLog(
                    campaign_id=campaign_id,
                    message=f"❌ Error sending to {recipient.email}: {str(e)}"
                )
                db.add(log)
            
            await db.commit()
            
            # Small delay between emails to avoid rate limiting
            await asyncio.sleep(1)
        
        # Mark campaign as completed
        await db.refresh(campaign)
        if campaign.status == "active":
            campaign.status = "completed"
            log = CampaignLog(
                campaign_id=campaign_id,
                message=f"Campaign completed. Sent: {campaign.sent}, Failed: {campaign.failed}"
            )
            db.add(log)
            await db.commit()


@router.post("/{campaign_id}/pause")
async def pause_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Pause a running campaign"""
    result = await db.execute(
        select(Campaign)
        .options(selectinload(Campaign.recipients), selectinload(Campaign.logs))
        .where(Campaign.id == campaign_id)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if campaign.status != "active":
        raise HTTPException(status_code=400, detail="Campaign is not running")
    
    campaign.status = "paused"
    log = CampaignLog(
        campaign_id=campaign_id,
        message="Campaign paused by user"
    )
    db.add(log)
    await db.commit()
    
    await db.refresh(campaign)
    
    return {"status": "success", "message": "Campaign paused", "campaign": campaign.to_dict()}


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a campaign"""
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    await db.delete(campaign)
    await db.commit()
    
    return {"status": "success", "message": "Campaign deleted"}
