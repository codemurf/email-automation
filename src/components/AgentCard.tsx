import React from 'react';
import './AgentCard.css';

interface Agent {
  agent_id: string;
  name: string;
  role: string;
  status: string;
  progress: number;
  current_task: any;
  logs: any[];
}

interface AgentCardProps {
  agent: Agent;
  isCoordinator: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, isCoordinator }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return '⚙️';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'waiting': return '⏳';
      default: return '💤';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'waiting': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getAgentIcon = (agentId: string) => {
    switch (agentId) {
      case 'coordinator': return '🎯';
      case 'email_reader': return '📧';
      case 'summarizer': return '📝';
      case 'integration': return '🔗';
      default: return '🤖';
    }
  };

  return (
    <div className={`agent-card ${isCoordinator ? 'coordinator-card' : ''} status-${agent.status}`}>
      <div className="card-header">
        <div className="agent-info">
          <span className="agent-icon">{getAgentIcon(agent.agent_id)}</span>
          <div>
            <h4 className="agent-name">{agent.name}</h4>
            <p className="agent-role">{agent.role}</p>
          </div>
        </div>
        <div className="status-badge" style={{ backgroundColor: getStatusColor(agent.status) }}>
          <span>{getStatusIcon(agent.status)}</span>
          <span>{agent.status.toUpperCase()}</span>
        </div>
      </div>

      <div className="card-body">
        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-header">
            <span className="progress-label">Progress</span>
            <span className="progress-value">{agent.progress}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${agent.progress}%`,
                backgroundColor: getStatusColor(agent.status)
              }}
            />
          </div>
        </div>

        {/* Current Task */}
        {agent.current_task && (
          <div className="current-task">
            <span className="task-label">Current Task:</span>
            <span className="task-value">
              {agent.current_task.description || JSON.stringify(agent.current_task).slice(0, 50)}
            </span>
          </div>
        )}

        {/* Recent Logs */}
        {agent.logs && agent.logs.length > 0 && (
          <div className="recent-logs">
            <span className="logs-label">Latest:</span>
            <div className="log-entry">
              {agent.logs[agent.logs.length - 1].message}
            </div>
          </div>
        )}
      </div>

      <div className="card-footer">
        <span className="agent-id">ID: {agent.agent_id}</span>
        <span className="log-count">{agent.logs?.length || 0} logs</span>
      </div>
    </div>
  );
};

export default AgentCard;
