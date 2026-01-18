import React, { useState, useRef } from 'react';
import { useNotesStore } from '../../store/notesStore';
import GanttChart from '../GanttChart/GanttChart';
import { Task } from '../../types';
import { formatDateTime } from '../../utils/helpers';
import './NoteDetailView.css';

type ActiveTab = 'content' | 'attachments' | 'timeline' | 'tasks' | 'resources';

const NoteDetailView: React.FC = () => {
  const { detailViewNoteId, notes, activeCanvasMeta, setDetailViewNoteId, addAttachment, removeAttachment, updateNote, addTask, updateTask, removeTask } = useNotesStore();
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkName, setNewLinkName] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => (activeCanvasMeta.type === 'project' ? 'timeline' : 'content'));
  const [isDragging, setIsDragging] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskEnd, setNewTaskEnd] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
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
        progress: 0,
        status: 'not-started',
      });
      setNewTaskName('');
      setNewTaskStart('');
      setNewTaskEnd('');
    }
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    updateTask(note.id, taskId, updates);
  };

  const handleRemoveTask = (taskId: string) => {
    removeTask(note.id, taskId);
    if (editingTask?.id === taskId) {
      setEditingTask(null);
    }
  };

  const handleTaskClick = (task: Task) => {
    setEditingTask(editingTask?.id === task.id ? null : task);
  };

  const attachmentCount = note.attachments?.length || 0;
  const taskCount = note.tasks?.length || 0;
  const resourcesLabel = isProject ? 'Resources' : 'Attachments';

  return (
    <div className="note-detail-overlay" onClick={handleClose}>
      <div className="note-detail-modal" onClick={(e) => e.stopPropagation()}>
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
                Add Tasks
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
                  <h3>Task List ({taskCount})</h3>
                  <div className="tasks-list">
                    {note.tasks?.map(task => (
                      <div
                        key={task.id}
                        className={`task-item ${editingTask?.id === task.id ? 'editing' : ''}`}
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="task-item-info">
                          <div className="task-item-header">
                            <span className="task-item-name">{task.name}</span>
                            <span className={`task-status-badge status-${task.status}`}>
                              {task.status === 'not-started' ? 'Not Started' : task.status === 'in-progress' ? 'In Progress' : 'Completed'}
                            </span>
                          </div>
                          <div className="task-item-dates">
                            {new Date(task.startDate).toLocaleDateString()} - {new Date(task.endDate).toLocaleDateString()}
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

                  {editingTask && (
                    <div className="task-editor">
                      <div className="task-editor-header">
                        <h3>Edit Task: {editingTask.name}</h3>
                        <button
                          onClick={() => setEditingTask(null)}
                          className="close-editor-button"
                        >
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
                        <button
                          onClick={() => handleRemoveTask(editingTask.id)}
                          className="remove-task-button"
                        >
                          Delete Task
                        </button>
                      </div>
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
    </div>
  );
};

export default NoteDetailView;
