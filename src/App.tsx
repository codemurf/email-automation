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
      // First try to get emails from backend
      const response = await fetch(`${API_BASE_URL}/integrations/gmail/emails`);
      const data = await response.json();
      
      let parsedEmails: Email[] = [];
      
      if (data.emails && data.emails.length > 0) {
        // Analyze email priority using AI
        const emailsWithPriority = await Promise.all(
          data.emails.map(async (email: any, index: number) => {
            // Use AI to determine priority if not already set
            let priority = email.priority || 'medium';
            let category = email.category || 'personal';
            
            // If priority is not set, use AI to analyze it
            if (!email.priority) {
              try {
                const priorityResponse = await fetch(`${API_BASE_URL}/chat/chat`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    message: `Analyze this email priority: "${email.subject}" - respond with HIGH, MEDIUM, or LOW only`
                  })
                });
                
                const priorityData = await priorityResponse.json();
                if (priorityData.response) {
                  const aiPriority = priorityData.response.toUpperCase();
                  if (['HIGH', 'MEDIUM', 'LOW'].includes(aiPriority)) {
                    priority = aiPriority.toLowerCase() as 'high' | 'medium' | 'low';
                  }
                }
              } catch (error) {
                console.log('AI priority analysis failed, using default:', error);
                // Fallback to rule-based priority
                if (email.subject && email.subject.toLowerCase().includes('urgent')) {
                  priority = 'high';
                } else if (email.subject && email.subject.toLowerCase().includes('important')) {
                  priority = 'medium';
                }
              }
            }
            
            // Determine category
            if (email.subject) {
              const subject = email.subject.toLowerCase();
              if (subject.includes('urgent') || subject.includes('asap')) {
                category = 'urgent';
              } else if (subject.includes('meeting') || subject.includes('project')) {
                category = 'work';
              } else if (subject.includes('newsletter') || subject.includes('notification')) {
                category = 'notification';
              }
            }
            
            return {
              id: email.id || `email-${index}`,
              subject: email.subject || 'No Subject',
              from: email.from || 'Unknown',
              date: email.date || new Date().toISOString(),
              snippet: email.snippet || email.body?.substring(0, 100) || '',
              category: category,
              priority: priority,
              isUnread: email.unread !== undefined ? email.unread : true,
              body: email.body || email.snippet || ''
            };
          })
        );
        
        parsedEmails = emailsWithPriority;
        setEmails(parsedEmails);
        
        // Create tasks from work emails
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
      } else {
        // Fallback to mock emails if backend doesn't have any
        const mockEmails: Email[] = [
          {
            id: 'mock-1',
            subject: '🚨 URGENT: Quarterly Report Due Tomorrow',
            from: 'boss@company.com',
            date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            snippet: 'Please submit your quarterly report by EOD tomorrow...',
            category: 'urgent',
            priority: 'high',
            isUnread: true,
            body: 'Hi Team, Just a friendly reminder that quarterly reports are due tomorrow by end of day...'
          },
          {
            id: 'mock-2',
            subject: 'Team Meeting Rescheduled to Wednesday',
            from: 'team-lead@company.com',
            date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            snippet: 'Due to a scheduling conflict, our weekly team meeting has been rescheduled...',
            category: 'work',
            priority: 'medium',
            isUnread: true,
            body: 'Hi Team, Due to a scheduling conflict, our weekly team meeting has been rescheduled...'
          },
          {
            id: 'mock-3',
            subject: 'Weekly Tech Newsletter - Latest Updates',
            from: 'noreply@technews.com',
            date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
            snippet: 'This week in tech: AI breakthroughs, cloud computing trends...',
            category: 'notification',
            priority: 'low',
            isUnread: false,
            body: 'Weekly Tech News Digest: 1. AI Breakthroughs, 2. Cloud Computing Trends...'
          }
        ];
        
        setEmails(mockEmails);
        
        const workTasks: Task[] = mockEmails
          .filter(email => email.category === 'work')
          .map((email, index) => ({
            id: `task-${index}`,
            title: email.subject,
            status: 'Open',
            priority: email.priority,
            source: email.subject,
            completed: false,
            dueDate: undefined
          }));
        setTasks(workTasks);
      }
    } catch (error) {
      console.error('Error fetching emails and tasks:', error);
      // Set fallback mock emails on error
      const mockEmails: Email[] = [
        {
          id: 'fallback-1',
          subject: '🚨 URGENT: Action Required - System Alert',
          from: 'system@company.com',
          date: new Date().toISOString(),
          snippet: 'Critical system alert requires immediate attention...',
          category: 'urgent',
          priority: 'high',
          isUnread: true,
          body: 'A critical system alert has been detected and requires immediate attention...'
        }
      ];
      setEmails(mockEmails);
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
                <span className="stat-icon">📥</span>
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
