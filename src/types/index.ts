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
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed';
  createdAt: number;
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
