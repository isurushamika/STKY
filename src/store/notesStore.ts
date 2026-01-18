import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { StickyNote, Position, NoteColor, CanvasMeta, CanvasType } from '../types';

type CanvasId = string;

interface NotesState {
  // State
  canvases: Record<CanvasId, StickyNote[]>;
  canvasesMeta: Record<CanvasId, CanvasMeta>;
  canvasOrder: CanvasId[];
  activeCanvasId: CanvasId;
  activeCanvasMeta: CanvasMeta;
  notes: StickyNote[];
  selectedNoteId: string | null;
  selectedNoteIds: string[];
  detailViewNoteId: string | null;
  pan: Position;
  zoom: number;
  isPanning: boolean;
  history: StickyNote[][];
  historyIndex: number;
  // Users for assignees
  users: Array<{ id: string; name: string; email?: string; avatarUrl?: string }>;
  
  // Actions
  setActiveCanvas: (canvasId: CanvasId) => void;
  addCanvas: (canvas: { name: string; type: CanvasType }) => CanvasId;
  renameCanvas: (canvasId: CanvasId, name: string) => void;
  deleteCanvas: (canvasId: CanvasId) => void;
  setDetailViewNoteId: (id: string | null) => void;
  addAttachment: (noteId: string, attachment: Omit<import('../types').Attachment, 'id' | 'createdAt'>) => void;
  removeAttachment: (noteId: string, attachmentId: string) => void;
  addTask: (noteId: string, task: Omit<import('../types').Task, 'id' | 'createdAt'>) => void;
  updateTask: (noteId: string, taskId: string, updates: Partial<import('../types').Task>) => void;
  removeTask: (noteId: string, taskId: string) => void;
  addNote: (position: Position) => void;
  updateNote: (id: string, updates: Partial<StickyNote>) => void;
  deleteNote: (id: string) => void;
  moveNote: (id: string, position: Position) => void;
  resizeNote: (id: string, size: { width: number; height: number }) => void;
  selectNote: (id: string | null) => void;
  selectNotes: (ids: string[]) => void;
  clearSelection: () => void;
  bringToFront: (id: string) => void;
  duplicateNote: (id: string) => void;
  
  // Canvas actions
  setPan: (pan: Position) => void;
  setZoom: (zoom: number) => void;
  setIsPanning: (isPanning: boolean) => void;
  resetView: () => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Bulk operations
  deleteAllNotes: () => void;
  exportNotes: () => string;
  importNotes: (data: string) => void;
  // Subtasks and time tracking
  addSubtask: (noteId: string, taskId: string, title: string) => void;
  toggleSubtask: (noteId: string, taskId: string, subtaskId: string) => void;
  startTimeEntry: (noteId: string, taskId: string, source?: 'pomodoro' | 'manual', note?: string) => void;
  stopTimeEntry: (noteId: string, taskId: string, entryId?: string) => void;
  // Task helpers
  moveTask: (noteId: string, taskId: string, status: import('../types').Task['status'], order?: number) => void;
  reorderTask: (noteId: string, taskId: string, newOrder: number) => void;
  bulkUpdateTasks: (noteId: string, taskIds: string[], updates: Partial<import('../types').Task>) => void;
  // Users
  addUser: (user: { name: string; email?: string; avatarUrl?: string }) => string;
  updateUser: (id: string, updates: Partial<{ name: string; email?: string; avatarUrl?: string }>) => void;
  removeUser: (id: string) => void;
}

const NOTE_COLORS: NoteColor[] = [
  '#1f2937',
  '#1e293b',
  '#1e3a5f',
  '#1f2937',
  '#1a2332',
  '#1e2530',
  '#1c2333',
  '#1a1f2e'
];

const PINK_NOTE_COLORS: NoteColor[] = [
  '#3d1a2e',
  '#3a1e33',
  '#3d2035',
  '#3b1d31',
  '#3e1f34',
  '#3c1e30',
  '#3a1d2f',
  '#3d1f33'
];

