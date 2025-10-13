import React from 'react';
import './AgentDashboard.css';
import AgentCard from './AgentCard';

interface Agent {
  agent_id: string;
  name: string;
  role: string;
  status: string;
  progress: number;
  current_task: any;
  logs: any[];
}

interface AgentDashboardProps {
  agents: Agent[];
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ agents }) => {
  // Separate coordinator from workers
  const coordinator = agents.find(a => a.agent_id === 'coordinator');
  const workers = agents.filter(a => a.agent_id !== 'coordinator');

  return (
    <div className="agent-dashboard">
      <h2 className="dashboard-title">
        <span className="icon">👥</span>
        Agent Orchestration
      </h2>

      {/* Coordinator Section */}
      {coordinator && (
        <div className="coordinator-section">
          <h3 className="section-title">
            <span className="coordinator-badge">Coordinator</span>
          </h3>
          <AgentCard agent={coordinator} isCoordinator={true} />
        </div>
      )}

      {/* Worker Agents Section */}
      <div className="workers-section">
        <h3 className="section-title">
          <span className="workers-badge">Worker Agents</span>
        </h3>
        <div className="agents-grid">
          {workers.map(agent => (
            <AgentCard key={agent.agent_id} agent={agent} isCoordinator={false} />
          ))}
        </div>
      </div>

      {/* System Stats */}
      <div className="system-stats">
        <div className="stat-card">
          <span className="stat-label">Total Agents</span>
          <span className="stat-value">{agents.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active</span>
          <span className="stat-value">
            {agents.filter(a => a.status === 'working').length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value">
            {agents.filter(a => a.status === 'completed').length}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Idle</span>
          <span className="stat-value">
            {agents.filter(a => a.status === 'idle').length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
