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
          const newTask = {
            ...task,
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: Date.now(),
          };
          const newNotes = currentNotes.map(note =>
            note.id === noteId
              ? { ...note, tasks: [...(note.tasks || []), newTask], updatedAt: Date.now() }
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

        updateTask: (noteId, taskId, updates) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvasId] ?? [];
          const newNotes = currentNotes.map(note =>
            note.id === noteId
              ? {
                  ...note,
                  tasks: (note.tasks || []).map(task =>
                    task.id === taskId ? { ...task, ...updates } : task
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
        version: 2,
        migrate: (persistedState: any, version) => {
          if (version === 2) return persistedState;

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

            return {
              ...base,
              notes: base.canvases[base.activeCanvasId] ?? [],
              pan: persistedState?.pan ?? { x: 0, y: 0 },
              zoom: persistedState?.zoom ?? 1,
            };
          } catch {
            return {
              ...base,
              notes: [],
              pan: { x: 0, y: 0 },
              zoom: 1,
            };
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