const getRandomColor = (canvasType: CanvasType): NoteColor => {
  const colors = canvasType === 'project' ? PINK_NOTE_COLORS : NOTE_COLORS;
  return colors[Math.floor(Math.random() * colors.length)];
};

const getMaxZIndex = (notes: StickyNote[]): number => {
  return Math.max(0, ...notes.map(n => n.zIndex));
};

const createNote = (position: Position, existingNotes: StickyNote[], canvasType: CanvasType): StickyNote => {
  const now = Date.now();
  return {
    id: `note-${now}-${Math.random().toString(36).substr(2, 9)}`,
    x: position.x,
    y: position.y,
    text: 'New Note',
    color: getRandomColor(canvasType),
    width: 250,
    height: 200,
    rotation: 0,
    zIndex: getMaxZIndex(existingNotes) + 1,
    createdAt: now,
    updatedAt: now,
  };
};

const createCanvasId = () => `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createTaskColor = (): string => {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue} 90% 55%)`;
};

const getTaskStatus = (task: Partial<import('../types').Task> | undefined) => {
  return (task?.status ?? 'not-started') as import('../types').Task['status'];
};

const getNextTaskOrder = (tasks: Array<Partial<import('../types').Task>> | undefined, status: import('../types').Task['status']) => {
  const list = tasks ?? [];
  const max = list.reduce((m, t) => {
    if (getTaskStatus(t) !== status) return m;
    return Math.max(m, typeof t.order === 'number' ? t.order : 0);
  }, 0);
  return max + 1;
};

const normalizePersistedTasksV3 = (state: any) => {
  const canvases = state?.canvases;
  if (!canvases || typeof canvases !== 'object') return state;

  const nextCanvases: Record<string, StickyNote[]> = {};

  for (const canvasId of Object.keys(canvases)) {
    const notes = Array.isArray(canvases[canvasId]) ? (canvases[canvasId] as StickyNote[]) : [];
    nextCanvases[canvasId] = notes.map((note) => {
      const tasks = note.tasks ?? [];
      if (tasks.length === 0) return note;

      const counters: Record<import('../types').Task['status'], number> = {
        'not-started': 0,
        'in-progress': 0,
        'completed': 0,
      };

      const normalizedTasks = tasks.map((t) => {
        const status = (t.status ?? 'not-started') as import('../types').Task['status'];
        const order = typeof t.order === 'number' ? t.order : (counters[status] += 1);
        if (typeof t.order !== 'number') counters[status] = order;

        return {
          ...t,
          color: t.color ?? createTaskColor(),
          priority: t.priority ?? 'medium',
          dueDate: t.dueDate ?? t.endDate,
          order,
          status,
          timeSpentMs: typeof (t as any).timeSpentMs === 'number' ? (t as any).timeSpentMs : 0,
          pomodorosCompleted: typeof (t as any).pomodorosCompleted === 'number' ? (t as any).pomodorosCompleted : 0,
        };
      });

      return { ...note, tasks: normalizedTasks };
    });
  }

  const activeCanvasId = state?.activeCanvasId;
  return {
    ...state,
    canvases: nextCanvases,
    notes: activeCanvasId && nextCanvases[activeCanvasId] ? nextCanvases[activeCanvasId] : state?.notes,
  };
};

