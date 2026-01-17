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

export type NoteColor = 
  | '#1f2937' // Dark gray
  | '#1e293b' // Slate dark
  | '#1e3a5f' // Dark blue
  | '#1f2937' // Gray
  | '#1a2332' // Navy dark
  | '#1e2530' // Dark steel
  | '#1c2333' // Midnight
  | '#1a1f2e'; // Deep dark
