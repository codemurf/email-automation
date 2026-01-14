import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Mail,
  Inbox,
  Bot,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
} from "lucide-react";
import "./EmailKanban.css";
import EmailCard from "./EmailCard";
import DroppableColumn from "./DroppableColumn";

export interface Email {
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

interface EmailKanbanProps {
  emails?: Email[];
  onReplyEmail?: (emailId: string) => Promise<void>;
  onEmailMove?: (
    emailId: string,
    toColumnId: "inbox" | "to-reply" | "replying" | "sent"
  ) => void;
  onEmailClick?: (email: Email) => void;
  isLoading?: boolean;
}

const EmailKanban: React.FC<EmailKanbanProps> = ({
  emails = [],
  onReplyEmail,
  onEmailMove,
  onEmailClick,
  isLoading = false,
}) => {
  const [columns, setColumns] = useState({
    inbox: {
      id: "inbox",
      title: "Inbox",
      icon: "inbox",
      color: "#3b82f6",
      emails: [] as Email[],
    },
    // ... other columns
    "to-reply": {
      id: "to-reply",
      title: "To Reply",
      icon: "reply",
      color: "#f59e0b",
      emails: [] as Email[],
    },
    replying: {
      id: "replying",
      title: "Replying",
      icon: "bot",
      color: "#8b5cf6",
      emails: [] as Email[],
    },
    sent: {
      id: "sent",
      title: "Sent",
      icon: "sent",
      color: "#10b981",
      emails: [] as Email[],
    },
  });

  const [activeEmail, setActiveEmail] = useState<Email | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Initialize emails in inbox column
  useEffect(() => {
    if (emails.length > 0) {
      // Sort emails by date (latest first) and limit to 20
      const sortedEmails = emails
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20);

      const emailsWithColumn = sortedEmails.map((email) => ({
        ...email,
        columnId: email.columnId || "inbox",
      }));

      const newColumns = { ...columns };
      newColumns.inbox.emails = emailsWithColumn.filter(
        (e) => e.columnId === "inbox"
      );
      newColumns["to-reply"].emails = emailsWithColumn.filter(
        (e) => e.columnId === "to-reply"
      );
      newColumns.replying.emails = emailsWithColumn.filter(
        (e) => e.columnId === "replying"
      );
      newColumns.sent.emails = emailsWithColumn.filter(
        (e) => e.columnId === "sent"
      );

      setColumns(newColumns);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emails]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const email = findEmail(active.id as string);
    setActiveEmail(email || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveEmail(null);
      return;
    }

    const emailId = active.id as string;
    const targetColumnId = over.id as string;

    const email = findEmail(emailId);
    const sourceColumnId = email?.columnId;

    if (
      email &&
      sourceColumnId &&
      targetColumnId &&
      sourceColumnId !== targetColumnId
    ) {
      // Move email to new column
      moveEmail(emailId, sourceColumnId, targetColumnId);

      // If moved to "to-reply" column, trigger AI agent to write reply
      if (targetColumnId === "to-reply") {
        await handleAutoReply(email);
      }
    }

    setActiveEmail(null);
  };

  const findEmail = (emailId: string): Email | undefined => {
    for (const column of Object.values(columns)) {
      const email = column.emails.find((e) => e.id === emailId);
      if (email) return email;
    }
    return undefined;
  };

  const moveEmail = (
    emailId: string,
    fromColumnId: string,
    toColumnId: string
  ) => {
    setColumns((prev) => {
      const newColumns = { ...prev };
      const fromColumn = newColumns[fromColumnId as keyof typeof newColumns];
      const toColumn = newColumns[toColumnId as keyof typeof newColumns];

      const emailIndex = fromColumn.emails.findIndex((e) => e.id === emailId);
      if (emailIndex > -1) {
        const [email] = fromColumn.emails.splice(emailIndex, 1);
        email.columnId = toColumnId as any;
        toColumn.emails.push(email);

        // Notify parent component of the move
        if (onEmailMove) {
          onEmailMove(emailId, toColumnId as any);
        }
      }

      return newColumns;
    });
  };

  const handleAutoReply = async (email: Email) => {
    try {
      setIsProcessing(email.id);

      // Move to "replying" column to show agent is working
      setTimeout(() => {
        moveEmail(email.id, "to-reply", "replying");
      }, 500);

      // Call backend API to generate and send reply
      if (onReplyEmail) {
        await onReplyEmail(email.id);
      } else {
        // Simulate AI reply generation
        await simulateReplyGeneration(email);
      }

      // Move to "sent" column after reply is sent
      setTimeout(() => {
        moveEmail(email.id, "replying", "sent");
        setIsProcessing(null);
      }, 3000);
    } catch (error) {
      console.error("Error generating reply:", error);
      // Move back to "to-reply" on error
      moveEmail(email.id, "replying", "to-reply");
      setIsProcessing(null);
    }
  };

  const simulateReplyGeneration = async (email: Email): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`AI Agent generating reply for: ${email.subject}`);
        console.log(`Sending reply to: ${email.from}`);
        resolve();
      }, 2000);
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="email-kanban">
        <div className="kanban-header">
          <div className="header-left">
            <Mail className="header-icon" />
            <h2>Email Workflow Board</h2>
          </div>
          <div className="header-stats">
            <div className="stat-badge new">
              <Inbox size={14} />
              <span>{columns.inbox.emails.length} New</span>
            </div>
            <div className="stat-badge pending">
              <Clock size={14} />
              <span>{columns["to-reply"].emails.length} Pending</span>
            </div>
            <div className="stat-badge processing">
              <Bot size={14} />
              <span>{columns.replying.emails.length} Processing</span>
            </div>
            <div className="stat-badge sent">
              <CheckCircle2 size={14} />
              <span>{columns.sent.emails.length} Sent</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="kanban-loader">
            <div className="loader-content">
              <div className="loader-spinner"></div>
              <p>Syncing with Gmail...</p>
            </div>
          </div>
        ) : (
          <div className="kanban-board">
            {Object.values(columns).map((column) => (
              <DroppableColumn
                key={column.id}
                id={column.id}
                title={column.title}
                icon={column.icon}
                color={column.color}
                count={column.emails.length}
                stats={{
                  total: column.emails.length,
                  urgent: column.emails.filter((e) => e.category === "urgent")
                    .length,
                  unread: column.emails.filter((e) => e.isUnread).length,
                }}
              >
                <SortableContext
                  items={column.emails.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {column.emails.map((email) => (
                    <EmailCard
                      key={email.id}
                      email={email}
                      isProcessing={isProcessing === email.id}
                      onClick={onEmailClick}
                    />
                  ))}
                  {column.emails.length === 0 && (
                    <div className="empty-column-state">
                      <div className="empty-icon">
                        {column.id === "inbox" && <Inbox size={24} />}
                        {column.id === "to-reply" && (
                          <MessageSquare size={24} />
                        )}
                        {column.id === "replying" && <Bot size={24} />}
                        {column.id === "sent" && <Send size={24} />}
                      </div>
                      <p>
                        {column.id === "inbox" && "Inbox is empty"}
                        {column.id === "to-reply" &&
                          "Drag emails here to auto-reply"}
                        {column.id === "replying" &&
                          "AI agent will process replies here"}
                        {column.id === "sent" && "No emails sent yet"}
                      </p>
                    </div>
                  )}
                </SortableContext>
              </DroppableColumn>
            ))}
          </div>
        )}

        <DragOverlay>
          {activeEmail ? <EmailCard email={activeEmail} /> : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

export default EmailKanban;
