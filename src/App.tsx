import React, { useState, useEffect } from "react";
import "./App.css";
import {
  LayoutDashboard,
  MessageSquare,
  CheckSquare,
  Settings as SettingsIcon,
} from "lucide-react";
import AgentDashboard from "./components/AgentDashboard";
import LogViewer from "./components/LogViewer";
import EmailInbox from "./components/EmailInbox";
import TodoList from "./components/TodoList";
import EmailKanban from "./components/EmailKanban";
import AgentWorkflow from "./components/AgentWorkflow";
import Settings from "./components/Settings";
import EmailModal from "./components/EmailModal";
import ChatAssistant from "./components/ChatAssistant";
import { API_BASE_URL } from "./config";

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
  category: "work" | "personal" | "urgent" | "notification";
  priority: "high" | "medium" | "low";
  isUnread: boolean;
  body?: string;
  columnId?: "inbox" | "to-reply" | "replying" | "sent";
}

interface Task {
  id: string;
  title: string;
  status: "Open" | "In Progress" | "Closed" | "Pending";
  priority: "high" | "medium" | "low";
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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "agents" | "inbox" | "tasks" | "kanban" | "workflow" | "chat" | "settings"
  >("kanban");

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
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "init" || data.type === "status") {
          setSystemState(data.data);
          setIsConnected(true);
        } else if (data.type === "heartbeat") {
          setIsConnected(true);
        }
      } catch (error) {
        // Silent error handling
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      setTimeout(() => {
        connectToEventStream();
      }, 5000);
    };

    setEventSource(es);
  };

  const fetchInitialState = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/status`);
      const data = await response.json();
      if (data.status === "success") {
        setSystemState(data.agents);
      }
    } catch (error) {
      // Silent error handling
    }
  };

  const fetchEmailsAndTasks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/integrations/gmail/emails`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      let parsedEmails: Email[] = [];

      if (data.emails && data.emails.length > 0) {
        parsedEmails = data.emails.map((email: any, index: number) => ({
          id: email.id || `email-${index}`,
          subject: email.subject || "No Subject",
          from: email.from || "Unknown",
          date: email.date || new Date().toISOString(),
          snippet: email.snippet || "",
          category: email.category || "personal",
          priority: email.priority || "medium",
          isUnread: email.unread !== undefined ? email.unread : true,
          body: email.body || email.snippet || "",
        }));

        setEmails(parsedEmails);

        const workTasks: Task[] = parsedEmails
          .filter((email) => email.category === "work")
          .map((email, index) => {
            const statusMatch = email.subject.match(/\((.*?)\)$/);
            return {
              id: `task-${index}`,
              title: email.subject,
              status: statusMatch ? (statusMatch[1] as any) : "Open",
              priority: email.priority,
              source: email.from,
              completed: !!(statusMatch && statusMatch[1] === "Closed"),
              dueDate: undefined,
            };
          });
        setTasks(workTasks);
      } else {
        const mockEmails: Email[] = [
          {
            id: "mock-1",
            subject: "URGENT: Quarterly Report Due Tomorrow",
            from: "boss@company.com",
            date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            snippet: "Please submit your quarterly report by EOD tomorrow...",
            category: "urgent",
            priority: "high",
            isUnread: true,
            body: "Hi Team, Just a friendly reminder that quarterly reports are due tomorrow by end of day...",
          },
          {
            id: "mock-2",
            subject: "Team Meeting Rescheduled to Wednesday",
            from: "team-lead@company.com",
            date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            snippet:
              "Due to a scheduling conflict, our weekly team meeting has been rescheduled...",
            category: "work",
            priority: "medium",
            isUnread: true,
            body: "Hi Team, Due to a scheduling conflict, our weekly team meeting has been rescheduled...",
          },
        ];

        setEmails(mockEmails);
        const workTasks: Task[] = mockEmails
          .filter((email) => email.category === "work")
          .map((email, index) => ({
            id: `task-${index}`,
            title: email.subject,
            status: "Open",
            priority: email.priority,
            source: email.subject,
            completed: false,
            dueDate: undefined,
          }));
        setTasks(workTasks);
      }
    } catch (error) {
      const mockEmails: Email[] = [
        {
          id: "fallback-1",
          subject: "Welcome to MailGen",
          from: "system@mailgen.ai",
          date: new Date().toISOString(),
          snippet: "Connect your Gmail account to get started...",
          category: "notification",
          priority: "medium",
          isUnread: true,
          body: "Welcome to MailGen! Go to Settings to connect your Gmail account.",
        },
      ];
      setEmails(mockEmails);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalSendReply = async (
    emailId: string,
    content: string,
    tone: string
  ) => {
    setIsSendingReply(true);
    try {
      const response = await fetch(`${API_BASE_URL}/integrations/gmail/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_id: emailId, content, tone }),
      });

      if (!response.ok) throw new Error("Failed to send reply");
      fetchEmailsAndTasks();
    } catch (error) {
      console.error("Error sending reply:", error);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleReplyEmail = async (emailId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/integrations/gmail/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_id: emailId }),
      });

      if (!response.ok) throw new Error("Failed to send reply");
      fetchEmailsAndTasks();
    } catch (error) {
      console.error("Error replying to email:", error);
    }
  };

  const handleEmailMove = (
    emailId: string,
    toColumnId: "inbox" | "to-reply" | "replying" | "sent"
  ): void => {
    setEmails((prev) =>
      prev.map((email) =>
        email.id === emailId ? { ...email, columnId: toColumnId } : email
      )
    );
  };

  return (
    <div className="App">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/mailgen-logo.png" alt="MailGen" className="logo-image" />
          <div className="logo-text">
            <h1>MailGen</h1>
            <p className="subtitle">Precision Automation</p>
          </div>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-section-title">Navigation</div>

          <button
            className={`menu-item ${activeTab === "kanban" ? "active" : ""}`}
            onClick={() => setActiveTab("kanban")}
          >
            <LayoutDashboard size={18} />
            <span className="menu-label">Workflow Board</span>
          </button>

          <button
            className={`menu-item ${activeTab === "chat" ? "active" : ""}`}
            onClick={() => setActiveTab("chat")}
          >
            <MessageSquare size={18} />
            <span className="menu-label">Chat Assistant</span>
          </button>

          <button
            className={`menu-item ${activeTab === "tasks" ? "active" : ""}`}
            onClick={() => setActiveTab("tasks")}
          >
            <CheckSquare size={18} />
            <span className="menu-label">Task Manager</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            className={`menu-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <SettingsIcon size={18} />
            <span className="menu-label">Settings</span>
          </button>
          <div
            className={`status-indicator ${
              isConnected ? "connected" : "disconnected"
            }`}
          >
            <span className="status-dot"></span>
            {isConnected ? "Connected" : "Disconnected"}
          </div>
        </div>
      </aside>

      <div
        className={`main-content ${activeTab === "chat" ? "chat-view" : ""}`}
      >
        <header className="top-header">
          <div className="header-left">
            <h2 className="page-title">Workflow Dashboard</h2>
          </div>

          <div className="header-right">
            <div className="stats-compact">
              <div className="stat-compact blue">
                <span className="stat-count">
                  {
                    emails.filter((e) => e.columnId === "inbox" || !e.columnId)
                      .length
                  }
                </span>
                <span className="stat-label">Inbox</span>
              </div>

              <div className="stat-compact orange">
                <span className="stat-count">
                  {emails.filter((e) => e.columnId === "to-reply").length}
                </span>
                <span className="stat-label">Pending</span>
              </div>

              <div className="stat-compact purple">
                <span className="stat-count">
                  {emails.filter((e) => e.columnId === "replying").length}
                </span>
                <span className="stat-label">Processing</span>
              </div>

              <div className="stat-compact green">
                <span className="stat-count">
                  {emails.filter((e) => e.columnId === "sent").length}
                </span>
                <span className="stat-label">Sent</span>
              </div>
            </div>

            <div className="profile-section">
              <div className="profile-info">
                <span className="profile-name">Admin User</span>
                <span className="profile-email">admin@system.com</span>
              </div>
              <div className="profile-avatar">
                <span>AD</span>
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">
          {activeTab === "kanban" && (
            <EmailKanban
              emails={emails}
              onReplyEmail={handleReplyEmail}
              onEmailMove={handleEmailMove}
              onEmailClick={(email) => setSelectedEmail(email)}
              isLoading={isLoading}
            />
          )}

          {activeTab === "workflow" && <AgentWorkflow />}
          {activeTab === "chat" && <ChatAssistant theme="dark" />}
          {activeTab === "settings" && (
            <Settings theme="dark" onThemeToggle={() => {}} />
          )}
          {activeTab === "agents" && systemState && (
            <>
              <AgentDashboard agents={systemState.agents} />
              <LogViewer
                agents={systemState.agents}
                events={systemState.events || []}
              />
            </>
          )}
          {activeTab === "inbox" && <EmailInbox emails={emails} />}
          {activeTab === "tasks" && <TodoList tasks={tasks} />}
        </div>

        {selectedEmail && (
          <EmailModal
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
            onSendReply={handleModalSendReply}
            isSending={isSendingReply}
          />
        )}
      </div>
    </div>
  );
}

export default App;
