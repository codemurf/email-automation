import React, { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Briefcase,
  User,
  AlertCircle,
  Bell,
  Mail,
  GripVertical,
} from "lucide-react";
import "./EmailCard.css";

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

interface EmailCardProps {
  email: Email;
  isDragging?: boolean;
  isProcessing?: boolean;
  onClick?: (email: Email) => void;
}

const EmailCard: React.FC<EmailCardProps> = ({
  email,
  isDragging,
  isProcessing,
  onClick,
}) => {
  const isDragRef = useRef(false);
  const mouseDownPosRef = useRef({ x: 0, y: 0 });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: email.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "work":
        return <Briefcase size={14} />;
      case "personal":
        return <User size={14} />;
      case "urgent":
        return <AlertCircle size={14} />;
      case "notification":
        return <Bell size={14} />;
      default:
        return <Mail size={14} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "priority-high";
      case "medium":
        return "priority-medium";
      case "low":
        return "priority-low";
      default:
        return "priority-medium";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Handle mouse down to track starting position
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    isDragRef.current = false;
  };

  // Handle mouse move to detect if this is a drag
  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
    const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);
    // If moved more than 5px, it's a drag
    if (dx > 5 || dy > 5) {
      isDragRef.current = true;
    }
  };

  // Handle click - only open modal if not dragging
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if this was a drag operation
    if (!isDragRef.current && onClick && !isProcessing) {
      onClick(email);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`email-card ${
        email.isUnread ? "unread" : ""
      } ${getPriorityColor(email.priority)} ${isDragging ? "dragging" : ""} ${
        isProcessing ? "processing" : ""
      }`}
      {...attributes}
      {...listeners}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onClick={handleCardClick}
    >
      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-spinner"></div>
          <p>AI generating reply...</p>
        </div>
      )}

      <div className="card-header">
        <div className="card-icons">
          <span className="category-icon">
            {getCategoryIcon(email.category)}
          </span>
          <span className={`priority-dot priority-${email.priority}`}></span>
          {email.isUnread && <span className="unread-dot"></span>}
        </div>
        <span className="card-date">{formatDate(email.date)}</span>
      </div>

      <div className="card-content">
        <h4 className="card-subject">{email.subject}</h4>
        <p className="card-from">From: {email.from}</p>
        <p className="card-snippet">{email.snippet}</p>
      </div>

      <div className="card-footer">
        <span className={`category-badge ${email.category}`}>
          {email.category}
        </span>
        <span className={`priority-badge priority-${email.priority}`}>
          {email.priority.toUpperCase()}
        </span>
        <span className="drag-handle">
          <GripVertical size={14} />
        </span>
      </div>
    </div>
  );
};

export default EmailCard;
