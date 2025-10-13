import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './EmailCard.css';

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  category: 'work' | 'personal' | 'urgent' | 'notification';
  priority: 'high' | 'medium' | 'low';
  isUnread: boolean;
}

interface EmailCardProps {
  email: Email;
  isDragging?: boolean;
  isProcessing?: boolean;
}

const EmailCard: React.FC<EmailCardProps> = ({ email, isDragging, isProcessing }) => {
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
      case 'work': return '💼';
      case 'personal': return '👤';
      case 'urgent': return '🚨';
      case 'notification': return '🔔';
      default: return '📧';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`email-card ${email.isUnread ? 'unread' : ''} ${getPriorityColor(email.priority)} ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
      {...attributes}
      {...listeners}
    >
      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-spinner">🤖</div>
          <p>AI Agent is writing reply...</p>
        </div>
      )}

      <div className="card-header">
        <div className="card-icons">
          <span className="category-icon">{getCategoryIcon(email.category)}</span>
          {email.priority === 'high' && <span className="priority-indicator">🔴</span>}
          {email.isUnread && <span className="unread-dot">●</span>}
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
        <span className="drag-handle">⋮⋮</span>
      </div>
    </div>
  );
};

export default EmailCard;
