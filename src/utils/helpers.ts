import { Position } from '../types';

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const screenToCanvas = (
  screenPos: Position,
  canvasRect: DOMRect,
  pan: Position,
  zoom: number
): Position => {
  return {
    x: (screenPos.x - canvasRect.left - pan.x) / zoom,
    y: (screenPos.y - canvasRect.top - pan.y) / zoom,
  };
};

export const canvasToScreen = (
  canvasPos: Position,
  pan: Position,
  zoom: number
): Position => {
  return {
    x: canvasPos.x * zoom + pan.x,
    y: canvasPos.y * zoom + pan.y,
  };
};

export const downloadJSON = (data: string, filename: string): void => {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
