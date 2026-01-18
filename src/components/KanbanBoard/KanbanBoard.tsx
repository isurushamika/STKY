import React from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useNotesStore } from '../../store/notesStore';
import TaskCard from './TaskCard';
import './KanbanBoard.css';

const STATUSES: Array<{ key: import('../../types').Task['status']; title: string }> = [
  { key: 'not-started', title: 'Backlog' },
  { key: 'in-progress', title: 'In Progress' },
  { key: 'completed', title: 'Done' },
];

const KanbanBoard: React.FC<{ searchQuery?: string; priorityFilter?: string }> = ({ searchQuery = '', priorityFilter = 'all' }) => {
  const { canvases } = useNotesStore();

  // collect all tasks across all canvases and notes
  const tasks: Array<any> = [];
  for (const canvasId of Object.keys(canvases)) {
    const notes = canvases[canvasId] ?? [];
    for (const note of notes) {
      for (const task of note.tasks || []) {
        tasks.push({ ...task, noteId: note.id, noteTitle: note.text?.slice(0, 60) || '' });
      }
    }
  }

  const normalizedQuery = (searchQuery || '').trim().toLowerCase();
  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s.key] = tasks.filter((t) => (t.status ?? 'not-started') === s.key &&
      (normalizedQuery === '' || `${t.name} ${t.noteTitle}`.toLowerCase().includes(normalizedQuery)) &&
      (priorityFilter === 'all' || (t.priority ?? 'medium') === priorityFilter)
    );
    return acc;
  }, {} as Record<string, any[]>);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragStart = (_event: any) => {
    // no-op for now
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    // active.id format: `${noteId}/${taskId}`
    if (typeof active.id !== 'string') return;

    const [activeNoteId, activeTaskId] = active.id.split('/');

    // If over is a column id (status) -> move to that status, placing at end
    if (typeof over.id === 'string' && (over.id === 'not-started' || over.id === 'in-progress' || over.id === 'completed')) {
      const destStatus = over.id as import('../../types').Task['status'];
      const store = useNotesStore.getState();

      // If both active and destination column contain tasks from same note and we dropped on another item, we could reorder.
      // For now, if moving across statuses, call moveTask (resets order to existing or preserves).
      store.moveTask(activeNoteId, activeTaskId, destStatus);
      return;
    }

    // If over is another item id like `${noteId}/${taskId}` then attempt to reorder within same note
    if (typeof over.id === 'string' && over.id.includes('/')) {
      const [overNoteId] = over.id.split('/');
      const destStatus = (STATUSES.find(s => (tasksByStatus as any)[s.key].some((t: any) => `${t.noteId}/${t.id}` === over.id)) || { key: 'not-started' }).key as import('../../types').Task['status'];

      const store = useNotesStore.getState();

      // If active and over belong to same note, compute new order index within that note
      if (activeNoteId === overNoteId) {
        // find index within destStatus column
        const columnTasks = (tasksByStatus as Record<string, any[]>)[destStatus] || [];
        const idx = columnTasks.findIndex(t => `${t.noteId}/${t.id}` === over.id);
        const newOrder = idx >= 0 ? idx + 1 : 1;
        store.reorderTask(activeNoteId, activeTaskId, newOrder);
        // also ensure status is set
        store.moveTask(activeNoteId, activeTaskId, destStatus, newOrder);
        return;
      }

      // otherwise, move task to the destStatus and place before the over item by calling moveTask (order will be adjusted in note if applicable)
      const inferredStatus = destStatus;
      store.moveTask(activeNoteId, activeTaskId, inferredStatus);
      return;
    }
  };

  // create droppable refs for each known status (call hooks directly to satisfy lint rules)
  const dropNotStarted = useDroppable({ id: 'not-started' });
  const dropInProgress = useDroppable({ id: 'in-progress' });
  const dropCompleted = useDroppable({ id: 'completed' });
  const droppables = [dropNotStarted, dropInProgress, dropCompleted];

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {STATUSES.map((col, idx) => (
          <div key={col.key} className="kanban-column" data-status={col.key}>
            <div className="kanban-column-header">
              <div className="kanban-column-title">{col.title}</div>
              <div className="kanban-column-count">{tasksByStatus[col.key]?.length || 0}</div>
            </div>

            <SortableContext items={(tasksByStatus[col.key] || []).map(t => `${t.noteId}/${t.id}`)} strategy={verticalListSortingStrategy}>
              <div ref={droppables[idx].setNodeRef} className="kanban-column-body" data-drop-id={col.key} id={`col-${col.key}`}>
                {(tasksByStatus[col.key] || []).map((task) => (
                  <TaskCard key={`${task.noteId}/${task.id}`} task={task} />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
};

export default KanbanBoard;
