import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { StickyNote, Position, NoteColor } from '../types';

interface NotesState {
  // State
  canvases: {
    1: StickyNote[];
    2: StickyNote[];
  };
  activeCanvas: 1 | 2;
  notes: StickyNote[];
  selectedNoteId: string | null;
  selectedNoteIds: string[];
  pan: Position;
  zoom: number;
  isPanning: boolean;
  history: StickyNote[][];
  historyIndex: number;
  
  // Actions
  setActiveCanvas: (canvas: 1 | 2) => void;
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

const getRandomColor = (canvas: 1 | 2): NoteColor => {
  const colors = canvas === 2 ? PINK_NOTE_COLORS : NOTE_COLORS;
  return colors[Math.floor(Math.random() * colors.length)];
};

const getMaxZIndex = (notes: StickyNote[]): number => {
  return Math.max(0, ...notes.map(n => n.zIndex));
};

const createNote = (position: Position, existingNotes: StickyNote[], canvas: 1 | 2): StickyNote => {
  const now = Date.now();
  return {
    id: `note-${now}-${Math.random().toString(36).substr(2, 9)}`,
    x: position.x,
    y: position.y,
    text: 'New Note',
    color: getRandomColor(canvas),
    width: 250,
    height: 200,
    rotation: 0,
    zIndex: getMaxZIndex(existingNotes) + 1,
    createdAt: now,
    updatedAt: now,
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
        canvases: {
          1: [],
          2: [],
        },
        activeCanvas: 1,
        notes: [],
        selectedNoteId: null,
        selectedNoteIds: [],
        pan: { x: 0, y: 0 },
        zoom: 1,
        isPanning: false,
        history: [[]],
        historyIndex: 0,

        // Canvas switching
        setActiveCanvas: (canvas) => set((state) => ({
          activeCanvas: canvas,
          notes: state.canvases[canvas],
          selectedNoteId: null,
          selectedNoteIds: [],
        })),

        // Note actions
        addNote: (position) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvas];
          const newNote = createNote(position, currentNotes, state.activeCanvas);
          const newNotes = [...currentNotes, newNote];
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvas]: newNotes,
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
          const currentNotes = state.canvases[state.activeCanvas];
          const newNotes = currentNotes.map(note =>
            note.id === id
              ? { ...note, ...updates, updatedAt: Date.now() }
              : note
          );
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvas]: newNotes,
          };
          const historyUpdate = saveToHistory(newNotes, state.history, state.historyIndex);
          return {
            canvases: newCanvases,
            notes: newNotes,
            ...historyUpdate,
          };
        }),

        deleteNote: (id) => set((state) => {
          const currentNotes = state.canvases[state.activeCanvas];
          const newNotes = currentNotes.filter(note => note.id !== id);
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvas]: newNotes,
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
          const currentNotes = state.canvases[state.activeCanvas];
          const newNotes = currentNotes.map(note =>
            note.id === id
              ? { ...note, x: position.x, y: position.y, updatedAt: Date.now() }
              : note
          );
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvas]: newNotes,
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
          const currentNotes = state.canvases[state.activeCanvas];
          const maxZ = getMaxZIndex(currentNotes);
          const newNotes = currentNotes.map(note =>
            note.id === id ? { ...note, zIndex: maxZ + 1 } : note
          );
          const newCanvases = {
            ...state.canvases,
            [state.activeCanvas]: newNotes,
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
            state.activeCanvas
          );
          const newNote = {
            ...duplicate,
            text: original.text,
            color: original.color,
            width: original.width,
            height: original.height,
          };
          const newNotes = [...state.notes, newNote];
          const historyUpdate = saveToHistory(newNotes, state.history, state.historyIndex);
          
          return {
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
          return {
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
            return {
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
        partialize: (state) => ({
          canvases: state.canvases,
          activeCanvas: state.activeCanvas,
          pan: state.pan,
          zoom: state.zoom,
        }),
      }
    )
  )
);
