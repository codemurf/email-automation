import React, { useState, useRef, useEffect } from "react";
import "./ChatAssistant.css";
import { API_BASE_URL } from "../config";
import {
  Bot,
  Settings,
  Trash2,
  Mail,
  AlertCircle,
  BarChart2,
  Search,
  Lightbulb,
  User,
  Sparkles,
  ArrowUp,
  Square,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatAssistantProps {
  theme: "light" | "dark";
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ theme }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: `Hello! 👋 I'm your intelligent email assistant, powered by **DeepSeek AI**.

I can help you with:
• **Summarizing your emails** - Get quick overviews of your inbox
• **Finding specific emails** - Search by sender, subject, or content
• **Analyzing email patterns** - Understand your email trends
• **Drafting responses** - Get help composing professional replies

What would you like me to help you with today?`,
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

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  // Load messages from localStorage on component mount
  useEffect(() => {
    const savedMessages = localStorage.getItem("chatMessages");
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        // Convert string timestamps back to Date objects
        const messagesWithDates = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(messagesWithDates);
      } catch (error) {
        console.error("Error loading saved messages:", error);
      }
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

  const shareToSlack = async (content: string) => {
    try {
      // Create a formatted text for Slack
      const slackText = `*Email Assistant Summary*\n\n${content
        .replace(/\*\*/g, "*")
        .replace(/•/g, "•")}`;

      // Get the saved webhook URL from localStorage
      const savedWebhookUrl = localStorage.getItem("slackWebhookUrl");

      console.log("Using webhook URL:", savedWebhookUrl);

      // Use the backend API to send to Slack
      const response = await fetch(`${API_BASE_URL}/integrations/slack/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook_url:
            savedWebhookUrl ||
            "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
          text: slackText,
          username: "Email Assistant",
          icon_emoji: ":email:",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Slack response:", result);
        if (result.success) {
          if (result.mock) {
            alert(
              "⚠️ Slack webhook not configured. Please configure your webhook URL in settings."
            );
          } else {
            alert("✅ Message sent to Slack successfully!");
          }
        } else {
          throw new Error(result.message || "Failed to send to Slack");
        }
      } else {
        throw new Error("Slack API error");
      }
    } catch (error) {
      console.error("Error sending to Slack:", error);
      // Fallback: Copy to clipboard
      const slackText = `*Email Assistant Summary*\n\n${content
        .replace(/\*\*/g, "*")
        .replace(/•/g, "•")}`;
      navigator.clipboard
        .writeText(slackText)
        .then(() => {
          alert(
            "⚠️ Could not send to Slack. Message copied to clipboard instead."
          );
        })
        .catch(() => {
          // Fallback: Create a temporary textarea to copy the text
          const textarea = document.createElement("textarea");
          textarea.value = slackText;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
          alert(
            "⚠️ Could not send to Slack. Message copied to clipboard instead."
          );
        });
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

  const formatMessageContent = (content: string) => {
    // Check for action states
    if (content.includes("Sending email...")) {
      return (
        <div className="flex flex-col gap-2">
          {content.split("\n").map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          <div className="action-progress">
            <div className="progress-label">
              <span>Sending email...</span>
              <span>Sending...</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill"></div>
            </div>
          </div>
        </div>
      );
    }

    if (content.includes("Drafting")) {
      // Allow drafting text to show, but maybe add a small indicator if needed
    }

    const lines = content.split("\n");
    return lines.map((line, idx) => {
      // Handle headers (### Header)
      if (line.trim().startsWith("###")) {
        const text = line.replace(/^###\s*/, "");
        return (
          <div key={idx} className="font-bold text-lg mt-3 mb-2">
            {text}
          </div>
        );
      }

      // Handle subheaders (## or bold headers)
      if (line.trim().startsWith("##")) {
        const text = line.replace(/^##\s*/, "");
        return (
          <div key={idx} className="font-bold text-base mt-2 mb-1">
            {text}
          </div>
        );
      }

      // Handle bullet points with emojis and bold text
      if (
        line.includes("**") ||
        line.trim().startsWith("•") ||
        line.trim().startsWith("-") ||
        line.trim().startsWith("*")
      ) {
        let processedLine = line;

        // Replace markdown bold with spans
        const parts = processedLine.split(/(\*\*.*?\*\*)/g);
        return (
          <div
            key={idx}
            className={
              line.trim().startsWith("•") ||
              line.trim().startsWith("-") ||
              line.trim().startsWith("*")
                ? "ml-4 my-1"
                : "my-1"
            }
          >
            {parts.map((part, i) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                const boldText = part.slice(2, -2);
                return (
                  <strong key={i} className="font-bold text-white">
                    {boldText}
                  </strong>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
        );
      }

      // Handle empty lines
      if (line.trim() === "") {
        return <div key={idx} className="h-2"></div>;
      }

      // Regular text
      return (
        <div key={idx} className="my-1">
          {line}
        </div>
      );
    });
  };

  return (
    <div className={`chat-container ${theme}`}>
      {/* Header */}
      <div className={`chat-header ${theme}`}>
        <div className="header-content">
          <div className="header-left">
            <div className={`bot-avatar ${theme}`}>
              <Bot size={16} color="white" />
            </div>
            <div>
              <h2 className={`header-title ${theme}`}>AI Email Assistant</h2>
              <p className={`header-subtitle ${theme}`}>
                Powered by DeepSeek •{" "}
                <span className="online-indicator">●</span> Online
              </p>
            </div>
          </div>
          <div className="header-actions">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`settings-btn ${theme}`}
              title="Settings"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={() => setMessages([messages[0]])}
              className={`clear-btn ${theme}`}
            >
              <Trash2 size={14} />
              <span>Clear Chat</span>
            </button>
          </div>
        </div>
      </div>

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
                Enter your Slack webhook URL to share messages directly to Slack
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
            <div
              key={message.id}
              className={`message-row ${message.role} group`}
              style={{
                animation:
                  index === messages.length - 1
                    ? "fadeIn 0.3s ease-out"
                    : "none",
              }}
            >
              {/* Avatar */}
              <div className={`message-avatar ${message.role} ${theme}`}>
                {message.role === "user" ? (
                  <User size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
              </div>

              {/* Message Content */}
              <div className="message-content">
                <div className="message-header">
                  <span className={`message-sender ${theme}`}>
                    {message.role === "user" ? "You" : "AI Assistant"}
                  </span>
                  <span className={`message-time ${theme}`}>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className={`message-bubble ${message.role} ${theme} relative`}
                >
                  {message.role === "assistant" && (
                    <button
                      onClick={() => shareToSlack(message.content)}
                      className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 ${
                        theme === "dark"
                          ? "bg-purple-600/20 hover:bg-purple-600/30 text-purple-300"
                          : "bg-blue-50 hover:bg-blue-100 text-blue-600"
                      }`}
                      title="Share to Slack"
                    >
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                      </svg>
                    </button>
                  )}
                  <div
                    className={`message-text ${theme} ${
                      message.role === "assistant" ? "pr-8" : ""
                    }`}
                  >
                    {formatMessageContent(message.content)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="message-row assistant animate-fadeIn">
              <div className={`message-avatar assistant ${theme}`}>
                <Bot size={14} color="white" />
              </div>
              <div className="message-content">
                <span className={`message-sender ${theme}`}>AI Assistant</span>
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
          </p>
        </div>
      </div>

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
