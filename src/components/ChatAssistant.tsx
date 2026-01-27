import React, { useState, useRef, useEffect } from "react";
import "./ChatAssistant.css";
import { API_BASE_URL } from "../config";
import ChatMessageItem from "./ChatMessageItem";
import {
  Bot,
  Trash2,
  Mail,
  AlertCircle,
  BarChart2,
  Search,
  Lightbulb,
  ArrowUp,
  Square,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatAssistantProps {
  theme: "light" | "dark";
}

const WELCOME_MESSAGE = `Hello! 👋 I'm your AI assistant.

I can help you with:
• **General questions** - Ask me anything
• **Email tasks** - Summarize, find, or draft emails
• **Research** - Search the web and analyze info
• **Writing** - Help compose professional content

What would you like me to help you with today?`;

const ChatAssistant: React.FC<ChatAssistantProps> = ({ theme }) => {
  // Session state
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Message state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: WELCOME_MESSAGE,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================
  // Session Management Functions
  // ============================================

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error("Failed to load sessions", e);
    }
  };

  const createSession = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/chat/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New Chat" }),
      });
      if (res.ok) {
        const data = await res.json();
        setSessions((prev) => [data.session, ...prev]);
        setActiveSessionId(data.session.id);
        setMessages([
          {
            id: "1",
            role: "assistant",
            content: WELCOME_MESSAGE,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (e) {
      console.error("Failed to create session", e);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
        method: "DELETE",
      });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([
          {
            id: "1",
            role: "assistant",
            content: WELCOME_MESSAGE,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (e) {
      console.error("Failed to delete session", e);
    }
  };

  const switchSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/chat/sessions/${sessionId}/messages`,
      );
      if (res.ok) {
        const data = await res.json();
        const mapped = data.messages.map((m: any) => ({
          id: m.id.toString(),
          role: m.role,
          content: m.content,
          timestamp: new Date(m.timestamp),
        }));
        setMessages([
          {
            id: "1",
            role: "assistant",
            content: WELCOME_MESSAGE,
            timestamp: new Date(),
          },
          ...mapped,
        ]);
      }
    } catch (e) {
      console.error("Failed to load session messages", e);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "🛑 *Stopped by user.*",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Load saved webhook URL from localStorage
  useEffect(() => {
    const savedUrl = localStorage.getItem("slackWebhookUrl");
    if (savedUrl) {
      setSlackWebhookUrl(savedUrl);
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  const handleSend = async () => {
    if (isLoading) {
      handleStop();
      return;
    }
    if (!input.trim()) return;

    // Create session if none exists
    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      try {
        const title =
          input.length > 30 ? input.substring(0, 30) + "..." : input;
        const res = await fetch(`${API_BASE_URL}/chat/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (res.ok) {
          const data = await res.json();
          setSessions((prev) => [data.session, ...prev]);
          currentSessionId = data.session.id;
          setActiveSessionId(currentSessionId);
        }
      } catch (e) {
        console.error("Failed to create session automatically", e);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: input,
          session_id: currentSessionId, // Send session ID
          conversation_history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Rename session if it's "New Chat"
        const currentSession = sessions.find((s) => s.id === currentSessionId);
        if (currentSession && currentSession.title === "New Chat") {
          const newTitle =
            input.length > 30 ? input.substring(0, 30) + "..." : input;
          fetch(`${API_BASE_URL}/chat/sessions/${currentSessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newTitle }),
          })
            .then((res) => {
              if (res.ok) {
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === currentSessionId ? { ...s, title: newTitle } : s,
                  ),
                );
              }
            })
            .catch(console.error);
        }
      } else {
        throw new Error("Failed to get response");
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Request aborted");
        return;
      }
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "❌ Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  const suggestedPrompts = [
    {
      icon: <Mail size={16} />,
      text: "Summarize today's emails",
      colorClass: "from-blue-500",
    },
    {
      icon: <AlertCircle size={16} />,
      text: "Show urgent emails",
      colorClass: "from-red-500",
    },
    {
      icon: <BarChart2 size={16} />,
      text: "Email statistics",
      colorClass: "from-green-500",
    },
    {
      icon: <Search size={16} />,
      text: "Find work emails",
      colorClass: "from-purple-500",
    },
  ];

  // Clear chat history from backend and local state
  const clearChat = async () => {
    try {
      // Call backend to clear history
      await fetch(`${API_BASE_URL}/chat/history`, {
        method: "DELETE",
      });

      // Clear localStorage
      localStorage.removeItem("chatMessages");

      // Reset to welcome message only
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: `Hello! 👋 I'm your intelligent email assistant.

I can help you with:
• **Summarizing your emails** - Get quick overviews of your inbox
• **Finding specific emails** - Search by sender, subject, or content
• **Drafting responses** - Get help composing professional replies

What would you like me to help you with today?`,
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Error clearing chat:", error);
    }
  };

  return (
    <div className={`chat-container ${theme}`}>
      {/* Left Sidebar - Chat History */}
      <div
        className={`chat-sidebar ${isSidebarOpen ? "open" : "closed"} ${theme}`}
      >
        <div className="sidebar-header">
          <button onClick={createSession} className={`new-chat-btn ${theme}`}>
            <Plus size={16} />
            <span>New Chat</span>
          </button>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className={`sidebar-close-btn ${theme}`}
            title="Close sidebar"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>

        <div className="sidebar-sessions">
          {sessions.length === 0 ? (
            <p className="no-sessions">No chat history yet</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${activeSessionId === session.id ? "active" : ""} ${theme}`}
                onClick={() => switchSession(session.id)}
              >
                <MessageSquare size={14} />
                <span className="session-title">{session.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="session-delete-btn"
                  title="Delete chat"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sidebar Toggle (when closed) */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className={`sidebar-toggle-btn ${theme}`}
          title="Open sidebar"
        >
          <PanelLeft size={18} />
        </button>
      )}

      {/* Main Chat Area */}
      <div
        className={`chat-main ${isSidebarOpen ? "with-sidebar" : "full-width"}`}
      >
        {/* Settings Panel */}
        {showSettings && (
          <div className={`settings-panel ${theme}`}>
            <div className="settings-content">
              <h3 className={`settings-title ${theme}`}>Settings</h3>
              <div className="setting-item">
                <label className={`setting-label ${theme}`}>
                  Slack Webhook URL
                </label>
                <input
                  type="text"
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className={`setting-input ${theme}`}
                />
                <p className={`setting-help ${theme}`}>
                  Enter your Slack webhook URL to share messages directly to
                  Slack
                </p>
              </div>
              <div className="settings-actions">
                <button
                  onClick={() => {
                    console.log("Saving webhook URL:", slackWebhookUrl);
                    localStorage.setItem("slackWebhookUrl", slackWebhookUrl);
                    setShowSettings(false);
                    alert("Settings saved!");
                  }}
                  className={`save-btn ${theme}`}
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className={`cancel-btn ${theme}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="messages-area">
          <div className="messages-container">
            {messages.map((message, index) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                theme={theme}
              />
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="message-row assistant animate-fadeIn">
                <div className={`message-avatar assistant ${theme}`}>
                  <Bot size={14} color="white" />
                </div>
                <div className="message-content">
                  <span className={`message-sender ${theme}`}>
                    AI Assistant
                  </span>
                  <div className={`message-bubble assistant ${theme}`}>
                    <div className="typing-indicator">
                      <div className={`typing-dot ${theme}`}></div>
                      <div className={`typing-dot ${theme}`}></div>
                      <div className={`typing-dot ${theme}`}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Suggested Prompts - Inside messages area */}
            {messages.length === 1 && (
              <div className="prompts-section">
                <div className="prompts-container">
                  <p className={`prompts-title ${theme}`}>
                    <Lightbulb size={14} /> Try asking:
                  </p>
                  <div className="prompts-grid">
                    {suggestedPrompts.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInput(prompt.text)}
                        className={`prompt-card ${theme}`}
                      >
                        <div className="prompt-content">
                          <div className={`prompt-icon ${prompt.colorClass}`}>
                            {prompt.icon}
                          </div>
                          <span className={`prompt-text ${theme}`}>
                            {prompt.text}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className={`input-section ${theme}`}>
          <div className="input-container">
            <div className={`input-wrapper ${theme}`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Message AI Assistant..."
                className={`input-textarea ${theme}`}
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() && !isLoading}
                className={`send-btn ${
                  input.trim() || isLoading ? "active" : "disabled"
                } ${theme}`}
                title={isLoading ? "Stop generating" : "Send message"}
              >
                {isLoading ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <ArrowUp className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className={`input-hint ${theme}`}>
              Press <kbd className={`kbd-key ${theme}`}>Enter</kbd> to send,
              <kbd className={`kbd-key ${theme}`}>Shift+Enter</kbd> for new line
              <span className="hint-separator">|</span>
              <button
                onClick={clearChat}
                className={`clear-chat-btn ${theme}`}
                title="Clear chat history"
              >
                <Trash2 size={12} />
                <span>Clear Chat</span>
              </button>
            </p>
          </div>
        </div>
      </div>
      {/* End of chat-main */}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ChatAssistant;
