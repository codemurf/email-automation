import React, { memo } from "react";
import { Bot, User, Square } from "lucide-react";
import "./ChatAssistant.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatMessageItemProps {
  message: Message;
  theme: "light" | "dark";
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = memo(
  ({ message, theme }) => {
    const formatMessageContent = (content: string) => {
      // Pre-clean: Remove leading pipe (ASCII or Unicode) if it's the very first character
      if (content.trim().match(/^[|｜│┃]/)) {
        content = content.replace(/^[\s|｜│┃]+/, "");
      }

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
              </div>
              <div className="progress-track">
                <div className="progress-fill"></div>
              </div>
            </div>
          </div>
        );
      }

      // Check for stopped state
      if (content.includes("🛑 *Stopped by user.*")) {
        return (
          <div className="flex items-center gap-2 text-red-500 font-medium">
            <Square size={16} fill="currentColor" />
            <span>Stopped by user</span>
          </div>
        );
      }

      const lines = content.split("\n");
      return lines.map((line, idx) => {
        // Skip lines that are just pipe characters or empty
        if (/^[\s|｜│┃]*$/.test(line)) {
          return line.trim() === "" ? (
            <div key={idx} className="h-2"></div>
          ) : null;
        }

        // Remove leading pipe characters from any line
        const cleanedLine = line.replace(/^[\s|｜│┃]+/, "");

        // Handle headers (### Header)
        if (cleanedLine.trim().startsWith("###")) {
          const text = cleanedLine.replace(/^###\s*/, "");
          return (
            <div key={idx} className="font-bold text-lg mt-3 mb-2">
              {text}
            </div>
          );
        }

        // Handle subheaders (## or bold headers)
        if (cleanedLine.trim().startsWith("##")) {
          const text = cleanedLine.replace(/^##\s*/, "");
          return (
            <div key={idx} className="font-bold text-base mt-2 mb-1">
              {text}
            </div>
          );
        }

        // Handle bullet points with emojis and bold text
        if (
          cleanedLine.includes("**") ||
          cleanedLine.trim().startsWith("•") ||
          cleanedLine.trim().startsWith("-") ||
          cleanedLine.trim().startsWith("*")
        ) {
          let processedLine = cleanedLine;
          // Replace markdown bold with spans
          const parts = processedLine.split(/(\*\*.*?\*\*)/g);
          return (
            <div
              key={idx}
              className={
                cleanedLine.trim().startsWith("•") ||
                cleanedLine.trim().startsWith("-") ||
                cleanedLine.trim().startsWith("*")
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

        // Regular text
        return (
          <div key={idx} className="my-1">
            {cleanedLine}
          </div>
        );
      });
    };

    const isUser = message.role === "user";

    return (
      <div className={`message-row ${isUser ? "user" : "assistant"} ${theme}`}>
        <div
          className={`message-avatar ${isUser ? "user" : "assistant"} ${theme}`}
        >
          {isUser ? (
            <User size={18} color="white" />
          ) : (
            <Bot size={18} color="white" />
          )}
        </div>
        <div className="message-content">
          <div className="message-header">
            <span className={`message-sender ${theme}`}>
              {isUser ? "You" : "AI Assistant"}
            </span>
            <span className={`message-time ${theme}`}>
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div
            className={`message-bubble ${isUser ? "user" : "assistant"} ${theme}`}
          >
            <div className={`message-text ${theme}`}>
              {formatMessageContent(message.content)}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

export default ChatMessageItem;
