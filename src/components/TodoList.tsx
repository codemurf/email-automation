import React, { useState } from "react";
import {
  CheckCircle2,
  RefreshCw,
  FileText,
  Clock,
  Pin,
  Mail,
  Calendar,
  Trash2,
  CheckSquare,
} from "lucide-react";
import "./TodoList.css";

interface Task {
  id: string;
  title: string;
  status: "Open" | "In Progress" | "Closed" | "Pending";
  priority: "high" | "medium" | "low";
  source: string; // email subject or source
  dueDate?: string;
  completed: boolean;
}

interface TodoListProps {
  tasks?: Task[];
}

const TodoList: React.FC<TodoListProps> = ({ tasks = [] }) => {
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  const toggleTask = (taskId: string) => {
    setLocalTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (taskId: string) => {
    setLocalTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Closed":
        return <CheckCircle2 size={14} />;
      case "In Progress":
        return <RefreshCw size={14} />;
      case "Open":
        return <FileText size={14} />;
      case "Pending":
        return <Clock size={14} />;
      default:
        return <Pin size={14} />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "priority-high";
      case "medium":
        return "priority-medium";
      case "low":
        return "priority-low";
      default:
        return "priority-medium";
    }
  };

  const filteredTasks = localTasks.filter((task) => {
    if (filter === "active") return !task.completed;
    if (filter === "completed") return task.completed;
    return true;
  });

  const completedCount = localTasks.filter((t) => t.completed).length;
  const activeCount = localTasks.length - completedCount;

  return (
    <div className="todo-list">
      <div className="todo-header">
        <h2 className="todo-title">
          <CheckSquare size={20} />
          Task List
        </h2>
        <div className="todo-stats">
          <span className="stat-badge active">{activeCount} Active</span>
          <span className="stat-badge completed">{completedCount} Done</span>
        </div>
      </div>

      <div className="todo-filters">
        <button
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({localTasks.length})
        </button>
        <button
          className={`filter-btn ${filter === "active" ? "active" : ""}`}
          onClick={() => setFilter("active")}
        >
          Active ({activeCount})
        </button>
        <button
          className={`filter-btn ${filter === "completed" ? "active" : ""}`}
          onClick={() => setFilter("completed")}
        >
          Completed ({completedCount})
        </button>
      </div>

      <div className="tasks-container">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FileText size={32} />
            </div>
            <p>
              {filter === "all" && "No tasks yet"}
              {filter === "active" && "No active tasks"}
              {filter === "completed" && "No completed tasks"}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`task-item ${
                task.completed ? "completed" : ""
              } ${getPriorityColor(task.priority)}`}
            >
              <div className="task-left">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  className="task-checkbox"
                />
                <div className="task-status-icon">
                  {getStatusIcon(task.status)}
                </div>
              </div>

              <div className="task-content">
                <div className="task-header-row">
                  <h4 className="task-title">{task.title}</h4>
                  <span
                    className={`task-status ${task.status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {task.status}
                  </span>
                </div>
                <div className="task-meta">
                  <span className="task-source">
                    <Mail size={12} /> From: {task.source}
                  </span>
                  {task.dueDate && (
                    <span className="task-due">
                      <Calendar size={12} /> Due: {task.dueDate}
                    </span>
                  )}
                  <span
                    className={`task-priority ${getPriorityColor(
                      task.priority
                    )}`}
                  >
                    <span
                      className={`priority-dot ${getPriorityColor(
                        task.priority
                      )}`}
                    ></span>
                    {task.priority.charAt(0).toUpperCase() +
                      task.priority.slice(1)}{" "}
                    Priority
                  </span>
                </div>
              </div>

              <button
                className="delete-btn"
                onClick={() => deleteTask(task.id)}
                title="Delete task"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {localTasks.length > 0 && (
        <div className="todo-footer">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${(completedCount / localTasks.length) * 100}%`,
              }}
            />
          </div>
          <p className="progress-text">
            {completedCount} of {localTasks.length} tasks completed
          </p>
        </div>
      )}
    </div>
  );
};

export default TodoList;
