import React, { useState, useRef } from 'react';
import { useNotesStore } from '../../store/notesStore';
import GanttChart from '../GanttChart/GanttChart';
import { Task } from '../../types';
import { formatDateTime } from '../../utils/helpers';
import './NoteDetailView.css';

type ActiveTab = 'content' | 'attachments' | 'timeline' | 'tasks' | 'resources';

const NoteDetailView: React.FC = () => {
  const { detailViewNoteId, notes, activeCanvasMeta, setDetailViewNoteId, addAttachment, removeAttachment, updateNote, addTask, updateTask, removeTask, addSubtask, toggleSubtask, startTimeEntry, stopTimeEntry, addReminder, removeReminder, users } = useNotesStore();
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkName, setNewLinkName] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => (activeCanvasMeta.type === 'project' ? 'timeline' : 'content'));
  const [isDragging, setIsDragging] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskEnd, setNewTaskEnd] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [tasksView, setTasksView] = useState<'board' | 'list'>('board');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newReminderWhen, setNewReminderWhen] = useState<string>(() => new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0,16));
  const [newReminderMessage, setNewReminderMessage] = useState('');
  const [newReminderRecurrence, setNewReminderRecurrence] = useState<'none'|'daily'|'weekly'|'monthly'>('none');
  const [pomodoroTask, setPomodoroTask] = useState<Task | null>(null);
  const pomodoroTaskRef = useRef<Task | null>(null);

  const [taskContextMenu, setTaskContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    task: Task | null;
  }>({ isOpen: false, x: 0, y: 0, task: null });

  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [pomodoroRemainingSec, setPomodoroRemainingSec] = useState(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const pomodoroIntervalRef = useRef<number | null>(null);
  const pomodoroRunStartAtRef = useRef<number | null>(null);
  const pomodoroRunStartRemainingSecRef = useRef<number>(25 * 60);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const note = notes.find(n => n.id === detailViewNoteId);
  const isProject = activeCanvasMeta.type === 'project';

  React.useEffect(() => {
    if (activeCanvasMeta.type === 'project') {
      if (activeTab === 'content' || activeTab === 'attachments') setActiveTab('timeline');
      return;
    }

    if (activeTab === 'timeline' || activeTab === 'tasks' || activeTab === 'resources') {
      setActiveTab('content');
    }
  }, [activeCanvasMeta.type, activeTab]);

  React.useEffect(() => {
    pomodoroTaskRef.current = pomodoroTask;
  }, [pomodoroTask]);

  // Sync local pomodoroTask when store `notes` updates so timeEntries/timeSpent are reflected
  React.useEffect(() => {
    if (!pomodoroTask) return;
    const freshNote = notes.find(n => n.id === detailViewNoteId);
    if (!freshNote) return;
    const freshTask = (freshNote.tasks || []).find(t => t.id === pomodoroTask.id);
    if (freshTask) setPomodoroTask(freshTask);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, detailViewNoteId]);

  const closeTaskContextMenu = () => {
    setTaskContextMenu({ isOpen: false, x: 0, y: 0, task: null });
  };

  React.useEffect(() => {
    if (!taskContextMenu.isOpen) return;

    const onMouseDown = () => closeTaskContextMenu();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTaskContextMenu();
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onMouseDown, true);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onMouseDown, true);
    };
  }, [taskContextMenu.isOpen]);

  // focus first context menu item when opened
  const contextMenuRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!taskContextMenu.isOpen) return;
    // focus first button inside the context menu
    setTimeout(() => {
      try {
        const el = contextMenuRef.current?.querySelector<HTMLButtonElement>('.task-context-menu-item');
        el?.focus();
      } catch {}
    }, 0);
  }, [taskContextMenu.isOpen]);

  const clearPomodoroInterval = () => {
    if (pomodoroIntervalRef.current !== null) {
      window.clearInterval(pomodoroIntervalRef.current);
      pomodoroIntervalRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => {
      clearPomodoroInterval();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    // When switching tasks (or closing the editor), stop the timer and reset it.
    clearPomodoroInterval();
    setIsPomodoroRunning(false);
    pomodoroRunStartAtRef.current = null;
    pomodoroRunStartRemainingSecRef.current = pomodoroMinutes * 60;
    setPomodoroRemainingSec(pomodoroMinutes * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoroTask?.id]);

  React.useEffect(() => {
    if (isPomodoroRunning) return;
    pomodoroRunStartRemainingSecRef.current = pomodoroMinutes * 60;
    setPomodoroRemainingSec(pomodoroMinutes * 60);
  }, [pomodoroMinutes, isPomodoroRunning]);

  const formatDurationShort = (ms: number | undefined) => {
    const totalSec = Math.max(0, Math.floor((ms ?? 0) / 1000));
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);

    if (hours <= 0) return `${minutes}m`;
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const formatCountdown = (sec: number) => {
    const s = Math.max(0, sec);
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  if (!note) return null;

  const handleClose = () => {
    setDetailViewNoteId(null);
  };

  const handleAddLink = () => {
    if (newLinkUrl.trim()) {
      addAttachment(note.id, {
        type: 'link',
        name: newLinkName.trim() || newLinkUrl,
        url: newLinkUrl.trim(),
      });
      setNewLinkUrl('');
      setNewLinkName('');
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const isImage = file.type.startsWith('image/');
        addAttachment(note.id, {
          type: isImage ? 'image' : 'file',
          name: file.name,
          url: url,
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    removeAttachment(note.id, attachmentId);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNote(note.id, { text: e.target.value });
  };

  const handleAddTask = () => {
    if (newTaskName.trim() && newTaskStart && newTaskEnd) {
      addTask(note.id, {
        name: newTaskName.trim(),
        startDate: newTaskStart,
        endDate: newTaskEnd,
        dueDate: newTaskDue || newTaskEnd,
        progress: 0,
        status: 'not-started',
        priority: newTaskPriority ?? 'medium',
      });
      setNewTaskName('');
      setNewTaskStart('');
      setNewTaskEnd('');
      setNewTaskDue('');
      setNewTaskPriority('medium');
    }
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    updateTask(note.id, taskId, updates);
  };

  const handleRemoveTask = (taskId: string) => {
    removeTask(note.id, taskId);
    if (editingTask?.id === taskId) setEditingTask(null);
    if (pomodoroTask?.id === taskId) setPomodoroTask(null);
  };

  const handleTaskClick = (task: Task) => {
    closeTaskContextMenu();
    setPomodoroTask(pomodoroTask?.id === task.id ? null : task);
  };

  const handleTaskContextMenu = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 190;
    const menuHeight = 96;
    const x = Math.max(8, Math.min(e.clientX, window.innerWidth - menuWidth - 8));
    const y = Math.max(8, Math.min(e.clientY, window.innerHeight - menuHeight - 8));

    setTaskContextMenu({ isOpen: true, x, y, task });
  };

  const handlePomodoroStart = () => {
    if (!pomodoroTask) return;
    if (isPomodoroRunning) return;

    if (pomodoroRemainingSec <= 0) {
      setPomodoroRemainingSec(pomodoroMinutes * 60);
      pomodoroRunStartRemainingSecRef.current = pomodoroMinutes * 60;
    }

    clearPomodoroInterval();
    setIsPomodoroRunning(true);
    pomodoroRunStartAtRef.current = Date.now();
    pomodoroRunStartRemainingSecRef.current = pomodoroRemainingSec > 0 ? pomodoroRemainingSec : pomodoroMinutes * 60;

    // create a time entry in the store
    try {
      startTimeEntry(note.id, pomodoroTask.id, 'pomodoro', `Pomodoro ${pomodoroMinutes}m`);
    } catch (err) {
      // ignore; store may handle
    }

    pomodoroIntervalRef.current = window.setInterval(() => {
      const startedAt = pomodoroRunStartAtRef.current;
      if (!startedAt) return;

      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
      const nextRemaining = Math.max(0, pomodoroRunStartRemainingSecRef.current - elapsedSec);
      setPomodoroRemainingSec(nextRemaining);

      if (nextRemaining === 0) {
        clearPomodoroInterval();
        setIsPomodoroRunning(false);
        pomodoroRunStartAtRef.current = null;

        // stop running time entry and count 1 completed pomodoro
        try {
          stopTimeEntry(note.id, pomodoroTask.id);
        } catch (err) {
          // ignore
        }

        handleUpdateTask(pomodoroTask.id, {
          pomodorosCompleted: (pomodoroTask.pomodorosCompleted ?? 0) + 1,
        });

        // Reset for the next session.
        pomodoroRunStartRemainingSecRef.current = pomodoroMinutes * 60;
        setPomodoroRemainingSec(pomodoroMinutes * 60);
      }
    }, 250);
  };

  const handlePomodoroPauseAndSave = () => {
    if (!pomodoroTask) return;
    if (!isPomodoroRunning) return;

    const startedAt = pomodoroRunStartAtRef.current;
    if (!startedAt) {
      clearPomodoroInterval();
      setIsPomodoroRunning(false);
      return;
    }

    // stop the running store entry which will persist the elapsed time
    try {
      stopTimeEntry(note.id, pomodoroTask.id);
    } catch (err) {
      // ignore
    }

    const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);

    const nextRemaining = Math.max(0, pomodoroRunStartRemainingSecRef.current - elapsedSec);
    setPomodoroRemainingSec(nextRemaining);
    pomodoroRunStartRemainingSecRef.current = nextRemaining;
    pomodoroRunStartAtRef.current = null;

    clearPomodoroInterval();
    setIsPomodoroRunning(false);
  };

  const handlePomodoroReset = () => {
    if (isPomodoroRunning) {
      handlePomodoroPauseAndSave();
    }
    clearPomodoroInterval();
    setIsPomodoroRunning(false);
    pomodoroRunStartAtRef.current = null;
    pomodoroRunStartRemainingSecRef.current = pomodoroMinutes * 60;
    setPomodoroRemainingSec(pomodoroMinutes * 60);
  };

  const sortedTasks = [...(note.tasks ?? [])].sort((a, b) => {
    const statusOrder: Record<Task['status'], number> = {
      'not-started': 0,
      'in-progress': 1,
      'completed': 2,
    };

    const ao = statusOrder[a.status] ?? 0;
    const bo = statusOrder[b.status] ?? 0;
    if (ao !== bo) return ao - bo;

    const aOrder = typeof a.order === 'number' ? a.order : 0;
    const bOrder = typeof b.order === 'number' ? b.order : 0;
    if (aOrder !== bOrder) return aOrder - bOrder;

    const aDue = new Date(a.dueDate ?? a.endDate).getTime();
    const bDue = new Date(b.dueDate ?? b.endDate).getTime();
    if (aDue !== bDue) return aDue - bDue;

    return (a.createdAt ?? 0) - (b.createdAt ?? 0);
  });

  const tasksByStatus: Record<Task['status'], Task[]> = {
    'not-started': sortedTasks.filter(t => t.status === 'not-started'),
    'in-progress': sortedTasks.filter(t => t.status === 'in-progress'),
    'completed': sortedTasks.filter(t => t.status === 'completed'),
  };

  const priorityLabel = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return 'Low';
      case 'medium': return 'Medium';
      case 'high': return 'High';
      case 'urgent': return 'Urgent';
      default: return 'Medium';
    }
  };

  const handleDragTaskStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnColumn = (e: React.DragEvent, status: Task['status']) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    handleUpdateTask(taskId, { status });
  };

  const attachmentCount = note.attachments?.length || 0;
  const taskCount = note.tasks?.length || 0;
  const resourcesLabel = isProject ? 'Resources' : 'Attachments';

  return (
    <div className="note-detail-overlay" onClick={handleClose}>
      <div className="note-detail-modal" role="dialog" aria-modal="true" aria-label={`Note details for ${note.text?.slice(0,60)}`} onClick={(e) => e.stopPropagation()}>
        <div className="note-detail-header">
          <div className="header-info">
            <h2>Note Details</h2>
            <div className="note-meta">
              <span className="meta-item">Created: {formatDateTime(note.createdAt)}</span>
              <span className="meta-divider">•</span>
              <span className="meta-item">Modified: {formatDateTime(note.updatedAt)}</span>
            </div>
          </div>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="note-tabs">
          {isProject ? (
            <>
              <button
                className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setActiveTab('timeline')}
              >
                <span className="tab-icon">🗓️</span>
                Timeline
              </button>
              <button
                className={`tab-button ${activeTab === 'tasks' ? 'active' : ''}`}
                onClick={() => setActiveTab('tasks')}
              >
                <span className="tab-icon">✓</span>
                Tasks
                {taskCount > 0 && <span className="tab-badge">{taskCount}</span>}
              </button>
              <button
                className={`tab-button ${activeTab === 'resources' ? 'active' : ''}`}
                onClick={() => setActiveTab('resources')}
              >
                <span className="tab-icon">📎</span>
                Resources
                {attachmentCount > 0 && <span className="tab-badge">{attachmentCount}</span>}
              </button>
            </>
          ) : (
            <>
              <button
                className={`tab-button ${activeTab === 'content' ? 'active' : ''}`}
                onClick={() => setActiveTab('content')}
              >
                <span className="tab-icon">📝</span>
                Content
              </button>
              <button
                className={`tab-button ${activeTab === 'attachments' ? 'active' : ''}`}
                onClick={() => setActiveTab('attachments')}
              >
                <span className="tab-icon">📎</span>
                {resourcesLabel}
                {attachmentCount > 0 && <span className="tab-badge">{attachmentCount}</span>}
              </button>
            </>
          )}
        </div>

        <div className="note-detail-content">
          {isProject && activeTab === 'timeline' && (
            <div className="content-tab">
              <div className="gantt-section">
                <h3>Project Timeline</h3>
                <GanttChart tasks={note.tasks || []} />
              </div>
            </div>
          )}

          {!isProject && activeTab === 'content' && (
            <div className="content-tab">
              <div className="note-text-section">
                <label>Note Content</label>
                <textarea
                  value={note.text}
                  onChange={handleTextChange}
                  className="note-detail-textarea"
                  placeholder="Write your note here..."
                  rows={12}
                />
              </div>
            </div>
          )}

          {((!isProject && activeTab === 'attachments') || (isProject && activeTab === 'resources')) && (
            <div className="attachments-tab">
              <div
                className={`upload-drop-zone ${isDragging ? 'dragging' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
                aria-label="Upload files"
              >
                <div className="drop-zone-icon">📁</div>
                <div className="drop-zone-text">
                  <strong>Drag & drop files here</strong>
                  <span>or click to browse</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="file-input"
                  accept="image/*,.pdf,.doc,.docx,.txt,.zip"
                />
              </div>

              <div className="divider">
                <span>or add a link</span>
              </div>

              <div className="add-link-section">
                <div className="link-inputs">
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="link-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddLink()}
                  />
                  <input
                    type="text"
                    placeholder="Link name (optional)"
                    value={newLinkName}
                    onChange={(e) => setNewLinkName(e.target.value)}
                    className="link-input"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddLink()}
                  />
                </div>
                <button onClick={handleAddLink} className="add-button" disabled={!newLinkUrl.trim()}>
                  Add Link
                </button>
              </div>

              {attachmentCount > 0 && (
                <>
                  <div className="attachments-header">
                    <h3>All {resourcesLabel} ({attachmentCount})</h3>
                  </div>
                  <div className="attachments-grid">
                    {note.attachments?.map(attachment => (
                      <div key={attachment.id} className={`attachment-card ${attachment.type}`}>
                        <button
                          onClick={() => handleRemoveAttachment(attachment.id)}
                          className="remove-attachment-button"
                          title="Remove attachment"
                        >
                          ×
                        </button>
                        
                        {attachment.type === 'image' ? (
                          <div className="attachment-preview-large">
                            <img src={attachment.url} alt={attachment.name} />
                          </div>
                        ) : (
                          <div className="attachment-icon-large">
                            {attachment.type === 'link' ? '🔗' : '📄'}
                          </div>
                        )}
                        
                        <div className="attachment-details">
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="attachment-title"
                            title={attachment.name}
                          >
                            {attachment.name}
                          </a>
                          <div className="attachment-meta">
                            <span className="attachment-type-badge">{attachment.type}</span>
                            <span className="attachment-date">{formatDateTime(attachment.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {attachmentCount === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">📎</div>
                  <p>No {resourcesLabel.toLowerCase()} yet</p>
                  <span>Add links, upload files, or drop images above</span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'tasks' && isProject && (
            <div className="tasks-tab">
              <div className="add-task-section">
                <h3>Create New Task</h3>
                <p className="section-description">Add tasks with start and end dates to build your project timeline</p>
                <div className="task-form">
                  <input
                    type="text"
                    placeholder="Task name"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    className="task-input"
                  />
                  <div className="date-inputs">
                    <div className="date-input-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        value={newTaskStart}
                        onChange={(e) => setNewTaskStart(e.target.value)}
                        className="task-input date-input"
                      />
                    </div>
                    <div className="date-input-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        value={newTaskEnd}
                        onChange={(e) => setNewTaskEnd(e.target.value)}
                        className="task-input date-input"
                      />
                    </div>
                    <div className="date-input-group">
                      <label>Due Date</label>
                      <input
                        type="date"
                        value={newTaskDue}
                        onChange={(e) => setNewTaskDue(e.target.value)}
                        className="task-input date-input"
                      />
                    </div>
                  </div>
                  <div className="task-form-row">
                    <div className="task-form-field">
                      <label>Priority</label>
                      <select
                        value={newTaskPriority ?? 'medium'}
                        onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
                        className="task-input"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleAddTask}
                    className="add-button"
                    disabled={!newTaskName.trim() || !newTaskStart || !newTaskEnd}
                  >
                    Add Task
                  </button>
                </div>
              </div>

              {taskCount > 0 && (
                <div className="tasks-list-section">
                  <div className="tasks-header-row">
                    <h3>Tasks ({taskCount})</h3>
                    <div className="tasks-view-toggle">
                      <button
                        className={`toggle-button ${tasksView === 'board' ? 'active' : ''}`}
                        onClick={() => setTasksView('board')}
                        type="button"
                      >
                        Board
                      </button>
                      <button
                        className={`toggle-button ${tasksView === 'list' ? 'active' : ''}`}
                        onClick={() => setTasksView('list')}
                        type="button"
                      >
                        List
                      </button>
                    </div>
                  </div>

                  {tasksView === 'board' ? (
                    <div className="task-board">
                      {(
                        [
                          { status: 'not-started' as const, title: 'Not Started' },
                          { status: 'in-progress' as const, title: 'In Progress' },
                          { status: 'completed' as const, title: 'Completed' },
                        ]
                      ).map((col) => (
                        <div
                          key={col.status}
                          className={`task-column status-${col.status}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => handleDropOnColumn(e, col.status)}
                        >
                          <div className="task-column-header">
                            <div className="task-column-title">{col.title}</div>
                            <div className="task-column-count">{tasksByStatus[col.status].length}</div>
                          </div>
                          <div className="task-column-body">
                            {tasksByStatus[col.status].map((task) => (
                              <div
                                key={task.id}
                                className={`task-card ${pomodoroTask?.id === task.id ? 'editing' : ''}`}
                                role="button"
                                tabIndex={0}
                                aria-pressed={pomodoroTask?.id === task.id}
                                onClick={() => handleTaskClick(task)}
                                onContextMenu={(e) => handleTaskContextMenu(e, task)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTaskClick(task); }
                                  else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
                                    e.preventDefault();
                                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                                    const x = Math.max(8, Math.min(rect.left + 8, window.innerWidth - 190 - 8));
                                    const y = Math.max(8, Math.min(rect.top + 8, window.innerHeight - 96 - 8));
                                    setTaskContextMenu({ isOpen: true, x, y, task });
                                  }
                                }}
                                draggable
                                onDragStart={(e) => handleDragTaskStart(e, task.id)}
                              >
                                <div className="task-card-top">
                                  <span className="task-color-dot" style={{ background: task.color ?? '#6b7280' }}></span>
                                  <span className="task-card-title">{task.name}</span>
                                </div>
                                <div className="task-card-meta">
                                  <span className={`priority-badge priority-${task.priority ?? 'medium'}`}>{priorityLabel(task.priority ?? 'medium')}</span>
                                  <span className="task-card-due">Due {new Date(task.dueDate ?? task.endDate).toLocaleDateString()}</span>
                                  {typeof task.timeSpentMs === 'number' && task.timeSpentMs > 0 && (
                                    <span className="task-card-time">Spent {formatDurationShort(task.timeSpentMs)}</span>
                                  )}
                                </div>
                                <div className="task-card-progress">
                                  <div className="progress-bar-container">
                                    <div className="progress-bar-fill" style={{ width: `${task.progress}%` }}></div>
                                  </div>
                                  <span className="progress-text">{task.progress}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tasks-list">
                      {sortedTasks.map(task => (
                        <div
                          key={task.id}
                          className={`task-item ${pomodoroTask?.id === task.id ? 'editing' : ''}`}
                          onClick={() => handleTaskClick(task)}
                          onContextMenu={(e) => handleTaskContextMenu(e, task)}
                        >
                          <span className="task-color-dot" style={{ background: task.color ?? '#6b7280' }}></span>
                          <div className="task-item-info">
                            <div className="task-item-header">
                              <span className="task-item-name">{task.name}</span>
                              <span className={`priority-badge priority-${task.priority ?? 'medium'}`}>{priorityLabel(task.priority ?? 'medium')}</span>
                              <span className={`task-status-badge status-${task.status}`}>
                                {task.status === 'not-started' ? 'Not Started' : task.status === 'in-progress' ? 'In Progress' : 'Completed'}
                              </span>
                            </div>
                            <div className="task-item-dates">
                              {new Date(task.startDate).toLocaleDateString()} - {new Date(task.endDate).toLocaleDateString()} • Due {new Date(task.dueDate ?? task.endDate).toLocaleDateString()}
                              {typeof task.timeSpentMs === 'number' && task.timeSpentMs > 0 ? ` • Spent ${formatDurationShort(task.timeSpentMs)}` : ''}
                            </div>
                            <div className="task-item-progress">
                              <div className="progress-bar-container">
                                <div className="progress-bar-fill" style={{ width: `${task.progress}%` }}></div>
                              </div>
                              <span className="progress-text">{task.progress}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {taskCount === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">✓</div>
                  <p>No tasks yet</p>
                  <span>Add tasks with timelines to track your project</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {taskContextMenu.isOpen && taskContextMenu.task && (
        <div
          ref={contextMenuRef}
          className="task-context-menu"
          role="menu"
          aria-label={`Options for ${taskContextMenu.task.name}`}
          style={{ top: taskContextMenu.y, left: taskContextMenu.x }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="task-context-menu-item"
            role="menuitem"
            onClick={() => {
              setEditingTask(taskContextMenu.task);
              closeTaskContextMenu();
            }}
          >
            Edit task
          </button>
          <button
            type="button"
            className="task-context-menu-item danger"
            role="menuitem"
            onClick={() => {
              handleRemoveTask(taskContextMenu.task!.id);
              closeTaskContextMenu();
            }}
          >
            Delete task
          </button>
        </div>
      )}

      {pomodoroTask && (
        <div className="task-editor-overlay" onClick={() => setPomodoroTask(null)} role="presentation">
          <div
            className="pomodoro-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Pomodoro for task ${pomodoroTask.name}`}
          >
            <div className="pomodoro-modal-header">
              <div className="pomodoro-modal-title">
                Pomodoro: <span className="pomodoro-task-name">{pomodoroTask.name}</span>
              </div>
              <button className="close-editor-button" onClick={() => setPomodoroTask(null)}>
                ×
              </button>
            </div>

            <div className="pomodoro-section">
              <div className="pomodoro-header">
                <div className="pomodoro-title">Timer</div>
                <div className="pomodoro-stats">
                  <span>Spent {formatDurationShort(pomodoroTask.timeSpentMs)}</span>
                  <span className="pomodoro-dot">•</span>
                  <span>
                    {pomodoroTask.pomodorosCompleted ?? 0} pomodoro
                    {(pomodoroTask.pomodorosCompleted ?? 0) === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              <div className="pomodoro-controls">
                <label className="pomodoro-minutes">
                  Minutes
                  <input
                    type="number"
                    min={5}
                    max={90}
                    step={5}
                    value={pomodoroMinutes}
                    disabled={isPomodoroRunning}
                    onChange={(e) => setPomodoroMinutes(Math.max(5, Math.min(90, Number(e.target.value) || 25)))}
                  />
                </label>

                <div className="pomodoro-countdown" aria-label="Pomodoro countdown">
                  {formatCountdown(pomodoroRemainingSec)}
                </div>

                <div className="pomodoro-buttons">
                  <button
                    type="button"
                    className={`pomodoro-btn ${isPomodoroRunning ? 'danger' : 'primary'}`}
                    onClick={isPomodoroRunning ? handlePomodoroPauseAndSave : handlePomodoroStart}
                  >
                    {isPomodoroRunning ? 'Pause & Save' : 'Start'}
                  </button>
                  <button type="button" className="pomodoro-btn" onClick={handlePomodoroReset}>
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingTask && (
        <div
          className="task-editor-overlay"
          onClick={() => setEditingTask(null)}
          role="presentation"
        >
          <div
            className="task-editor task-editor-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Edit task ${editingTask.name}`}
          >
            <div className="task-editor-header">
              <h3>Edit Task: {editingTask.name}</h3>
              <button onClick={() => setEditingTask(null)} className="close-editor-button">
                ×
              </button>
            </div>
            <div className="task-editor-content">
              <div className="editor-field">
                <label>Progress</label>
                <div className="progress-controls">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editingTask.progress}
                    onChange={(e) => {
                      const progress = parseInt(e.target.value);
                      handleUpdateTask(editingTask.id, { progress });
                      setEditingTask({ ...editingTask, progress });
                    }}
                    className="progress-slider"
                  />
                  <span className="progress-value">{editingTask.progress}%</span>
                </div>
              </div>

              <div className="editor-field">
                <label>Status</label>
                <select
                  value={editingTask.status}
                  onChange={(e) => {
                    const status = e.target.value as Task['status'];
                    handleUpdateTask(editingTask.id, { status });
                    setEditingTask({ ...editingTask, status });
                  }}
                  className="status-select"
                >
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="editor-field">
                <label>Priority</label>
                <select
                  value={editingTask.priority ?? 'medium'}
                  onChange={(e) => {
                    const priority = e.target.value as Task['priority'];
                    handleUpdateTask(editingTask.id, { priority });
                    setEditingTask({ ...editingTask, priority });
                  }}
                  className="status-select"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="editor-field">
                <label>Assignee</label>
                <select
                  value={editingTask.assigneeId ?? ''}
                  onChange={(e) => {
                    const assigneeId = e.target.value || undefined;
                    handleUpdateTask(editingTask.id, { assigneeId });
                    setEditingTask({ ...editingTask, assigneeId });
                  }}
                  className="status-select"
                >
                  <option value="">Unassigned</option>
                  {users && users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="editor-field">
                <label>Due Date</label>
                <input
                  type="date"
                  value={editingTask.dueDate ?? editingTask.endDate}
                  onChange={(e) => {
                    const dueDate = e.target.value;
                    handleUpdateTask(editingTask.id, { dueDate });
                    setEditingTask({ ...editingTask, dueDate });
                  }}
                  className="status-select"
                />
              </div>

              <div className="editor-field">
                <label>Subtasks</label>
                <div className="subtasks-section">
                  {(editingTask.subtasks || []).map((s) => (
                    <label key={s.id} className="subtask-item">
                      <input
                        type="checkbox"
                        checked={!!s.done}
                        onChange={() => {
                          toggleSubtask(note.id, editingTask.id, s.id);
                          setEditingTask((prev) => prev ? { ...prev, subtasks: (prev.subtasks || []).map(ss => ss.id === s.id ? { ...ss, done: !ss.done } : ss) } : prev);
                        }}
                      />
                      <span className={`subtask-title ${s.done ? 'done' : ''}`}>{s.title}</span>
                    </label>
                  ))}

                  <div className="add-subtask-row">
                    <input
                      type="text"
                      placeholder="Add new subtask"
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (() => {
                        if (!newSubtaskTitle.trim()) return;
                        addSubtask(note.id, editingTask.id, newSubtaskTitle.trim());
                        setEditingTask((prev) => prev ? { ...prev, subtasks: [...(prev.subtasks || []), { id: `sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, title: newSubtaskTitle.trim(), done: false }] } : prev);
                        setNewSubtaskTitle('');
                      })()}
                      className="subtask-input"
                    />
                    <button
                      type="button"
                      className="add-button"
                      onClick={() => {
                        if (!newSubtaskTitle.trim()) return;
                        addSubtask(note.id, editingTask.id, newSubtaskTitle.trim());
                        setEditingTask((prev) => prev ? { ...prev, subtasks: [...(prev.subtasks || []), { id: `sub-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, title: newSubtaskTitle.trim(), done: false }] } : prev);
                        setNewSubtaskTitle('');
                      }}
                      disabled={!newSubtaskTitle.trim()}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={() => handleRemoveTask(editingTask.id)} className="remove-task-button">
                Delete Task
              </button>

              <div className="editor-field">
                <label>Time Entries</label>
                <div className="time-entries-list">
                  {((editingTask.timeEntries || []) as Array<any>).slice().reverse().map((te) => (
                    <div key={te.id} className="time-entry-item">
                      <div className="time-entry-meta">
                        <span className="time-entry-start">{te.startedAt ? new Date(te.startedAt).toLocaleString() : '—'}</span>
                        <span className="time-entry-sep">—</span>
                        <span className="time-entry-end">{te.endedAt ? new Date(te.endedAt).toLocaleString() : 'Running'}</span>
                      </div>
                      <div className="time-entry-duration">
                        {typeof te.startedAt === 'number' && typeof te.endedAt === 'number' ? `${Math.round((te.endedAt - te.startedAt)/60000)}m` : (te.startedAt && !te.endedAt ? 'Running' : '')}
                      </div>
                    </div>
                  ))}

                  {((editingTask.timeEntries || []) as Array<any>).some(te => te.endedAt === undefined) && (
                    <button className="remove-task-button" onClick={() => {
                      // stop last running entry
                      const running = (editingTask.timeEntries || []).find((te: any) => te.endedAt === undefined);
                      if (running) {
                        try { stopTimeEntry(note.id, editingTask.id, running.id); } catch (err) {}
                      }
                    }}>Stop running entry</button>
                  )}
                </div>
              </div>

              <div className="editor-field">
                <label>Reminders</label>
                <div className="reminders-list">
                  {(editingTask.reminders || []).map((r: any) => (
                    <div key={r.id} className="reminder-item">
                      <div className="reminder-meta">
                        <span className="reminder-time">{r.when ? new Date(r.when).toLocaleString() : '—'}</span>
                        <span className="reminder-msg">{r.message ?? ''}</span>
                      </div>
                      <div className="reminder-actions">
                        <button
                          type="button"
                          onClick={() => {
                            try { removeReminder(note.id, editingTask.id, r.id); } catch (err) {}
                            const freshNote = notes.find(n => n.id === note.id);
                            const freshTask = freshNote?.tasks?.find((t: any) => t.id === editingTask.id);
                            if (freshTask) setEditingTask(freshTask);
                          }}
                        >Delete</button>
                      </div>
                    </div>
                  ))}

                  <div className="add-reminder-row">
                    <input
                      type="datetime-local"
                      value={newReminderWhen}
                      onChange={(e) => setNewReminderWhen(e.target.value)}
                      className="reminder-datetime"
                    />
                    <select
                      value={newReminderRecurrence}
                      onChange={(e) => setNewReminderRecurrence(e.target.value as any)}
                      className="reminder-recurrence"
                    >
                      <option value="none">None</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Message (optional)"
                      value={newReminderMessage}
                      onChange={(e) => setNewReminderMessage(e.target.value)}
                      className="reminder-message"
                    />
                    <button
                      type="button"
                      className="add-button"
                      onClick={() => {
                        const when = new Date(newReminderWhen).getTime();
                        if (!when || Number.isNaN(when)) return;
                        try { addReminder(note.id, editingTask.id, when, newReminderMessage || undefined, newReminderRecurrence); } catch (err) {}
                        const freshNote = notes.find(n => n.id === note.id);
                        const freshTask = freshNote?.tasks?.find((t: any) => t.id === editingTask.id);
                        if (freshTask) setEditingTask(freshTask);
                        setNewReminderMessage('');
                        setNewReminderRecurrence('none');
                        setNewReminderWhen(new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0,16));
                      }}
                    >Add</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteDetailView;
