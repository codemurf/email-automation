import React from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  Inbox,
  Reply,
  MessageSquare,
  Bot,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import "./DroppableColumn.css";

interface DroppableColumnProps {
  id: string;
  title: string;
  icon: string;
  color: string;
  count: number;
  stats: {
    total: number;
    urgent: number;
    unread: number;
  };
  children: React.ReactNode;
}

const getColumnIcon = (id: string) => {
  switch (id) {
    case "inbox":
      return <Inbox size={16} />;
    case "to-reply":
      return <Reply size={16} />;
    case "replying":
      return <Bot size={16} />;
    case "sent":
      return <CheckCircle2 size={16} />;
    default:
      return <MessageSquare size={16} />;
  }
};

const DroppableColumn: React.FC<DroppableColumnProps> = ({
  id,
  title,
  icon,
  color,
  count,
  stats,
  children,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? "drag-over" : ""}`}
      style={{ "--column-color": color } as React.CSSProperties}
    >
      <div className="column-header">
        <div className="column-title">
          <span className="column-icon">{getColumnIcon(id)}</span>
          <h3>{title}</h3>
          <span className="column-count">{count}</span>
        </div>
        {stats.urgent > 0 && (
          <span className="urgent-badge">
            <AlertCircle size={12} /> {stats.urgent}
          </span>
        )}
      </div>

      <div className="column-body">{children}</div>

      {isOver && (
        <div className="drop-indicator">
          Drop here to {id === "to-reply" ? "auto-reply" : "move"}
        </div>
      )}
    </div>
  );
};

export default DroppableColumn;
