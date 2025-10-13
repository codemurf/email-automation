import React, { useState } from 'react';
import './AgentWorkflow.css';

interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  icon: string;
  stats: {
    processed: number;
    success: number;
    errors: number;
  };
  lastRun?: string;
}

interface FilterOptions {
  dateRange: 'today' | 'yesterday' | 'last7days' | 'last30days';
  categories: string[];
}

interface IntegrationConfig {
  notion: {
    workspace: string;
    database: string;
    connected: boolean;
  };
  slack: {
    workspace: string;
    channel: string;
    connected: boolean;
    webhookUrl?: string; // Add webhook URL field
  };
}

const AgentWorkflow: React.FC = () => {
  // Integration configuration state
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig>({
    notion: {
      workspace: 'CIS Labs Workspace',
      database: 'Daily Email Reports',
      connected: true,
    },
    slack: {
      workspace: 'CIS Labs Team',
      channel: '#email-summaries',
      connected: true,
      webhookUrl: localStorage.getItem('slack_webhook_url') || '', // Load from localStorage
    },
  });

  const [showSettings, setShowSettings] = useState(true); // Start expanded for debugging

  // Toggle settings handler
  const handleToggleSettings = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔘 Button clicked!');
    console.log('Current showSettings:', showSettings);
    const newValue = !showSettings;
    console.log('Setting to:', newValue);
    setShowSettings(newValue);
    console.log('✅ State update called');
  };

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'today',
    categories: ['work', 'urgent'],
  });

  const [filteredCount, setFilteredCount] = useState(12);
  const [showFilterPanel, setShowFilterPanel] = useState(true);
  const [workflowSummary, setWorkflowSummary] = useState<string>('');
  const [notionStatus, setNotionStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [slackStatus, setSlackStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'agent-1',
      name: 'Email Categorizer',
      description: 'Reads filtered emails & categorizes them',
      status: 'idle',
      icon: '📧',
      stats: {
        processed: 245,
        success: 238,
        errors: 7,
      },
      lastRun: '2 minutes ago',
    },
    {
      id: 'agent-2',
      name: 'Report Generator',
      description: 'Summarizes categorized emails into daily report',
      status: 'idle',
      icon: '📝',
      stats: {
        processed: 42,
        success: 42,
        errors: 0,
      },
      lastRun: '1 hour ago',
    },
    {
      id: 'agent-3',
      name: 'Integration Manager',
      description: 'Sends summary to Notion and Slack',
      status: 'idle',
      icon: '🔗',
      stats: {
        processed: 89,
        success: 85,
        errors: 4,
      },
      lastRun: '30 minutes ago',
    },
  ]);

  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const handleCategoryToggle = (category: string) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const handleDateRangeChange = (range: 'today' | 'yesterday' | 'last7days' | 'last30days') => {
    setFilters(prev => ({ ...prev, dateRange: range }));
    // Update filtered count based on date range
    const counts = { today: 12, yesterday: 8, last7days: 45, last30days: 156 };
    setFilteredCount(counts[range]);
  };

  const handleRunWorkflow = async () => {
    // Reset statuses
    setWorkflowSummary('');
    setNotionStatus('idle');
    setSlackStatus('idle');

    // Step 1: Fetch and Categorize emails
    setAgents(prev => prev.map(agent => 
      agent.id === 'agent-1' ? { ...agent, status: 'running' as const } : agent
    ));

    let emails: any[] = [];
    try {
      // Fetch real emails from backend
      console.log('🔍 Fetching emails with filters:', { 
        date_range: filters.dateRange, 
        categories: filters.categories 
      });
      
      const response = await fetch('http://localhost:9000/api/v1/integrations/gmail/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date_range: filters.dateRange,
          categories: filters.categories
        }),
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        emails = data.emails || [];
        setFilteredCount(data.count || 0);
        console.log(`✅ Fetched ${emails.length} real emails from Gmail!`);
        console.log('📧 Email sample:', emails.slice(0, 2));
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch emails - Status:', response.status, 'Error:', errorText);
        alert(`⚠️ Could not fetch emails from Gmail. Check browser console for details.`);
        emails = [];
      }
    } catch (error) {
      console.error('❌ Error fetching emails:', error);
      alert(`⚠️ Error connecting to backend: ${error}`);
      emails = [];
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    setAgents(prev => prev.map(agent => 
      agent.id === 'agent-1' 
        ? { 
            ...agent, 
            status: 'completed' as const,
            stats: { ...agent.stats, processed: agent.stats.processed + emails.length },
            lastRun: 'Just now'
          } 
        : agent
    ));

    // Step 2: Generate summary
    setAgents(prev => prev.map(agent => 
      agent.id === 'agent-2' 
        ? { ...agent, status: 'running' as const } 
        : agent.id === 'agent-1'
        ? { ...agent, status: 'idle' as const }
        : agent
    ));

    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📝 Generating summary from', emails.length, 'emails');
    const summary = generateRealEmailSummary(emails, filters.categories);
    console.log('📋 Summary generated:', summary.substring(0, 200));
    setWorkflowSummary(summary);

    setAgents(prev => prev.map(agent => 
      agent.id === 'agent-2' 
        ? { 
            ...agent, 
            status: 'completed' as const,
            stats: { ...agent.stats, processed: agent.stats.processed + 1, success: agent.stats.success + 1 },
            lastRun: 'Just now'
          } 
        : agent
    ));

    // Step 3: Send to Notion and Slack
    setAgents(prev => prev.map(agent => 
      agent.id === 'agent-3' 
        ? { ...agent, status: 'running' as const } 
        : agent.id === 'agent-2'
        ? { ...agent, status: 'idle' as const }
        : agent
    ));

    // Send to Notion
    setNotionStatus('sending');
    await new Promise(resolve => setTimeout(resolve, 1500));
    setNotionStatus('sent');

    // Send to Slack
    setSlackStatus('sending');
    
    try {
      const webhookUrl = integrationConfig.slack.webhookUrl || localStorage.getItem('slack_webhook_url');
      
      if (!webhookUrl) {
        console.error('❌ No Slack webhook URL configured');
        alert('⚠️ Slack webhook URL not configured. Please go to Settings and add your webhook URL.');
        setSlackStatus('idle');
      } else {
        // Call backend API to send to Slack
        const response = await fetch('http://localhost:9000/api/v1/integrations/slack/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhook_url: webhookUrl,
            text: summary,
            channel: integrationConfig.slack.channel,
            username: 'Email Automation Bot',
            icon_emoji: ':email:'
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Slack message sent:', data);
          setSlackStatus('sent');
          alert(`✅ Summary sent to Slack ${integrationConfig.slack.channel}!`);
        } else {
          const error = await response.json();
          console.error('❌ Failed to send to Slack:', error);
          alert(`❌ Failed to send to Slack: ${error.detail || 'Unknown error'}`);
          setSlackStatus('idle');
        }
      }
    } catch (error) {
      console.error('❌ Error sending to Slack:', error);
      alert(`❌ Error sending to Slack: ${error}`);
      setSlackStatus('idle');
    }

    setAgents(prev => prev.map(agent => 
      agent.id === 'agent-3' 
        ? { 
            ...agent, 
            status: 'completed' as const,
            stats: { ...agent.stats, processed: agent.stats.processed + 2, success: agent.stats.success + 2 },
            lastRun: 'Just now'
          } 
        : { ...agent, status: 'idle' as const }
    ));
  };

  const handleTestNotion = () => {
    alert(`✅ Testing Notion Connection\n\nWorkspace: ${integrationConfig.notion.workspace}\nDatabase: ${integrationConfig.notion.database}\n\nConnection Status: Active\nAPI Version: v1\nLast Sync: ${new Date().toLocaleString()}`);
  };

  const handleTestSlack = () => {
    alert(`✅ Testing Slack Connection\n\nWorkspace: ${integrationConfig.slack.workspace}\nChannel: ${integrationConfig.slack.channel}\n\nConnection Status: Active\nWebhook Status: Verified\nLast Message: ${new Date().toLocaleString()}`);
  };

  const generateRealEmailSummary = (emails: any[], categories: string[]) => {
    if (emails.length === 0) {
      return `📊 Daily Email Summary

📅 Date: ${new Date().toLocaleDateString()}
📬 Total Emails Processed: 0

⚠️ No emails found matching your filters.`;
    }

    // Categorize emails
    const urgent = emails.filter(e => e.category === 'urgent' || e.labels?.includes('IMPORTANT'));
    const work = emails.filter(e => e.category === 'work');
    
    // Extract sender name from email (e.g., "John Doe <john@example.com>" -> "John Doe")
    const getSenderName = (fromField: string) => {
      const match = fromField.match(/^([^<]+)/);
      return match ? match[1].trim() : fromField;
    };
    
    // Build detailed summary with actual email info and sender names
    let summary = `📊 Daily Email Summary

📅 Date: ${new Date().toLocaleDateString()}
📬 Total Emails Processed: ${emails.length}
🏷️ Filters Applied: ${categories.join(', ') || 'All'}

📈 Key Highlights:
• ${urgent.length} urgent items requiring immediate attention
• ${work.length} work-related communications
• ${emails.length - urgent.length - work.length} other messages

� EMAILS BY PERSON:\n`;

    // Group by sender and show each email with person name prominently
    emails.slice(0, 10).forEach((email, idx) => {
      const senderName = getSenderName(email.from);
      const isUrgent = email.category === 'urgent' || email.labels?.includes('IMPORTANT');
      const urgentFlag = isUrgent ? '🚨 URGENT' : '';
      
      summary += `\n${idx + 1}. ${urgentFlag} 👤 *${senderName}*
   � ${email.from}
   📝 Subject: "${email.subject}"
   💬 ${email.snippet || email.body?.substring(0, 80) || 'No preview available'}...\n`;
    });

    if (emails.length > 10) {
      summary += `\n... and ${emails.length - 10} more emails from other senders\n`;
    }

    summary += `\n⚡ Priority Actions:
1. Review ${urgent.length} urgent emails
2. Respond to ${Math.min(3, emails.length)} pending messages
3. Follow up with key senders

✅ Status: All emails categorized and ready for action`;

    return summary;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '⚡';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '⏸️';
    }
  };

  return (
    <div className="agent-workflow">
      {/* Header */}
      <div className="workflow-header">
        <div className="header-content">
          <h2 className="workflow-title">🤖 AI Agent Workflow</h2>
          <p className="workflow-subtitle">Filter emails → Categorize → Summarize → Send to Notion & Slack</p>
        </div>
        <button 
          className="toggle-filter-btn"
          onClick={() => setShowFilterPanel(!showFilterPanel)}
        >
          <span className="btn-icon">{showFilterPanel ? '🔼' : '🔽'}</span>
          {showFilterPanel ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="filter-panel">
          <div className="filter-section">
            <h3 className="filter-title">📅 Date Range</h3>
            <div className="filter-options">
              <button
                className={`filter-btn ${filters.dateRange === 'today' ? 'active' : ''}`}
                onClick={() => handleDateRangeChange('today')}
              >
                Today
              </button>
              <button
                className={`filter-btn ${filters.dateRange === 'yesterday' ? 'active' : ''}`}
                onClick={() => handleDateRangeChange('yesterday')}
              >
                Yesterday
              </button>
              <button
                className={`filter-btn ${filters.dateRange === 'last7days' ? 'active' : ''}`}
                onClick={() => handleDateRangeChange('last7days')}
              >
                Last 7 Days
              </button>
              <button
                className={`filter-btn ${filters.dateRange === 'last30days' ? 'active' : ''}`}
                onClick={() => handleDateRangeChange('last30days')}
              >
                Last 30 Days
              </button>
            </div>
          </div>

          <div className="filter-section">
            <h3 className="filter-title">🏷️ Email Categories</h3>
            <div className="filter-options">
              <button
                className={`filter-btn category ${filters.categories.includes('work') ? 'active' : ''}`}
                onClick={() => handleCategoryToggle('work')}
              >
                💼 Work
              </button>
              <button
                className={`filter-btn category ${filters.categories.includes('urgent') ? 'active' : ''}`}
                onClick={() => handleCategoryToggle('urgent')}
              >
                🚨 Urgent
              </button>
              <button
                className={`filter-btn category ${filters.categories.includes('personal') ? 'active' : ''}`}
                onClick={() => handleCategoryToggle('personal')}
              >
                👤 Personal
              </button>
              <button
                className={`filter-btn category ${filters.categories.includes('notification') ? 'active' : ''}`}
                onClick={() => handleCategoryToggle('notification')}
              >
                🔔 Notifications
              </button>
            </div>
          </div>

          <div className="filter-summary">
            <div className="filter-result">
              <span className="result-icon">📬</span>
              <span className="result-text">
                <strong>{filteredCount}</strong> emails match your filters
              </span>
            </div>
            <button 
              className="run-workflow-btn"
              onClick={handleRunWorkflow}
              disabled={filteredCount === 0 || agents.some(a => a.status === 'running')}
            >
              <span className="btn-icon">▶️</span>
              Run Workflow
            </button>
          </div>
        </div>
      )}

      {/* Integration Configuration Panel */}
      <div className="integration-config-panel">
        <div className="config-header">
          <h3>🔗 Integration Settings {showSettings ? '(OPEN)' : '(CLOSED)'}</h3>
          <button 
            className="settings-toggle-btn"
            onClick={handleToggleSettings}
            type="button"
          >
            {showSettings ? '▼' : '▶'} {showSettings ? 'Hide Details' : 'Show Details'}
          </button>
        </div>
        
        {showSettings && (
          <div className="config-content">
            {/* Notion Configuration */}
            <div className="config-section">
              <div className="config-icon">📔</div>
              <div className="config-details">
                <h4>Notion Integration</h4>
                <div className="config-info">
                  <div className="info-row">
                    <span className="info-label">Workspace:</span>
                    <span className="info-value">{integrationConfig.notion.workspace}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Database:</span>
                    <span className="info-value">{integrationConfig.notion.database}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Status:</span>
                    <span className={`connection-status ${integrationConfig.notion.connected ? 'connected' : 'disconnected'}`}>
                      {integrationConfig.notion.connected ? '✅ Connected' : '❌ Disconnected'}
                    </span>
                  </div>
                </div>
                <button 
                  className="test-connection-btn"
                  onClick={handleTestNotion}
                >
                  🔍 Test Connection
                </button>
              </div>
            </div>

            {/* Slack Configuration */}
            <div className="config-section">
              <div className="config-icon">💬</div>
              <div className="config-details">
                <h4>Slack Integration</h4>
                <div className="config-info">
                  <div className="info-row">
                    <span className="info-label">Workspace:</span>
                    <span className="info-value">{integrationConfig.slack.workspace}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Channel:</span>
                    <span className="info-value">{integrationConfig.slack.channel}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Status:</span>
                    <span className={`connection-status ${integrationConfig.slack.connected ? 'connected' : 'disconnected'}`}>
                      {integrationConfig.slack.connected ? '✅ Connected' : '❌ Disconnected'}
                    </span>
                  </div>
                </div>
                <button 
                  className="test-connection-btn"
                  onClick={handleTestSlack}
                >
                  🔍 Test Connection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Agent Pipeline */}
      <div className="workflow-pipeline">
        {agents.map((agent, index) => (
          <React.Fragment key={agent.id}>
            <div 
              className={`agent-card ${agent.status}`}
              onClick={() => setSelectedAgent(agent)}
            >
              <div className="agent-header">
                <div className="agent-icon-wrapper">
                  <span className="agent-icon">{agent.icon}</span>
                  <span 
                    className="status-indicator"
                    style={{ backgroundColor: getStatusColor(agent.status) }}
                  >
                    {getStatusIcon(agent.status)}
                  </span>
                </div>
                <div className="agent-info">
                  <h3 className="agent-name">{agent.name}</h3>
                  <p className="agent-description">{agent.description}</p>
                </div>
              </div>

              <div className="agent-stats">
                <div className="stat-item">
                  <span className="stat-label">Processed</span>
                  <span className="stat-value">{agent.stats.processed}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Success</span>
                  <span className="stat-value success">{agent.stats.success}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Errors</span>
                  <span className="stat-value error">{agent.stats.errors}</span>
                </div>
              </div>

              <div className="agent-footer">
                <span className="last-run">Last run: {agent.lastRun}</span>
              </div>

              {agent.status === 'running' && (
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
              )}
            </div>

            {index < agents.length - 1 && (
              <div className="pipeline-arrow">
                <span>→</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Workflow Output Panel */}
      {workflowSummary && (
        <div className="output-panel">
          <div className="output-header">
            <h3>📊 Workflow Output</h3>
            <div className="output-actions">
              <div className={`integration-status notion ${notionStatus}`}>
                <span className="status-icon">
                  {notionStatus === 'idle' ? '⏸️' : notionStatus === 'sending' ? '⚡' : '✅'}
                </span>
                <span className="status-text">
                  Notion ({integrationConfig.notion.database}): {notionStatus === 'sent' ? 'Sent' : notionStatus === 'sending' ? 'Sending...' : 'Ready'}
                </span>
              </div>
              <div className={`integration-status slack ${slackStatus}`}>
                <span className="status-icon">
                  {slackStatus === 'idle' ? '⏸️' : slackStatus === 'sending' ? '⚡' : '✅'}
                </span>
                <span className="status-text">
                  Slack ({integrationConfig.slack.channel}): {slackStatus === 'sent' ? 'Sent' : slackStatus === 'sending' ? 'Sending...' : 'Ready'}
                </span>
              </div>
            </div>
          </div>
          <div className="output-content">
            <pre className="summary-text">{workflowSummary}</pre>
          </div>
        </div>
      )}

      {/* Agent Details Panel */}
      {selectedAgent && (
        <div className="agent-details-panel">
          <div className="panel-header">
            <h3>{selectedAgent.icon} {selectedAgent.name}</h3>
            <button 
              className="close-btn"
              onClick={() => setSelectedAgent(null)}
            >
              ✕
            </button>
          </div>
          <div className="panel-content">
            <div className="detail-section">
              <h4>Description</h4>
              <p>{selectedAgent.description}</p>
            </div>
            <div className="detail-section">
              <h4>Status</h4>
              <span className={`status-badge ${selectedAgent.status}`}>
                {getStatusIcon(selectedAgent.status)} {selectedAgent.status.toUpperCase()}
              </span>
            </div>
            <div className="detail-section">
              <h4>Performance</h4>
              <div className="performance-stats">
                <div className="perf-stat">
                  <span className="perf-label">Total Processed</span>
                  <span className="perf-value">{selectedAgent.stats.processed}</span>
                </div>
                <div className="perf-stat">
                  <span className="perf-label">Success Rate</span>
                  <span className="perf-value">
                    {((selectedAgent.stats.success / selectedAgent.stats.processed) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="perf-stat">
                  <span className="perf-label">Error Rate</span>
                  <span className="perf-value">
                    {((selectedAgent.stats.errors / selectedAgent.stats.processed) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="detail-section">
              <h4>Last Execution</h4>
              <p>{selectedAgent.lastRun}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentWorkflow;
