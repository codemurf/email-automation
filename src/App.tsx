import React, { useState, useEffect } from 'react';
import './App.css';
import AgentDashboard from './components/AgentDashboard';
import LogViewer from './components/LogViewer';
import EmailInbox from './components/EmailInbox';
import TodoList from './components/TodoList';
import EmailKanban from './components/EmailKanban';
import AgentWorkflow from './components/AgentWorkflow';
import Settings from './components/Settings';
import ChatAssistant from './components/ChatAssistant';

const API_BASE_URL = 'http://localhost:9000/api/v1';

interface AgentState {
  agent_id: string;
  name: string;
  role: string;
  status: string;
  progress: number;
  current_task: any;
  logs: any[];
}

interface SystemState {
  agents: AgentState[];
  memory: any;
  events: any[];
  timestamp: string;
}

interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  category: 'work' | 'personal' | 'urgent' | 'notification';
  priority: 'high' | 'medium' | 'low';
  isUnread: boolean;
  body?: string;
  columnId?: 'inbox' | 'to-reply' | 'replying' | 'sent';
}

interface Task {
  id: string;
  title: string;
  status: 'Open' | 'In Progress' | 'Closed' | 'Pending';
  priority: 'high' | 'medium' | 'low';
  source: string;
  dueDate?: string;
  completed: boolean;
}

