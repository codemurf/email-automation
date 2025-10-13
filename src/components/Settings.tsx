import React, { useState } from 'react';
import './Settings.css';

interface AccountConfig {
  gmail: {
    email: string;
    clientId: string;
    clientSecret: string;
    connected: boolean;
  };
  notion: {
    workspace: string;
    apiToken: string;
    databaseId: string;
    connected: boolean;
  };
  slack: {
    workspaceName: string;
    webhookUrl: string;
    channel: string;
    botToken: string;
    connected: boolean;
  };
}

interface SettingsProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

const Settings: React.FC<SettingsProps> = ({ theme, onThemeToggle }) => {
  const [accounts, setAccounts] = useState<AccountConfig>({
    gmail: {
      email: 'abhishek.r@cisinlabs.com',
      clientId: '',
      clientSecret: '',
      connected: true,
    },
    notion: {
      workspace: 'CIS Labs Workspace',
      apiToken: '',
      databaseId: '',
      connected: false,
    },
    slack: {
      workspaceName: 'CIS Labs Team',
      webhookUrl: '',
      channel: '#email-summaries',
      botToken: '',
      connected: false,
    },
  });

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState({
    gmail: false,
    notion: false,
    slack: false,
  });

  const handleSave = (section: 'gmail' | 'notion' | 'slack') => {
    // Save to localStorage
    console.log(`Saving ${section} configuration:`, accounts[section]);
    
    if (section === 'slack') {
      localStorage.setItem('slack_webhook_url', accounts.slack.webhookUrl);
      localStorage.setItem('slack_channel', accounts.slack.channel);
      localStorage.setItem('slack_workspace', accounts.slack.workspaceName);
    } else if (section === 'notion') {
      localStorage.setItem('notion_api_token', accounts.notion.apiToken);
      localStorage.setItem('notion_database_id', accounts.notion.databaseId);
      localStorage.setItem('notion_workspace', accounts.notion.workspace);
    } else if (section === 'gmail') {
      localStorage.setItem('gmail_email', accounts.gmail.email);
      localStorage.setItem('gmail_client_id', accounts.gmail.clientId);
    }
    
    setEditingSection(null);
    alert(`✅ ${section.charAt(0).toUpperCase() + section.slice(1)} settings saved successfully!`);
  };

  const handleTestConnection = async (section: 'gmail' | 'notion' | 'slack') => {
    console.log(`Testing ${section} connection...`);
    
    if (section === 'slack') {
      try {
        const response = await fetch('http://localhost:9000/api/v1/integrations/slack/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhook_url: accounts.slack.webhookUrl,
            channel: accounts.slack.channel
          }),
        });

        if (response.ok) {
          setAccounts(prev => ({
            ...prev,
            slack: { ...prev.slack, connected: true }
          }));
          alert(`✅ Slack connection successful! Check ${accounts.slack.channel} for a test message.`);
        } else {
          const error = await response.json();
          alert(`❌ Slack connection failed: ${error.detail || 'Unknown error'}`);
        }
      } catch (error) {
        alert(`❌ Network error: ${error}`);
      }
    } else {
      // Simulate for other services
      setTimeout(() => {
        const success = Math.random() > 0.3;
        if (success) {
          setAccounts(prev => ({
            ...prev,
            [section]: { ...prev[section], connected: true }
          }));
          alert(`✅ ${section.charAt(0).toUpperCase() + section.slice(1)} connection successful!`);
        } else {
          alert(`❌ ${section.charAt(0).toUpperCase() + section.slice(1)} connection failed. Please check your credentials.`);
        }
      }, 1500);
    }
  };

  const handleDisconnect = (section: 'gmail' | 'notion' | 'slack') => {
    setAccounts(prev => ({
      ...prev,
      [section]: { ...prev[section], connected: false }
    }));
    alert(`🔌 ${section.charAt(0).toUpperCase() + section.slice(1)} disconnected`);
  };

  const handleInputChange = (
    section: 'gmail' | 'notion' | 'slack',
    field: string,
    value: string
  ) => {
    setAccounts(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const toggleTokenVisibility = (section: 'gmail' | 'notion' | 'slack') => {
    setShowTokens(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const maskToken = (token: string, show: boolean) => {
    if (!token) return '';
    if (show) return token;
    return '•'.repeat(Math.min(token.length, 32));
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1 className="settings-title">⚙️ Settings</h1>
        <p className="settings-subtitle">Configure your integrations and preferences</p>
      </div>

      {/* Theme Settings */}
      <div className="settings-section">
        <div className="section-header">
          <h2 className="section-title">🎨 Appearance</h2>
          <div className="section-actions">
            <button className="theme-toggle-btn" onClick={onThemeToggle}>
              <span className="toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span className="toggle-text">
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
          </div>
        </div>
        <div className="section-content">
          <p className="section-description">
            Current theme: <strong>{theme === 'dark' ? 'Dark' : 'Light'}</strong>
          </p>
        </div>
      </div>

      {/* Gmail Account */}
      <div className="settings-section">
        <div className="section-header">
          <div className="header-left">
            <div className="service-icon gmail">📧</div>
            <div>
              <h2 className="section-title">Gmail Account</h2>
              <p className="section-subtitle">Connect your Gmail for email automation</p>
            </div>
          </div>
          <div className="section-actions">
            <span className={`connection-badge ${accounts.gmail.connected ? 'connected' : 'disconnected'}`}>
              {accounts.gmail.connected ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
        </div>

        <div className="section-content">
          {editingSection === 'gmail' ? (
            <div className="config-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={accounts.gmail.email}
                  onChange={(e) => handleInputChange('gmail', 'email', e.target.value)}
                  placeholder="your-email@gmail.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">OAuth Client ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={accounts.gmail.clientId}
                  onChange={(e) => handleInputChange('gmail', 'clientId', e.target.value)}
                  placeholder="Enter your OAuth Client ID"
                />
              </div>
              <div className="form-group">
                <label className="form-label">OAuth Client Secret</label>
                <div className="password-input-wrapper">
                  <input
                    type={showTokens.gmail ? 'text' : 'password'}
                    className="form-input"
                    value={accounts.gmail.clientSecret}
                    onChange={(e) => handleInputChange('gmail', 'clientSecret', e.target.value)}
                    placeholder="Enter your OAuth Client Secret"
                  />
                  <button
                    className="toggle-visibility-btn"
                    onClick={() => toggleTokenVisibility('gmail')}
                  >
                    {showTokens.gmail ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-save" onClick={() => handleSave('gmail')}>
                  💾 Save Changes
                </button>
                <button className="btn-cancel" onClick={() => setEditingSection(null)}>
                  ✕ Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="config-display">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Email:</span>
                  <span className="info-value">{accounts.gmail.email || 'Not configured'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Client ID:</span>
                  <span className="info-value">
                    {accounts.gmail.clientId ? maskToken(accounts.gmail.clientId, showTokens.gmail) : 'Not configured'}
                  </span>
                </div>
              </div>
              <div className="action-buttons">
                <button className="btn-primary" onClick={() => setEditingSection('gmail')}>
                  ✏️ Edit Configuration
                </button>
                {accounts.gmail.connected ? (
                  <>
                    <button className="btn-test" onClick={() => handleTestConnection('gmail')}>
                      🔍 Test Connection
                    </button>
                    <button className="btn-danger" onClick={() => handleDisconnect('gmail')}>
                      🔌 Disconnect
                    </button>
                  </>
                ) : (
                  <button className="btn-success" onClick={() => handleTestConnection('gmail')}>
                    🔗 Connect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notion Account */}
      <div className="settings-section">
        <div className="section-header">
          <div className="header-left">
            <div className="service-icon notion">📔</div>
            <div>
              <h2 className="section-title">Notion Integration</h2>
              <p className="section-subtitle">Connect Notion for saving email reports</p>
            </div>
          </div>
          <div className="section-actions">
            <span className={`connection-badge ${accounts.notion.connected ? 'connected' : 'disconnected'}`}>
              {accounts.notion.connected ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
        </div>

        <div className="section-content">
          {editingSection === 'notion' ? (
            <div className="config-form">
              <div className="form-group">
                <label className="form-label">Workspace Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={accounts.notion.workspace}
                  onChange={(e) => handleInputChange('notion', 'workspace', e.target.value)}
                  placeholder="Your Workspace Name"
                />
              </div>
              <div className="form-group">
                <label className="form-label">API Token</label>
                <div className="password-input-wrapper">
                  <input
                    type={showTokens.notion ? 'text' : 'password'}
                    className="form-input"
                    value={accounts.notion.apiToken}
                    onChange={(e) => handleInputChange('notion', 'apiToken', e.target.value)}
                    placeholder="secret_xxxxxxxxxxxxxxxx"
                  />
                  <button
                    className="toggle-visibility-btn"
                    onClick={() => toggleTokenVisibility('notion')}
                  >
                    {showTokens.notion ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <small className="form-hint">Get your API token from Notion Settings → Integrations</small>
              </div>
              <div className="form-group">
                <label className="form-label">Database ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={accounts.notion.databaseId}
                  onChange={(e) => handleInputChange('notion', 'databaseId', e.target.value)}
                  placeholder="Enter your Notion database ID"
                />
                <small className="form-hint">Found in the database URL after the workspace name</small>
              </div>
              <div className="form-actions">
                <button className="btn-save" onClick={() => handleSave('notion')}>
                  💾 Save Changes
                </button>
                <button className="btn-cancel" onClick={() => setEditingSection(null)}>
                  ✕ Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="config-display">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Workspace:</span>
                  <span className="info-value">{accounts.notion.workspace || 'Not configured'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">API Token:</span>
                  <span className="info-value">
                    {accounts.notion.apiToken ? maskToken(accounts.notion.apiToken, showTokens.notion) : 'Not configured'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Database ID:</span>
                  <span className="info-value">
                    {accounts.notion.databaseId ? maskToken(accounts.notion.databaseId, showTokens.notion) : 'Not configured'}
                  </span>
                </div>
              </div>
              <div className="action-buttons">
                <button className="btn-primary" onClick={() => setEditingSection('notion')}>
                  ✏️ Edit Configuration
                </button>
                {accounts.notion.connected ? (
                  <>
                    <button className="btn-test" onClick={() => handleTestConnection('notion')}>
                      🔍 Test Connection
                    </button>
                    <button className="btn-danger" onClick={() => handleDisconnect('notion')}>
                      🔌 Disconnect
                    </button>
                  </>
                ) : (
                  <button className="btn-success" onClick={() => handleTestConnection('notion')}>
                    🔗 Connect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Slack Account */}
      <div className="settings-section">
        <div className="section-header">
          <div className="header-left">
            <div className="service-icon slack">💬</div>
            <div>
              <h2 className="section-title">Slack Integration</h2>
              <p className="section-subtitle">Connect Slack for sending notifications</p>
            </div>
          </div>
          <div className="section-actions">
            <span className={`connection-badge ${accounts.slack.connected ? 'connected' : 'disconnected'}`}>
              {accounts.slack.connected ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
        </div>

        <div className="section-content">
          {editingSection === 'slack' ? (
            <div className="config-form">
              <div className="form-group">
                <label className="form-label">Workspace Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={accounts.slack.workspaceName}
                  onChange={(e) => handleInputChange('slack', 'workspaceName', e.target.value)}
                  placeholder="Your Slack Workspace"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Webhook URL</label>
                <div className="password-input-wrapper">
                  <input
                    type={showTokens.slack ? 'text' : 'password'}
                    className="form-input"
                    value={accounts.slack.webhookUrl}
                    onChange={(e) => handleInputChange('slack', 'webhookUrl', e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                  />
                  <button
                    className="toggle-visibility-btn"
                    onClick={() => toggleTokenVisibility('slack')}
                  >
                    {showTokens.slack ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <small className="form-hint">Create a webhook in Slack App Settings → Incoming Webhooks</small>
              </div>
              <div className="form-group">
                <label className="form-label">Channel</label>
                <input
                  type="text"
                  className="form-input"
                  value={accounts.slack.channel}
                  onChange={(e) => handleInputChange('slack', 'channel', e.target.value)}
                  placeholder="#email-summaries"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Bot Token (Optional)</label>
                <div className="password-input-wrapper">
                  <input
                    type={showTokens.slack ? 'text' : 'password'}
                    className="form-input"
                    value={accounts.slack.botToken}
                    onChange={(e) => handleInputChange('slack', 'botToken', e.target.value)}
                    placeholder="xoxb-..."
                  />
                  <button
                    className="toggle-visibility-btn"
                    onClick={() => toggleTokenVisibility('slack')}
                  >
                    {showTokens.slack ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
              <div className="form-actions">
                <button className="btn-save" onClick={() => handleSave('slack')}>
                  💾 Save Changes
                </button>
                <button className="btn-cancel" onClick={() => setEditingSection(null)}>
                  ✕ Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="config-display">
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Workspace:</span>
                  <span className="info-value">{accounts.slack.workspaceName || 'Not configured'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Channel:</span>
                  <span className="info-value">{accounts.slack.channel || 'Not configured'}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Webhook URL:</span>
                  <span className="info-value">
                    {accounts.slack.webhookUrl ? maskToken(accounts.slack.webhookUrl, showTokens.slack) : 'Not configured'}
                  </span>
                </div>
              </div>
              <div className="action-buttons">
                <button className="btn-primary" onClick={() => setEditingSection('slack')}>
                  ✏️ Edit Configuration
                </button>
                {accounts.slack.connected ? (
                  <>
                    <button className="btn-test" onClick={() => handleTestConnection('slack')}>
                      🔍 Test Connection
                    </button>
                    <button className="btn-danger" onClick={() => handleDisconnect('slack')}>
                      🔌 Disconnect
                    </button>
                  </>
                ) : (
                  <button className="btn-success" onClick={() => handleTestConnection('slack')}>
                    🔗 Connect
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="settings-section help-section">
        <div className="section-header">
          <h2 className="section-title">❓ Need Help?</h2>
        </div>
        <div className="section-content">
          <div className="help-links">
            <button className="help-link" onClick={() => alert('📖 Documentation coming soon!')}>
              📖 Documentation
            </button>
            <button className="help-link" onClick={() => alert('🎥 Video Tutorials coming soon!')}>
              🎥 Video Tutorials
            </button>
            <button className="help-link" onClick={() => alert('💬 Support Chat coming soon!')}>
              💬 Support Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
