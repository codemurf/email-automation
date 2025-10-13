import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import './DroppableColumn.css';

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
      className={`kanban-column ${isOver ? 'drag-over' : ''}`}
      style={{ '--column-color': color } as React.CSSProperties}
    >
      <div className="column-header">
        <div className="column-title">
          <span className="column-icon">{icon}</span>
          <h3>{title}</h3>
          <span className="column-count">{count}</span>
        </div>
        {stats.urgent > 0 && (
          <span className="urgent-badge">🔴 {stats.urgent}</span>
        )}
      </div>

      <div className="column-body">
        {children}
      </div>

      {isOver && (
        <div className="drop-indicator">
          Drop here to {id === 'to-reply' ? 'auto-reply' : 'move'}
        </div>
      )}
    </div>
  );
};

export default DroppableColumn;
