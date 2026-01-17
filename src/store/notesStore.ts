import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { StickyNote, Position, NoteColor } from '../types';

interface NotesState {
  // State
  notes: StickyNote[];
  selectedNoteId: string | null;
  selectedNoteIds: string[];
  pan: Position;
  zoom: number;
  isPanning: boolean;
  history: StickyNote[][];
  historyIndex: number;
  
  // Actions
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

const getRandomColor = (): NoteColor => {
  return NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
};

const getMaxZIndex = (notes: StickyNote[]): number => {
  return Math.max(0, ...notes.map(n => n.zIndex));
};

const createNote = (position: Position, existingNotes: StickyNote[]): StickyNote => {
  const now = Date.now();
  return {
    id: `note-${now}-${Math.random().toString(36).substr(2, 9)}`,
    x: position.x,
    y: position.y,
    text: 'New Note',
    color: getRandomColor(),
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
        notes: [],
        selectedNoteId: null,
        selectedNoteIds: [],
        pan: { x: 0, y: 0 },
        zoom: 1,
        isPanning: false,
        history: [[]],
        historyIndex: 0,

        // Note actions
        addNote: (position) => set((state) => {
          const newNote = createNote(position, state.notes);
          const newNotes = [...state.notes, newNote];
          const historyUpdate = saveToHistory(newNotes, state.history, state.historyIndex);
          return {
            notes: newNotes,
            selectedNoteId: newNote.id,
            ...historyUpdate,
          };
        }),

        updateNote: (id, updates) => set((state) => {
          const newNotes = state.notes.map(note =>
            note.id === id
              ? { ...note, ...updates, updatedAt: Date.now() }
              : note
          );
          const historyUpdate = saveToHistory(newNotes, state.history, state.historyIndex);
          return {
            notes: newNotes,
            ...historyUpdate,
          };
        }),

        deleteNote: (id) => set((state) => {
          const newNotes = state.notes.filter(note => note.id !== id);
          const historyUpdate = saveToHistory(newNotes, state.history, state.historyIndex);
          return {
            notes: newNotes,
            selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
            selectedNoteIds: state.selectedNoteIds.filter(nid => nid !== id),
            ...historyUpdate,
          };
        }),

        moveNote: (id, position) => set((state) => ({
          notes: state.notes.map(note =>
            note.id === id
              ? { ...note, x: position.x, y: position.y, updatedAt: Date.now() }
              : note
          ),
        })),

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
          const maxZ = getMaxZIndex(state.notes);
          return {
            notes: state.notes.map(note =>
              note.id === id ? { ...note, zIndex: maxZ + 1 } : note
            ),
          };
        }),

        duplicateNote: (id) => set((state) => {
          const original = state.notes.find(note => note.id === id);
          if (!original) return state;
          
          const duplicate = createNote(
            { x: original.x + 30, y: original.y + 30 },
            state.notes
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
          notes: state.notes,
          pan: state.pan,
          zoom: state.zoom,
        }),
      }
    )
  )
);
