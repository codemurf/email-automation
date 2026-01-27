from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional

from app.database import get_db
from app.models import UserSettings

router = APIRouter()


class SettingUpdate(BaseModel):
    key: str
    value: str


class UserProfile(BaseModel):
    name: str
    email: Optional[str] = None


@router.get("")
async def get_all_settings(db: AsyncSession = Depends(get_db)):
    """Get all user settings"""
    result = await db.execute(select(UserSettings))
    settings = result.scalars().all()
    return {"status": "success", "settings": {s.key: s.value for s in settings}}


@router.get("/{key}")
async def get_setting(key: str, db: AsyncSession = Depends(get_db)):
    """Get a specific setting"""
    result = await db.execute(select(UserSettings).where(UserSettings.key == key))
    setting = result.scalar_one_or_none()
    
    if not setting:
        return {"status": "success", "value": None}
    
    return {"status": "success", "key": setting.key, "value": setting.value}


@router.post("")
async def update_setting(setting: SettingUpdate, db: AsyncSession = Depends(get_db)):
    """Update or create a setting"""
    result = await db.execute(select(UserSettings).where(UserSettings.key == setting.key))
    existing = result.scalar_one_or_none()
    
    if existing:
        existing.value = setting.value
    else:
        new_setting = UserSettings(key=setting.key, value=setting.value)
        db.add(new_setting)
    
    await db.commit()
    return {"status": "success", "key": setting.key, "value": setting.value}


@router.post("/profile")
async def update_profile(profile: UserProfile, db: AsyncSession = Depends(get_db)):
    """Update user profile (name and email)"""
    # Update name
    result = await db.execute(select(UserSettings).where(UserSettings.key == "user_name"))
    name_setting = result.scalar_one_or_none()
    
    if name_setting:
        name_setting.value = profile.name
    else:
        db.add(UserSettings(key="user_name", value=profile.name))
    
    # Update email if provided
    if profile.email:
        result = await db.execute(select(UserSettings).where(UserSettings.key == "user_email"))
        email_setting = result.scalar_one_or_none()
        
        if email_setting:
            email_setting.value = profile.email
        else:
            db.add(UserSettings(key="user_email", value=profile.email))
    
    await db.commit()
    return {"status": "success", "message": "Profile updated"}


@router.get("/profile/name")
async def get_user_name(db: AsyncSession = Depends(get_db)):
    """Get user's display name for email signatures"""
    result = await db.execute(select(UserSettings).where(UserSettings.key == "user_name"))
    setting = result.scalar_one_or_none()
    
    return {"status": "success", "name": setting.value if setting else "User"}


async def get_user_name_for_email(db: AsyncSession = None) -> str:
    """Helper function to get user name for email signatures"""
    from app.database import async_session_maker
    
    try:
        async with async_session_maker() as session:
            result = await session.execute(
                select(UserSettings).where(UserSettings.key == "user_name")
            )
            setting = result.scalar_one_or_none()
            return setting.value if setting else "User"
    except Exception as e:
        print(f"Error getting user name: {e}")
        return "User"
