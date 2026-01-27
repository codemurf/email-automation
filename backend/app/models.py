from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.database import Base


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class RecipientStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    template: Mapped[str] = mapped_column(Text, nullable=False)
    tone: Mapped[str] = mapped_column(String(50), default="professional")
    type: Mapped[str] = mapped_column(String(50), default="email")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    sent: Mapped[int] = mapped_column(Integer, default=0)
    opened: Mapped[int] = mapped_column(Integer, default=0)
    clicked: Mapped[int] = mapped_column(Integer, default=0)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    recipients: Mapped[List["Recipient"]] = relationship(
        "Recipient", back_populates="campaign", cascade="all, delete-orphan"
    )
    logs: Mapped[List["CampaignLog"]] = relationship(
        "CampaignLog", back_populates="campaign", cascade="all, delete-orphan"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "subject": self.subject,
            "template": self.template,
            "tone": self.tone,
            "type": self.type,
            "status": self.status,
            "sent": self.sent,
            "opened": self.opened,
            "clicked": self.clicked,
            "failed": self.failed,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "recipients": [r.to_dict() for r in self.recipients],
            "logs": [l.to_dict() for l in self.logs]
        }


class Recipient(Base):
    __tablename__ = "recipients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_id: Mapped[str] = mapped_column(String(50), ForeignKey("campaigns.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="recipients")

    def to_dict(self):
        return {
            "email": self.email,
            "name": self.name,
            "status": self.status,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "error": self.error
        }


class CampaignLog(Base):
    __tablename__ = "campaign_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    campaign_id: Mapped[str] = mapped_column(String(50), ForeignKey("campaigns.id"), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    message: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationship
    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="logs")

    def to_dict(self):
        return {
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "message": self.message
        }


class ChatSession(Base):
    """Model for chat sessions/conversations"""
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), default="New Chat")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class ChatMessage(Base):
    """Model for persisting chat history"""
    __tablename__ = "chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(50), ForeignKey("chat_sessions.id"), nullable=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # 'user' or 'assistant'
    content: Mapped[str] = mapped_column(Text, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }



class UserSettings(Base):
    """Model for storing user settings including name"""
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "key": self.key,
            "value": self.value,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


class SentEmail(Base):
    """Model for tracking sent email replies in Kanban board"""
    __tablename__ = "sent_emails"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)  # Gmail email ID
    original_from: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    original_subject: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    reply_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "email_id": self.email_id,
            "original_from": self.original_from,
            "original_subject": self.original_subject,
            "reply_content": self.reply_content,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None
        }
