import React from 'react';
import './EmailInbox.css';

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  category: string;
  priority: string;
  isUnread: boolean;
}

interface EmailInboxProps {
  emails: Email[];
}

const EmailInbox: React.FC<EmailInboxProps> = ({ emails }) => {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      default: return '🟢';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'work': return '💼';
      case 'personal': return '👤';
      case 'urgent': return '⚠️';
      case 'notifications': return '🔔';
      default: return '📧';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHrs < 1) return 'Just now';
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffHrs < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  // Separate important and regular emails
  const importantEmails = emails.filter(e => e.priority === 'high' || e.category === 'urgent');
  const regularEmails = emails.filter(e => e.priority !== 'high' && e.category !== 'urgent');

  return (
    <div className="email-inbox">
      <div className="inbox-header">
        <h2 className="inbox-title">
          <span className="icon">📬</span>
          Email Inbox
        </h2>
        <div className="inbox-stats">
          <span className="stat-badge unread">{emails.filter(e => e.isUnread).length} Unread</span>
          <span className="stat-badge total">{emails.length} Total</span>
        </div>
      </div>

      {/* Important Emails Section */}
      {importantEmails.length > 0 && (
        <div className="email-section">
          <div className="section-header important">
            <span className="section-icon">⭐</span>
            <h3>Important</h3>
            <span className="count">{importantEmails.length}</span>
          </div>
          <div className="email-list">
            {importantEmails.map(email => (
              <div key={email.id} className={`email-item ${email.isUnread ? 'unread' : ''} priority-${email.priority}`}>
                <div className="email-left">
                  <div className="email-checkbox">
                    <input type="checkbox" />
                  </div>
                  <div className="email-priority">
                    {getPriorityIcon(email.priority)}
                  </div>
                  <div className="email-category">
                    {getCategoryIcon(email.category)}
                  </div>
                </div>
                
                <div className="email-content">
                  <div className="email-header-row">
                    <span className="email-from">{email.from}</span>
                    <span className="email-date">{formatDate(email.date)}</span>
                  </div>
                  <div className="email-subject">{email.subject}</div>
                  <div className="email-snippet">{email.snippet}</div>
                </div>
                
                <div className="email-actions">
                  <button className="action-btn" title="Archive">📁</button>
                  <button className="action-btn" title="Delete">🗑️</button>
                  <button className="action-btn" title="Reply">↩️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Inbox Section */}
      <div className="email-section">
        <div className="section-header">
          <span className="section-icon">📥</span>
          <h3>Inbox</h3>
          <span className="count">{regularEmails.length}</span>
        </div>
        <div className="email-list">
          {regularEmails.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>No emails to display</p>
            </div>
          ) : (
            regularEmails.map(email => (
              <div key={email.id} className={`email-item ${email.isUnread ? 'unread' : ''} priority-${email.priority}`}>
                <div className="email-left">
                  <div className="email-checkbox">
                    <input type="checkbox" />
                  </div>
                  <div className="email-priority">
                    {getPriorityIcon(email.priority)}
                  </div>
                  <div className="email-category">
                    {getCategoryIcon(email.category)}
                  </div>
                </div>
                
                <div className="email-content">
                  <div className="email-header-row">
                    <span className="email-from">{email.from}</span>
                    <span className="email-date">{formatDate(email.date)}</span>
                  </div>
                  <div className="email-subject">{email.subject}</div>
                  <div className="email-snippet">{email.snippet}</div>
                </div>
                
                <div className="email-actions">
                  <button className="action-btn" title="Archive">📁</button>
                  <button className="action-btn" title="Delete">🗑️</button>
                  <button className="action-btn" title="Reply">↩️</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailInbox;
