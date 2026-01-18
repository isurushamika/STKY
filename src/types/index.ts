export interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  createdAt: number;
  updatedAt: number;
  attachments?: Attachment[];
  tasks?: Task[];
}

export interface Attachment {
  id: string;
  type: 'link' | 'file' | 'image';
  name: string;
  url: string;
  createdAt: number;
}

export interface Task {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  dueDate?: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  order?: number;
  color?: string;
  timeSpentMs?: number;
  pomodorosCompleted?: number;
  // New optional fields for richer project management
  tags?: string[];
  subtasks?: Array<{ id: string; title: string; done?: boolean }>;
  estimateHours?: number;
  assigneeId?: string;
  // Time entries provide a durable record of started/stopped work sessions
  timeEntries?: Array<{
    id: string;
    startedAt: number; // epoch ms
    endedAt?: number; // epoch ms | undefined when running
    source?: 'pomodoro' | 'manual';
    note?: string;
  }>;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface CanvasState {
  pan: Position;
  zoom: number;
  isPanning: boolean;
}

export type CanvasType = 'idea' | 'project';

export interface CanvasMeta {
  id: string;
  name: string;
  type: CanvasType;
  createdAt: number;
}

export type NoteColor = 
  | '#1f2937' // Dark gray
  | '#1e293b' // Slate dark
  | '#1e3a5f' // Dark blue
  | '#1f2937' // Gray
  | '#1a2332' // Navy dark
  | '#1e2530' // Dark steel
  | '#1c2333' // Midnight
  | '#1a1f2e' // Deep dark
  | '#3d1a2e' // Dark pink
  | '#3a1e33' // Deep pink
  | '#3d2035' // Pink slate
  | '#3b1d31' // Pink gray
  | '#3e1f34' // Pink navy
  | '#3c1e30' // Pink steel
  | '#3a1d2f' // Pink midnight
  | '#3d1f33'; // Pink deep