const normalizePersistedTasksV4 = (state: any) => {
  // start from V3 normalization then ensure new fields exist
  const v3 = normalizePersistedTasksV3(state);
  const canvases = v3?.canvases;
  if (!canvases || typeof canvases !== 'object') return v3;

  const nextCanvases: Record<string, StickyNote[]> = {};

  for (const canvasId of Object.keys(canvases)) {
    const notes = Array.isArray(canvases[canvasId]) ? (canvases[canvasId] as StickyNote[]) : [];
    nextCanvases[canvasId] = notes.map((note) => {
      const tasks = note.tasks ?? [];
      if (!tasks || tasks.length === 0) return { ...note, tasks: [], updatedAt: note.updatedAt };

      const normalizedTasks = tasks.map((t) => ({
        ...t,
        tags: Array.isArray((t as any).tags) ? (t as any).tags : [],
        subtasks: Array.isArray((t as any).subtasks) ? (t as any).subtasks : [],
        estimateHours: typeof (t as any).estimateHours === 'number' ? (t as any).estimateHours : undefined,
        assigneeId: typeof (t as any).assigneeId === 'string' ? (t as any).assigneeId : undefined,
        timeEntries: Array.isArray((t as any).timeEntries) ? (t as any).timeEntries : [],
        timeSpentMs: typeof (t as any).timeSpentMs === 'number' ? (t as any).timeSpentMs : 0,
        pomodorosCompleted: typeof (t as any).pomodorosCompleted === 'number' ? (t as any).pomodorosCompleted : 0,
      }));

      return { ...note, tasks: normalizedTasks };
    });
  }

  const activeCanvasId = v3?.activeCanvasId;
  return {
    ...v3,
    canvases: nextCanvases,
    notes: activeCanvasId && nextCanvases[activeCanvasId] ? nextCanvases[activeCanvasId] : v3?.notes,
  };
};

const DEFAULT_IDEAS_CANVAS_ID = 'ideas';
const DEFAULT_PROJECTS_CANVAS_ID = 'projects';

const createDefaultCanvases = () => {
  const now = Date.now();
  const ideasMeta: CanvasMeta = { id: DEFAULT_IDEAS_CANVAS_ID, name: 'Ideas', type: 'idea', createdAt: now };
  const projectsMeta: CanvasMeta = { id: DEFAULT_PROJECTS_CANVAS_ID, name: 'Projects', type: 'project', createdAt: now };
  return {
    canvases: {
      [DEFAULT_IDEAS_CANVAS_ID]: [] as StickyNote[],
      [DEFAULT_PROJECTS_CANVAS_ID]: [] as StickyNote[],
    } as Record<CanvasId, StickyNote[]>,
    canvasesMeta: {
      [DEFAULT_IDEAS_CANVAS_ID]: ideasMeta,
      [DEFAULT_PROJECTS_CANVAS_ID]: projectsMeta,
    } as Record<CanvasId, CanvasMeta>,
    canvasOrder: [DEFAULT_IDEAS_CANVAS_ID, DEFAULT_PROJECTS_CANVAS_ID] as CanvasId[],
    activeCanvasId: DEFAULT_IDEAS_CANVAS_ID as CanvasId,
    activeCanvasMeta: ideasMeta,
  };
};

const saveToHistory = (notes: StickyNote[], history: StickyNote[][], historyIndex: number) => {
  const newHistory = history.slice(0, historyIndex + 1);
  newHistory.push(JSON.parse(JSON.stringify(notes)));
  // Keep only last 50 history states
  if (newHistory.length > 50) {
    newHistory.shift();
    return { history: newHistory, historyIndex: newHistory.length - 1 };
  }
  return { history: newHistory, historyIndex: newHistory.length - 1 };
};

