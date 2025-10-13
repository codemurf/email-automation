import React, { useState } from 'react';
import './WorkflowControl.css';

interface WorkflowControlProps {
  onExecute: (config: any) => void;
  onReset: () => void;
  isConnected: boolean;
}

const WorkflowControl: React.FC<WorkflowControlProps> = ({ onExecute, onReset, isConnected }) => {
  const [maxEmails, setMaxEmails] = useState(10);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    setIsExecuting(true);
    
    const config = {
      type: 'email_workflow',
      description: `Process ${maxEmails} latest emails`,
      max_emails: maxEmails
    };

    await onExecute(config);
    
    setTimeout(() => {
      setIsExecuting(false);
    }, 2000);
  };

  const quickActions = [
    {
      name: 'Quick Email Check',
      description: 'Process 5 latest emails',
      icon: '⚡',
      action: () => {
        setMaxEmails(5);
        setTimeout(() => handleExecute(), 100);
      }
    },
    {
      name: 'Full Email Sync',
      description: 'Process 20 latest emails',
      icon: '🔄',
      action: () => {
        setMaxEmails(20);
        setTimeout(() => handleExecute(), 100);
      }
    },
    {
      name: 'Daily Report',
      description: 'Generate daily summary',
      icon: '📊',
      action: () => {
        setMaxEmails(50);
        setTimeout(() => handleExecute(), 100);
      }
    }
  ];

  return (
    <div className="workflow-control">
      <div className="control-header">
        <h2 className="control-title">
          <span className="icon">🎮</span>
          Workflow Control
        </h2>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3 className="section-title">Quick Actions</h3>
        <div className="actions-grid">
          {quickActions.map((action, index) => (
            <button
              key={index}
              className="action-button"
              onClick={action.action}
              disabled={!isConnected || isExecuting}
            >
              <span className="action-icon">{action.icon}</span>
              <div className="action-info">
                <span className="action-name">{action.name}</span>
                <span className="action-description">{action.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Configuration */}
      <div className="custom-config">
        <h3 className="section-title">Custom Workflow</h3>
        <div className="config-form">
          <div className="form-group">
            <label htmlFor="maxEmails">Number of Emails:</label>
            <input
              type="number"
              id="maxEmails"
              value={maxEmails}
              onChange={(e) => setMaxEmails(parseInt(e.target.value))}
              min="1"
              max="100"
              disabled={isExecuting}
            />
          </div>

          <div className="button-group">
            <button
              className="execute-button"
              onClick={handleExecute}
              disabled={!isConnected || isExecuting}
            >
              {isExecuting ? (
                <>
                  <span className="spinner">⏳</span>
                  Executing...
                </>
              ) : (
                <>
                  <span>▶️</span>
                  Execute Workflow
                </>
              )}
            </button>

            <button
              className="reset-button"
              onClick={onReset}
              disabled={isExecuting}
            >
              <span>🔄</span>
              Reset Agents
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Steps Preview */}
      <div className="workflow-preview">
        <h3 className="section-title">Workflow Steps</h3>
        <div className="steps-list">
          <div className="step">
            <span className="step-number">1</span>
            <div className="step-info">
              <span className="step-name">📧 Read & Categorize Emails</span>
              <span className="step-description">Email Reader Agent fetches and categorizes emails</span>
            </div>
          </div>
          <div className="step-arrow">↓</div>
          <div className="step">
            <span className="step-number">2</span>
            <div className="step-info">
              <span className="step-name">📝 Summarize Emails</span>
              <span className="step-description">Summarizer Agent creates daily report</span>
            </div>
          </div>
          <div className="step-arrow">↓</div>
          <div className="step">
            <span className="step-number">3</span>
            <div className="step-info">
              <span className="step-name">🔗 Send to Notion/Slack</span>
              <span className="step-description">Integration Agent updates external services</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowControl;
