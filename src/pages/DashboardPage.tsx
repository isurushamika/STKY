import React, { useMemo } from 'react';
import { useNotesStore } from '../store/notesStore';
import GanttChart from '../components/GanttChart/GanttChart';
import { StickyNote, Task } from '../types';
import { formatDateShort } from '../utils/helpers';
import './DashboardPage.css';

type TaskWithContext = Task & { noteId: string; noteTitle: string; canvasId: string; canvasName: string };

const getNoteTitle = (note: StickyNote) => {
  const firstLine = note.text?.split('\n').map(s => s.trim()).find(Boolean);
  return firstLine || 'Untitled project';
};

const isOverdue = (task: Task) => {
  if (task.status === 'completed') return false;
  const end = new Date(task.dueDate ?? task.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end.getTime() < today.getTime();
};

const priorityWeight = (priority: Task['priority']) => {
  switch (priority) {
    case 'urgent': return 3;
    case 'high': return 2;
    case 'medium': return 1;
    case 'low': return 0;
    default: return 1;
  }
};

const priorityLabel = (priority: Task['priority']) => {
  switch (priority) {
    case 'urgent': return 'Urgent';
    case 'high': return 'High';
    case 'medium': return 'Medium';
    case 'low': return 'Low';
    default: return 'Medium';
  }
};

const DashboardPage: React.FC = () => {
  const { canvases, canvasesMeta } = useNotesStore();

  const projectCanvasIds = useMemo(() => {
    return Object.keys(canvasesMeta).filter((id) => canvasesMeta[id]?.type === 'project');
  }, [canvasesMeta]);

  const projectNotes = useMemo(() => {
    return projectCanvasIds.flatMap((canvasId) => canvases[canvasId] ?? []);
  }, [canvases, projectCanvasIds]);

  const allProjectTasks = useMemo<TaskWithContext[]>(() => {
    const tasks: TaskWithContext[] = [];
    for (const canvasId of projectCanvasIds) {
      const canvasName = canvasesMeta[canvasId]?.name ?? 'Project Canvas';
      const notes = canvases[canvasId] ?? [];
      for (const note of notes) {
        const noteTitle = getNoteTitle(note);
        for (const task of note.tasks ?? []) {
          tasks.push({ ...task, noteId: note.id, noteTitle, canvasId, canvasName });
        }
      }
    }
    return tasks;
  }, [canvases, canvasesMeta, projectCanvasIds]);

  const stats = useMemo(() => {
    const totalTasks = allProjectTasks.length;
    const completed = allProjectTasks.filter((t) => t.status === 'completed').length;
    const inProgress = allProjectTasks.filter((t) => t.status === 'in-progress').length;
    const notStarted = allProjectTasks.filter((t) => t.status === 'not-started').length;
    const overdue = allProjectTasks.filter(isOverdue).length;

    return {
      projectCanvases: projectCanvasIds.length,
      projectNotes: projectNotes.length,
      totalTasks,
      completed,
      inProgress,
      notStarted,
      overdue,
    };
  }, [allProjectTasks, projectCanvasIds.length, projectNotes.length]);

  const upcoming = useMemo(() => {
    return [...allProjectTasks]
      .filter((t) => t.status !== 'completed')
      .sort((a, b) => {
        const ao = isOverdue(a) ? 0 : 1;
        const bo = isOverdue(b) ? 0 : 1;
        if (ao !== bo) return ao - bo;

        const ad = new Date(a.dueDate ?? a.endDate).getTime();
        const bd = new Date(b.dueDate ?? b.endDate).getTime();
        if (ad !== bd) return ad - bd;

        const ap = priorityWeight(a.priority);
        const bp = priorityWeight(b.priority);
        if (ap !== bp) return bp - ap;

        const aOrder = typeof a.order === 'number' ? a.order : 0;
        const bOrder = typeof b.order === 'number' ? b.order : 0;
        if (aOrder !== bOrder) return aOrder - bOrder;

        return a.createdAt - b.createdAt;
      })
      .slice(0, 10);
  }, [allProjectTasks]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <div className="dashboard-title">Dashboard</div>
          <div className="dashboard-subtitle">Project statistics and timelines</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="stat-card">
          <div className="stat-label">Total Tasks</div>
          <div className="stat-value">{stats.totalTasks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value">{stats.completed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">In Progress</div>
          <div className="stat-value">{stats.inProgress}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Not Started</div>
          <div className="stat-value">{stats.notStarted}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Overdue</div>
          <div className="stat-value">{stats.overdue}</div>
        </div>
      </div>

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <div className="section-title">Upcoming Tasks</div>
          {upcoming.length === 0 ? (
            <div className="empty">No upcoming tasks yet.</div>
          ) : (
            <div className="task-list">
              {upcoming.map((t) => (
                <div key={t.id} className={`task-row ${isOverdue(t) ? 'overdue' : ''}`}>
                  <div className="task-main">
                    <div className="task-name-row">
                      <span className="task-color-dot" style={{ background: t.color ?? '#6b7280' }}></span>
                      <div className="task-name">{t.name}</div>
                      <span className={`priority-badge priority-${t.priority ?? 'medium'}`}>{priorityLabel(t.priority ?? 'medium')}</span>
                    </div>
                    <div className="task-meta">
                      {t.canvasName} • {t.noteTitle}
                    </div>
                  </div>
                  <div className="task-dates">
                    <div className="task-date">{formatDateShort(t.startDate)}</div>
                    <div className="task-date">→ {formatDateShort(t.endDate)}</div>
                    <div className="task-date muted">Due {formatDateShort(t.dueDate ?? t.endDate)}</div>
                  </div>
                  <div className={`task-status ${t.status}`}>{t.status.replace('-', ' ')}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-title">Project Timelines</div>
          {projectNotes.length === 0 ? (
            <div className="empty">No project notes found. Create notes in a Project canvas.</div>
          ) : (
            <div className="project-timelines">
              {projectNotes.map((note) => {
                const title = getNoteTitle(note);
                const tasks = note.tasks ?? [];
                return (
                  <div key={note.id} className="project-note">
                    <div className="project-note-header">
                      <div>
                        <div className="project-note-title">{title}</div>
                        <div className="project-note-sub">{tasks.length} task{tasks.length === 1 ? '' : 's'}</div>
                      </div>
                    </div>
                    <div className="project-note-body">
                      <GanttChart tasks={tasks} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
