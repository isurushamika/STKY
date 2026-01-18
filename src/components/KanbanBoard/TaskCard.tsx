import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './KanbanBoard.css';

const TaskCard: React.FC<{ task: any }> = ({ task }) => {
  const id = `${task.noteId}/${task.id}`;
  const {attributes, listeners, setNodeRef, transform, isDragging} = useSortable({ id });

  const style: React.CSSProperties = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 1000 }
    : { zIndex: isDragging ? 1000 : 'auto' } as any;

  return (
    <div ref={setNodeRef} className="task-card" style={style} {...attributes} {...listeners}>
      <div className="task-card-top">
        <span className="task-color" style={{ background: task.color || '#6b7280' }} />
        <div className="task-title">{task.name}</div>
        {Array.isArray(task.reminders) && task.reminders.some((r: any) => !r.fired && typeof r.when === 'number' && r.when <= Date.now()) && (
          <span className="task-reminder-dot" title="Reminder due" />
        )}
      </div>
      <div className="task-meta">
        <span className={`priority-badge priority-${task.priority ?? 'medium'}`}>{(task.priority ?? 'medium').toUpperCase()}</span>
        {typeof task.timeSpentMs === 'number' && task.timeSpentMs > 0 && (
          <span className="task-time">{Math.round((task.timeSpentMs || 0) / 60000)}m</span>
        )}
        {Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
          <span className="task-subtasks">{`${task.subtasks.filter((s: any) => s.done).length}/${task.subtasks.length}`}</span>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