export const useNotesStore = create<NotesState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        ...createDefaultCanvases(),
        notes: [],
        // sample users
        users: [
          { id: 'user-1', name: 'Alice', email: 'alice@example.com', avatarUrl: '' },
          { id: 'user-2', name: 'Bob', email: 'bob@example.com', avatarUrl: '' },
        ],
        selectedNoteId: null,
        selectedNoteIds: [],
        detailViewNoteId: null,
        pan: { x: 0, y: 0 },
        zoom: 1,
        isPanning: false,
        history: [[]],
        historyIndex: 0,

        // Canvas switching
        setActiveCanvas: (canvasId) => set((state) => {
          const meta = state.canvasesMeta[canvasId];
          if (!meta) return state;
          const notes = state.canvases[canvasId] ?? [];
          return {
            activeCanvasId: canvasId,
            activeCanvasMeta: meta,
            notes,
            selectedNoteId: null,
            selectedNoteIds: [],
            detailViewNoteId: null,
            history: [JSON.parse(JSON.stringify(notes))],
            historyIndex: 0,
          };
        }),

        addCanvas: ({ name, type }) => {
          const id = createCanvasId();
          const meta: CanvasMeta = { id, name, type, createdAt: Date.now() };
          set((state) => ({
            canvases: { ...state.canvases, [id]: [] },
            canvasesMeta: { ...state.canvasesMeta, [id]: meta },
            canvasOrder: [...state.canvasOrder, id],
          }));
          return id;
        },

        renameCanvas: (canvasId, name) => set((state) => {
          const meta = state.canvasesMeta[canvasId];
          if (!meta) return state;
          const updatedMeta = { ...meta, name };
          return {
            canvasesMeta: {
              ...state.canvasesMeta,
              [canvasId]: updatedMeta,
            },
            activeCanvasMeta: state.activeCanvasId === canvasId ? updatedMeta : state.activeCanvasMeta,
          };
        }),

        deleteCanvas: (canvasId) => set((state) => {
          if (!state.canvasesMeta[canvasId]) return state;

          const remainingIds = state.canvasOrder.filter(id => id !== canvasId);
          if (remainingIds.length === 0) return state;

          const { [canvasId]: _, ...remainingCanvases } = state.canvases;
          const { [canvasId]: __, ...remainingMeta } = state.canvasesMeta;

          const nextActiveId = state.activeCanvasId === canvasId ? remainingIds[0] : state.activeCanvasId;
          const nextNotes = remainingCanvases[nextActiveId] ?? [];
          const nextMeta = remainingMeta[nextActiveId];

          return {
            canvases: remainingCanvases,
            canvasesMeta: remainingMeta,
            canvasOrder: remainingIds,
            activeCanvasId: nextActiveId,
            activeCanvasMeta: nextMeta,
            notes: nextNotes,
            selectedNoteId: null,
            selectedNoteIds: [],
            detailViewNoteId: null,
            history: [JSON.parse(JSON.stringify(nextNotes))],
            historyIndex: 0,
          };
        }),

        // Users
        addUser: (user) => {
          const id = `user-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
          set((state) => ({ users: [...(state.users || []), { id, ...user }] }));
          return id;
        },
        updateUser: (id, updates) => set((state) => ({ users: (state.users || []).map(u => u.id === id ? { ...u, ...updates } : u) })),
        removeUser: (id) => set((state) => ({ users: (state.users || []).filter(u => u.id !== id) })),

        // Detail view
        setDetailViewNoteId: (id) => set({ detailViewNoteId: id }),

        // Attachments
        addAttachment: (noteId, attachment) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const newAttachment = {
            ...attachment,
            id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: Date.now(),
          };
          const newNotes = currentNotes.map(note =>
            note.id === noteId
              ? { ...note, attachments: [...(note.attachments || []), newAttachment], updatedAt: Date.now() }
              : note
          );
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvasId]: newNotes,
          };
          return {
            canvases: newCanvases,
            notes: newNotes,
          };
        }),

        removeAttachment: (noteId, attachmentId) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const newNotes = currentNotes.map(note =>
            note.id === noteId
              ? { ...note, attachments: (note.attachments || []).filter(a => a.id !== attachmentId), updatedAt: Date.now() }
              : note
          );
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvasId]: newNotes,
          };
          return {
            canvases: newCanvases,
            notes: newNotes,
          };
        }),

        // Tasks
        addTask: (noteId, task) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const now = Date.now();
          const newNotes = currentNotes.map(note =>
            note.id === noteId ? (() => {
              const existingTasks = note.tasks || [];
              const status = (task.status ?? 'not-started') as import('../types').Task['status'];
              const order = typeof task.order === 'number' ? task.order : getNextTaskOrder(existingTasks, status);

              const newTask = {
                ...task,
                id: `task-${now}-${Math.random().toString(36).substr(2, 9)}`,
                createdAt: now,
                color: task.color ?? createTaskColor(),
                priority: task.priority ?? 'medium',
                dueDate: task.dueDate ?? task.endDate,
                order,
                status,
                timeSpentMs: typeof (task as any).timeSpentMs === 'number' ? (task as any).timeSpentMs : 0,
                pomodorosCompleted: typeof (task as any).pomodorosCompleted === 'number' ? (task as any).pomodorosCompleted : 0,
              };

              return { ...note, tasks: [...existingTasks, newTask], updatedAt: now };
            })() : note
          );
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvasId]: newNotes,
          };
          return {
            canvases: newCanvases,
            notes: newNotes,
          };
        }),

        updateTask: (noteId, taskId, updates) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const newNotes = currentNotes.map(note =>
            note.id === noteId
              ? {
                  ...note,
                  tasks: (note.tasks || []).map(task =>
                    task.id === taskId ? (() => {
                      const nextStatus = (updates.status ?? task.status ?? 'not-started') as import('../types').Task['status'];
                      const currentStatus = (task.status ?? 'not-started') as import('../types').Task['status'];
                      let nextOrder = updates.order ?? task.order;

                      if (updates.status && updates.status !== currentStatus && updates.order === undefined) {
                        nextOrder = getNextTaskOrder(note.tasks || [], nextStatus);
                      }

                      return {
                        ...task,
                        ...updates,
                        status: nextStatus,
                        order: nextOrder,
                        priority: (updates as any).priority ?? task.priority ?? 'medium',
                        dueDate: (updates as any).dueDate ?? task.dueDate ?? task.endDate,
                        color: task.color ?? createTaskColor(),
                        timeSpentMs:
                          typeof (updates as any).timeSpentMs === 'number'
                            ? (updates as any).timeSpentMs
                            : (typeof (task as any).timeSpentMs === 'number' ? (task as any).timeSpentMs : 0),
                        pomodorosCompleted:
                          typeof (updates as any).pomodorosCompleted === 'number'
                            ? (updates as any).pomodorosCompleted
                            : (typeof (task as any).pomodorosCompleted === 'number' ? (task as any).pomodorosCompleted : 0),
                      };
                    })() : task
                  ),
                  updatedAt: Date.now()
                }
              : note
          );
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvasId]: newNotes,
          };
          return {
            canvases: newCanvases,
            notes: newNotes,
          };
        }),

        removeTask: (noteId, taskId) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const newNotes = currentNotes.map(note =>
            note.id === noteId
              ? { ...note, tasks: (note.tasks || []).filter(t => t.id !== taskId), updatedAt: Date.now() }
              : note
          );
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvasId]: newNotes,
          };
          return {
            canvases: newCanvases,
            notes: newNotes,
          };
        }),

        // Subtasks
        addSubtask: (noteId, taskId, title) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const now = Date.now();
          const newNotes = currentNotes.map(note =>
            note.id === noteId
              ? {
                  ...note,
                  tasks: (note.tasks || []).map(task =>
                    task.id === taskId
                      ? { ...task, subtasks: [...(task.subtasks || []), { id: `sub-${now}-${Math.random().toString(36).slice(2,8)}`, title, done: false }], updatedAt: Date.now() }
                      : task
                  ),
                  updatedAt: now,
                }
              : note
          );
          const newCanvases = { ...state.canvases, [state.activeCanvasId]: newNotes };
          return { canvases: newCanvases, notes: newNotes };
        }),

        toggleSubtask: (noteId, taskId, subtaskId) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const now = Date.now();
          const newNotes = currentNotes.map(note =>
            note.id === noteId
              ? {
                  ...note,
                  tasks: (note.tasks || []).map(task =>
                    task.id === taskId
                      ? {
                          ...task,
                          subtasks: (task.subtasks || []).map(s => s.id === subtaskId ? { ...s, done: !s.done } : s),
                        }
                      : task
                  ),
                  updatedAt: now,
                }
              : note
          );
          const newCanvases = { ...state.canvases, [state.activeCanvasId]: newNotes };
          return { canvases: newCanvases, notes: newNotes };
        }),

        // Time entries (start/stop)
        startTimeEntry: (noteId, taskId, source = 'manual', entryNote) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const now = Date.now();
          const newNotes = currentNotes.map(note =>
            note.id === noteId
              ? {
                  ...note,
                  tasks: (note.tasks || []).map(task => {
                    if (task.id !== taskId) return task;
                    // avoid starting another running entry
                    const running = (task.timeEntries || []).some(te => te.endedAt === undefined);
                    if (running) return task;
                    const newEntry = { id: `te-${now}-${Math.random().toString(36).slice(2,8)}`, startedAt: now, source, note: entryNote };
                    return { ...task, timeEntries: [...(task.timeEntries || []), newEntry] };
                  }),
                  updatedAt: now,
                }
              : note
          );
          const newCanvases = { ...state.canvases, [state.activeCanvasId]: newNotes };
          return { canvases: newCanvases, notes: newNotes };
        }),

        stopTimeEntry: (noteId, taskId, entryId) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const now = Date.now();
          const newNotes = currentNotes.map(note =>
            note.id === noteId
              ? {
                  ...note,
                  tasks: (note.tasks || []).map(task => {
                    if (task.id !== taskId) return task;

                    const entries = (task.timeEntries || []).map(te => {
                      if (entryId) {
                        return te.id === entryId && te.endedAt === undefined ? { ...te, endedAt: now } : te;
                      }
                      // stop last running
                      return te.endedAt === undefined ? { ...te, endedAt: now } : te;
                    });

                    const addedMs = entries.reduce((acc, te) => {
                      if (typeof te.startedAt === 'number' && typeof te.endedAt === 'number') {
                        // if this entry just got ended, include it
                        acc += Math.max(0, te.endedAt - te.startedAt);
                      }
                      return acc;
                    }, 0);

                    const nextTimeSpent = (task.timeSpentMs ?? 0) + addedMs;

                    return { ...task, timeEntries: entries, timeSpentMs: nextTimeSpent };
                  }),
                  updatedAt: now,
                }
              : note
          );
          const newCanvases = { ...state.canvases, [state.activeCanvasId]: newNotes };
          return { canvases: newCanvases, notes: newNotes };
        }),

        moveTask: (noteId, taskId, status, order) => set((state) => {
          // reuse updateTask logic but ensure order set
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const newNotes = currentNotes.map(note =>
            note.id === noteId
              ? {
                  ...note,
                  tasks: (note.tasks || []).map(task =>
                    task.id === taskId ? { ...task, status, order: typeof order === 'number' ? order : task.order } : task
                  ),
                  updatedAt: Date.now(),
                }
              : note
          );
          const newCanvases = { ...state.canvases, [state.activeCanvasId]: newNotes };
          return { canvases: newCanvases, notes: newNotes };
        }),

        reorderTask: (noteId, taskId, newOrder) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const now = Date.now();
          const newNotes = currentNotes.map(note => {
            if (note.id !== noteId) return note;
            const tasks = (note.tasks || []).slice();
            const target = tasks.find(t => t.id === taskId);
            if (!target) return note;
            const fromOrder = target.order ?? 0;
            // clamp
            const toOrder = Math.max(1, newOrder);
            // shift others
            const updated = tasks.map(t => {
              if (t.id === taskId) return { ...t, order: toOrder };
              if (typeof t.order !== 'number') return t;
              if (fromOrder < toOrder) {
                // moved down
                if (t.order > fromOrder && t.order <= toOrder) return { ...t, order: t.order - 1 };
              } else if (fromOrder > toOrder) {
                if (t.order >= toOrder && t.order < fromOrder) return { ...t, order: t.order + 1 };
              }
              return t;
            });
            return { ...note, tasks: updated, updatedAt: now };
          });
          const newCanvases = { ...state.canvases, [state.activeCanvasId]: newNotes };
          return { canvases: newCanvases, notes: newNotes };
        }),

        bulkUpdateTasks: (noteId, taskIds, updates) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const now = Date.now();
          const newNotes = currentNotes.map(note =>
            note.id === noteId
              ? {
                  ...note,
                  tasks: (note.tasks || []).map(task => taskIds.includes(task.id) ? { ...task, ...updates } : task),
                  updatedAt: now,
                }
              : note
          );
          const newCanvases = { ...state.canvases, [state.activeCanvasId]: newNotes };
          return { canvases: newCanvases, notes: newNotes };
        }),

        // Note actions
        addNote: (position) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const newNote = createNote(position, currentNotes, state.activeCanvasMeta.type);
          const newNotes = [...currentNotes, newNote];
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvasId]: newNotes,
          };
          const historyUpdate = saveToHistory(newNotes, state.history, state.historyIndex);
          return {
            canvases: newCanvases,
            notes: newNotes,
            selectedNoteId: newNote.id,
            ...historyUpdate,
          };
        }),

        updateNote: (id, updates) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const newNotes = currentNotes.map(note =>
            note.id === id
              ? { ...note, ...updates, updatedAt: Date.now() }
              : note
          );
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvasId]: newNotes,
          };
          const historyUpdate = saveToHistory(newNotes, state.history, state.historyIndex);
          return {
            canvases: newCanvases,
            notes: newNotes,
            ...historyUpdate,
          };
        }),

        deleteNote: (id) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const newNotes = currentNotes.filter(note => note.id !== id);
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvasId]: newNotes,
          };
          const historyUpdate = saveToHistory(newNotes, state.history, state.historyIndex);
          return {
            canvases: newCanvases,
            notes: newNotes,
            selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
            selectedNoteIds: state.selectedNoteIds.filter(nid => nid !== id),
            ...historyUpdate,
          };
        }),

        moveNote: (id, position) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const newNotes = currentNotes.map(note =>
            note.id === id
              ? { ...note, x: position.x, y: position.y, updatedAt: Date.now() }
              : note
          );
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvasId]: newNotes,
          };
          return {
            canvases: newCanvases,
            notes: newNotes,
          };
        }),

        resizeNote: (id, size) => set((state) => ({
          notes: state.notes.map(note =>
            note.id === id
              ? { ...note, ...size, updatedAt: Date.now() }
              : note
          ),
        })),

        selectNote: (id) => set({ selectedNoteId: id, selectedNoteIds: id ? [id] : [] }),

        selectNotes: (ids) => set({ selectedNoteIds: ids, selectedNoteId: ids.length === 1 ? ids[0] : null }),

        clearSelection: () => set({ selectedNoteIds: [], selectedNoteId: null }),

        bringToFront: (id) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const maxZ = getMaxZIndex(currentNotes);
          const newNotes = currentNotes.map(note =>
            note.id === id ? { ...note, zIndex: maxZ + 1 } : note
          );
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvasId]: newNotes,
          };
          return {
            canvases: newCanvases,
            notes: newNotes,
          };
        }),

        duplicateNote: (id) => set((state) => {
          const original = state.notes.find(note => note.id === id);
          if (!original) return state;
          
          const duplicate = createNote(
            { x: original.x + 30, y: original.y + 30 },
            state.notes,
            state.activeCanvasMeta.type
          );
          const newNote = {
            ...duplicate,
            text: original.text,
            color: original.color,
            width: original.width,
            height: original.height,
          };
          const newNotes = [...state.notes, newNote];
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvasId]: newNotes,
          };
          const historyUpdate = saveToHistory(newNotes, state.history, state.historyIndex);
          
          return {
            canvases: newCanvases,
            notes: newNotes,
            selectedNoteId: newNote.id,
            ...historyUpdate,
          };
        }),

        // Canvas actions
        setPan: (pan) => set({ pan }),
        setZoom: (zoom) => set({ zoom: Math.min(Math.max(0.1, zoom), 3) }),
        setIsPanning: (isPanning) => set({ isPanning }),
        resetView: () => set({ pan: { x: 0, y: 0 }, zoom: 1 }),

        // History
        undo: () => set((state) => {
          if (state.historyIndex > 0) {
            const newIndex = state.historyIndex - 1;
            return {
              notes: JSON.parse(JSON.stringify(state.history[newIndex])),
              historyIndex: newIndex,
            };
          }
          return state;
        }),

        redo: () => set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            const newIndex = state.historyIndex + 1;
            return {
              notes: JSON.parse(JSON.stringify(state.history[newIndex])),
              historyIndex: newIndex,
            };
          }
          return state;
        }),

        canUndo: () => get().historyIndex > 0,
        canRedo: () => get().historyIndex < get().history.length - 1,

        // Bulk operations
        deleteAllNotes: () => set((state) => {
          const historyUpdate = saveToHistory([], state.history, state.historyIndex);
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvasId]: [],
          };
          return {
            canvases: newCanvases,
            notes: [],
            selectedNoteId: null,
            ...historyUpdate,
          };
        }),

        exportNotes: () => {
          const { notes } = get();
          return JSON.stringify(notes, null, 2);
        },

        importNotes: (data) => set((state) => {
          try {
            const importedNotes = JSON.parse(data) as StickyNote[];
            const historyUpdate = saveToHistory(importedNotes, state.history, state.historyIndex);
            const newCanvases = {
              ...state.canvases,
              [state.activeCanvasId]: importedNotes,
            };
            return {
              canvases: newCanvases,
              notes: importedNotes,
              ...historyUpdate,
            };
          } catch (error) {
            console.error('Failed to import notes:', error);
            return state;
          }
        }),
      }),
      {
        name: 'sticky-notes-storage',
        version: 5,
        migrate: (persistedState: any, version) => {
          if (version === 5) return persistedState;
          if (version === 4) return normalizePersistedTasksV4(persistedState);
          if (version === 3) return normalizePersistedTasksV3(persistedState);
          if (version === 2) return normalizePersistedTasksV3(persistedState);

          const base = createDefaultCanvases();
          try {
            const oldCanvases = persistedState?.canvases;
            const oldActiveCanvas = persistedState?.activeCanvas;

            if (oldCanvases && (oldCanvases[1] || oldCanvases[2])) {
              base.canvases[DEFAULT_IDEAS_CANVAS_ID] = oldCanvases[1] ?? [];
              base.canvases[DEFAULT_PROJECTS_CANVAS_ID] = oldCanvases[2] ?? [];
            }

            if (oldActiveCanvas === 2) {
              base.activeCanvasId = DEFAULT_PROJECTS_CANVAS_ID;
              base.activeCanvasMeta = base.canvasesMeta[DEFAULT_PROJECTS_CANVAS_ID];
            }

            const migratedToV2 = {
              ...base,
              notes: base.canvases[base.activeCanvasId] ?? [],
              pan: persistedState?.pan ?? { x: 0, y: 0 },
              zoom: persistedState?.zoom ?? 1,
            };

            return normalizePersistedTasksV3(migratedToV2);
          } catch {
            return normalizePersistedTasksV3({
              ...base,
              notes: [],
              pan: { x: 0, y: 0 },
              zoom: 1,
            });
          }
        },
        partialize: (state) => ({
          canvases: state.canvases,
          canvasesMeta: state.canvasesMeta,
          canvasOrder: state.canvasOrder,
          activeCanvasId: state.activeCanvasId,
          activeCanvasMeta: state.activeCanvasMeta,
          pan: state.pan,
          zoom: state.zoom,
        }),
      }
    )
  )
);
