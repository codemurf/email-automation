import React, { useState } from 'react';
import './LogViewer.css';

interface Log {
  timestamp: string;
  agent: string;
  level: string;
  message: string;
}

interface Agent {
  agent_id: string;
  name: string;
  logs: Log[];
}

interface Event {
  id: string;
  type: string;
  source: string;
  target?: string;
  data: any;
  timestamp: string;
}

interface LogViewerProps {
  agents: Agent[];
  events: Event[];
}

const LogViewer: React.FC<LogViewerProps> = ({ agents, events }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'events'>('logs');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');

  // Combine all logs from all agents
  const allLogs = agents.flatMap(agent => 
    (agent.logs || []).map(log => ({
      ...log,
      agent_name: agent.name
    }))
  ).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Filter logs by selected agent
  const filteredLogs = selectedAgent === 'all' 
    ? allLogs 
    : allLogs.filter(log => log.agent === selectedAgent);

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'info': return '#3b82f6';
      case 'success': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="log-viewer">
      <div className="viewer-header">
        <h2 className="viewer-title">
          <span className="icon">📊</span>
          Activity Monitor
        </h2>

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            📝 Logs
          </button>
          <button 
            className={`tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            ⚡ Events
          </button>
        </div>

        {/* Agent Filter (only for logs) */}
        {activeTab === 'logs' && (
          <select 
            className="agent-filter"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
          >
            <option value="all">All Agents</option>
            {agents.map(agent => (
              <option key={agent.agent_id} value={agent.agent_id}>
                {agent.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="viewer-content">
        {activeTab === 'logs' ? (
          <div className="logs-container">
            {filteredLogs.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>No logs available</p>
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div key={index} className="log-entry">
                  <span className="log-time">{formatTimestamp(log.timestamp)}</span>
                  <span 
                    className="log-level"
                    style={{ backgroundColor: getLevelColor(log.level) }}
                  >
                    {log.level.toUpperCase()}
                  </span>
                  <span className="log-agent">[{log.agent_name}]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="events-container">
            {events.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📭</span>
                <p>No events recorded</p>
              </div>
            ) : (
              events.slice().reverse().map((event, index) => (
                <div key={index} className="event-entry">
                  <div className="event-header">
                    <span className="event-type">{event.type}</span>
                    <span className="event-time">{formatTimestamp(event.timestamp)}</span>
                  </div>
                  <div className="event-body">
                    <span className="event-source">From: {event.source}</span>
                    {event.target && (
                      <span className="event-target">→ To: {event.target}</span>
                    )}
                  </div>
                  {event.data && (
                    <div className="event-data">
                      <pre>{JSON.stringify(event.data, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