function App() {
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'agents' | 'inbox' | 'tasks' | 'kanban' | 'workflow' | 'chat' | 'settings'>('kanban');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Connect to SSE stream
  useEffect(() => {
    connectToEventStream();
    fetchInitialState();
    fetchEmailsAndTasks();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectToEventStream = () => {
    const es = new EventSource(`${API_BASE_URL}/agents/events/stream`);

    es.onopen = () => {
      console.log('✅ Connected to event stream');
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'init' || data.type === 'status') {
          setSystemState(data.data);
          setIsConnected(true);
        } else if (data.type === 'event') {
          console.log('Event received:', data.data);
        } else if (data.type === 'heartbeat') {
          setIsConnected(true);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    es.onerror = (error) => {
      console.error('❌ SSE connection error:', error);
      setIsConnected(false);
      es.close();
      
      setTimeout(() => {
        console.log('🔄 Reconnecting...');
        connectToEventStream();
      }, 5000);
    };

    setEventSource(es);
  };

  const fetchInitialState = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/status`);
      const data = await response.json();
      if (data.status === 'success') {
        setSystemState(data.agents);
      }
    } catch (error) {
      console.error('Error fetching initial state:', error);
    }
  };

  const fetchEmailsAndTasks = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/report`);
      const data = await response.json();
      
      if (data.status === 'success' && data.report) {
        const report = data.report;
        
        if (report.emails && report.emails.length > 0) {
          const parsedEmails: Email[] = report.emails.map((email: any, index: number) => ({
            id: email.id || `email-${index}`,
            subject: email.subject || 'No Subject',
            from: email.from || 'Unknown',
            date: email.date || new Date().toISOString(),
            snippet: email.snippet || email.body?.substring(0, 100) || '',
            category: email.category || 'personal',
            priority: email.priority || (email.category === 'urgent' ? 'high' : 'medium'),
            isUnread: email.unread !== undefined ? email.unread : true,
            body: email.body || email.snippet || ''
          }));
          setEmails(parsedEmails);
          
          const workTasks: Task[] = parsedEmails
            .filter(email => email.category === 'work')
            .map((email, index) => {
              const statusMatch = email.subject.match(/\((.*?)\)$/);
              
              return {
                id: `task-${index}`,
                title: email.subject,
                status: statusMatch ? (statusMatch[1] as any) : 'Open',
                priority: email.priority,
                source: email.subject,
                completed: !!(statusMatch && statusMatch[1] === 'Closed'),
                dueDate: undefined
              };
            });
          setTasks(workTasks);
        }
      }
    } catch (error) {
      console.error('Error fetching emails and tasks:', error);
    }
  };

  const handleReplyEmail = async (emailId: string): Promise<void> => {
    try {
      console.log(`🤖 Triggering AI agent to reply to email: ${emailId}`);
      
      const response = await fetch(`${API_BASE_URL}/agents/reply-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_id: emailId }),
      });

      const data = await response.json();
      console.log('Reply sent successfully:', data);
      
      if (data.status === 'success') {
        console.log(`✅ Email ${emailId} reply sent, will move to Sent column`);
      }
      
    } catch (error) {
      console.error('Error generating reply:', error);
      throw error;
    }
  };

  const handleEmailMove = (emailId: string, toColumnId: 'inbox' | 'to-reply' | 'replying' | 'sent'): void => {
    setEmails(prevEmails => 
      prevEmails.map(email => 
        email.id === emailId 
          ? { ...email, columnId: toColumnId }
          : email
      )
    );
    console.log(`📧 Email ${emailId} moved to ${toColumnId} column`);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className={`App ${theme}`}>
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-wrapper">
            <div className="logo-icon">🤖</div>
            <div className="logo-text">
              <h1>AI Workflow</h1>
              <p className="subtitle">Automation System</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-section">
            <div className="menu-section-title">Navigation</div>
            
            <button
              className={`menu-item ${activeTab === 'kanban' ? 'active' : ''}`}
              onClick={() => setActiveTab('kanban')}
            >
              <span className="menu-icon">📋</span>
              <span className="menu-label">Workflow Board</span>
              <span className="menu-arrow">›</span>
            </button>

            <button
              className={`menu-item ${activeTab === 'workflow' ? 'active' : ''}`}
              onClick={() => setActiveTab('workflow')}
            >
              <span className="menu-icon">🔄</span>
              <span className="menu-label">Agent Pipeline</span>
              <span className="menu-arrow">›</span>
            </button>

            <button
              className={`menu-item ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              <span className="menu-icon">💬</span>
              <span className="menu-label">Chat Assistant</span>
              <span className="menu-arrow">›</span>
            </button>

            <button
              className={`menu-item ${activeTab === 'agents' ? 'active' : ''}`}
              onClick={() => setActiveTab('agents')}
            >
              <span className="menu-icon">🤖</span>
              <span className="menu-label">AI Agents</span>
              <span className="menu-arrow">›</span>
            </button>

            <button
              className={`menu-item ${activeTab === 'inbox' ? 'active' : ''}`}
              onClick={() => setActiveTab('inbox')}
            >
              <span className="menu-icon">📧</span>
              <span className="menu-label">Email Inbox</span>
              <span className="menu-arrow">›</span>
            </button>

            <button
              className={`menu-item ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              <span className="menu-icon">✓</span>
              <span className="menu-label">Task Manager</span>
              <span className="menu-arrow">›</span>
            </button>
          </div>

          <div className="menu-section preferences-section">
            <div className="menu-section-title">Preferences</div>
            
            <button className="menu-item" onClick={toggleTheme}>
              <span className="menu-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
              <span className="menu-label">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              <span className="menu-arrow">›</span>
            </button>

            <button
              className={`menu-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span className="menu-icon">⚙️</span>
              <span className="menu-label">Settings</span>
              <span className="menu-arrow">›</span>
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
            <div className="main-content">
        {/* Top Header Bar with Profile */}
        <header className="top-header">
          <div className="header-left">
            <h2 className="page-title">Workflow Dashboard</h2>
          </div>
          
          <div className="header-right">
            {/* Stats Bar - Compact */}
            <div className="stats-compact">
              <div className="stat-compact blue">
                <span className="stat-icon">�</span>
                <span className="stat-count">{emails.filter(e => e.columnId === 'inbox' || !e.columnId).length}</span>
                <span className="stat-label">Inbox</span>
              </div>

              <div className="stat-compact orange">
                <span className="stat-icon">⏳</span>
                <span className="stat-count">{emails.filter(e => e.columnId === 'to-reply').length}</span>
                <span className="stat-label">Pending</span>
              </div>

              <div className="stat-compact purple">
                <span className="stat-icon">✍️</span>
                <span className="stat-count">{emails.filter(e => e.columnId === 'replying').length}</span>
                <span className="stat-label">Processing</span>
              </div>

              <div className="stat-compact green">
                <span className="stat-icon">✅</span>
                <span className="stat-count">{emails.filter(e => e.columnId === 'sent').length}</span>
                <span className="stat-label">Sent</span>
              </div>
            </div>

            {/* Profile Section */}
            <div className="profile-section">
              <div className="profile-info">
                <span className="profile-name">Abhishek R</span>
                <span className="profile-email">abhishek.r@cisinlabs.com</span>
              </div>
              <div className="profile-avatar">
                <span>AR</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="container">
          {activeTab === 'kanban' && (
            <EmailKanban 
              emails={emails}
              onReplyEmail={handleReplyEmail}
              onEmailMove={handleEmailMove}
            />
          )}

          {activeTab === 'workflow' && (
            <AgentWorkflow />
          )}

          {activeTab === 'chat' && (
            <ChatAssistant theme={theme} />
          )}

          {activeTab === 'settings' && (
            <Settings theme={theme} onThemeToggle={toggleTheme} />
          )}

          {activeTab === 'agents' && systemState && (
            <>
              <AgentDashboard agents={systemState.agents} />
              <LogViewer 
                agents={systemState.agents}
                events={systemState.events || []}
              />
            </>
          )}

          {activeTab === 'inbox' && (
            <EmailInbox emails={emails} />
          )}

          {activeTab === 'tasks' && (
            <TodoList tasks={tasks} />
          )}
        </div>

        <footer className="App-footer">
          <p>Powered by FastAPI + React | AI Workflow Automation v1.0</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
