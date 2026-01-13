import React, { useState } from "react";
import { API_BASE_URL } from "../config";
import {
  X,
  Send,
  Bot,
  User,
  Clock,
  Tag,
  MessageSquare,
  Briefcase,
  Zap,
  Heart,
} from "lucide-react";
import "./EmailModal.css";

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  category: "work" | "personal" | "urgent" | "notification";
  priority: "high" | "medium" | "low";
  isUnread: boolean;
  body?: string;
}

interface EmailModalProps {
  email: Email;
  onClose: () => void;
  onSendReply: (
    emailId: string,
    content: string,
    tone: string
  ) => Promise<void>;
  isSending?: boolean;
}

const EmailModal: React.FC<EmailModalProps> = ({
  email,
  onClose,
  onSendReply,
  isSending = false,
}) => {
  const [tone, setTone] = useState("professional");
  const [replyContent, setReplyContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const tones = [
    {
      id: "professional",
      label: "Professional",
      icon: <Briefcase size={14} />,
      color: "#3b82f6",
    },
    {
      id: "friendly",
      label: "Friendly",
      icon: <Heart size={14} />,
      color: "#10b981",
    },
    {
      id: "urgent",
      label: "Urgent",
      icon: <Zap size={14} />,
      color: "#ef4444",
    },
    {
      id: "casual",
      label: "Casual",
      icon: <MessageSquare size={14} />,
      color: "#8b5cf6",
    },
  ];

  const handleGenerateReply = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/integrations/gmail/generate-reply?email_id=${email.id}&tone=${tone}`,
        {
          method: "POST",
        }
      );
      const data = await response.json();
      if (data.reply_content) {
        setReplyContent(data.reply_content);
      }
    } catch (error) {
      console.error("Error generating reply:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!replyContent) return;
    await onSendReply(email.id, replyContent, tone);
    onClose();
  };

  return (
    <div className="email-modal-overlay" onClick={onClose}>
      <div
        className="email-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="modal-header-left">
            <Tag className="header-icon" size={16} />
            <span className={`category-badge ${email.category}`}>
              {email.category}
            </span>
            <span className={`priority-badge ${email.priority}`}>
              {email.priority}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div className="modal-body">
          <div className="email-content-section">
            <h2 className="email-subject">{email.subject}</h2>
            <div className="email-meta">
              <div className="meta-item">
                <User size={16} />
                <span>{email.from}</span>
              </div>
              <div className="meta-item">
                <Clock size={16} />
                <span>{new Date(email.date).toLocaleString()}</span>
              </div>
            </div>
            <div className="email-body-text">{email.body || email.snippet}</div>
          </div>

          <div className="ai-reply-section">
            <div className="section-title">
              <Bot size={18} />
              <h3>AI Smart Reply</h3>
            </div>

            <div className="tone-selector">
              {tones.map((t) => (
                <button
                  key={t.id}
                  className={`tone-btn ${tone === t.id ? "active" : ""}`}
                  style={{ "--tone-color": t.color } as React.CSSProperties}
                  onClick={() => setTone(t.id)}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            <div className="reply-input-wrapper">
              <textarea
                className="reply-textarea"
                placeholder="AI reply will appear here..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
              />
              {isGenerating && (
                <div className="generating-overlay">
                  <div className="spinner"></div>
                  <span>Generating {tone} response...</span>
                </div>
              )}
            </div>

            <div className="reply-actions">
              <button
                className="action-btn generate"
                onClick={handleGenerateReply}
                disabled={isGenerating || isSending}
              >
                <Zap size={16} />
                Generate
              </button>
              <button
                className="action-btn send"
                onClick={handleSend}
                disabled={!replyContent || isGenerating || isSending}
              >
                <Send size={16} />
                {isSending ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
