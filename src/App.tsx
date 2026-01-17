import React, { useRef, useCallback, useEffect } from 'react';
import { useNotesStore } from './store/notesStore';
import StickyNote from './components/StickyNote/StickyNote';
import './App.css';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dotMatrixRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const [selectionRect, setSelectionRect] = React.useState<{
    start: { x: number; y: number } | null;
    end: { x: number; y: number } | null;
  }>({ start: null, end: null });
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [isPanning, setIsPanning] = React.useState(false);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const panOffset = useRef({ x: 0, y: 0 });

  const {
    notes,
    selectedNoteIds,
    activeCanvas,
    setActiveCanvas,
    addNote,
    deleteNote,
    selectNotes,
    clearSelection,
  } = useNotesStore();

  const showOverlay = notes.length === 0;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedNoteIds.length > 0) {
        selectedNoteIds.forEach(id => deleteNote(id));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNoteIds, deleteNote]);

  useEffect(() => {
    const canvas = dotMatrixRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const gridSize = 40;
    const dotRadius = 1;
    const maxDotRadius = 2.5;
    const interactionRadius = 150;

    const dots: Array<{ x: number; y: number; baseRadius: number }> = [];

    for (let x = 0; x < canvas.width; x += gridSize) {
      for (let y = 0; y < canvas.height; y += gridSize) {
        dots.push({ x, y, baseRadius: dotRadius });
      }
    }

    let animationFrame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouseX = mousePos.current.x;
      const mouseY = mousePos.current.y;

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const dx = mouseX - dot.x;
        const dy = mouseY - dot.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let radius = dot.baseRadius;
        let alpha = 0.35;

        if (distance < interactionRadius) {
          const factor = 1 - distance / interactionRadius;
          radius = dot.baseRadius + (maxDotRadius - dot.baseRadius) * factor;
          alpha = 0.35 + 0.35 * factor;
        }

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle click creates a note
    if (e.button === 1) {
      e.preventDefault();
      const target = e.target as HTMLElement;
      if (target.closest('.sticky-note')) return;

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const position = {
        x: e.clientX - rect.left - pan.x,
        y: e.clientY - rect.top - pan.y,
      };

      addNote(position);
      return;
    }

    // Right click starts panning
    if (e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      panOffset.current = { x: pan.x, y: pan.y };
      return;
    }

    // Left click starts selection rectangle
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      if (target.closest('.sticky-note')) return;

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const point = {
        x: e.clientX - rect.left - pan.x,
        y: e.clientY - rect.top - pan.y,
      };

      setIsSelecting(true);
      setSelectionRect({ start: point, end: point });
      clearSelection();
    }
  }, [addNote, clearSelection, pan]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    mousePos.current = { x: e.clientX, y: e.clientY };

    if (isPanning) {
      const deltaX = e.clientX - panStart.current.x;
      const deltaY = e.clientY - panStart.current.y;
      setPan({
        x: panOffset.current.x + deltaX,
        y: panOffset.current.y + deltaY,
      });
      return;
    }

    if (isSelecting && selectionRect.start) {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const point = {
        x: e.clientX - rect.left - pan.x,
        y: e.clientY - rect.top - pan.y,
      };
      setSelectionRect(prev => ({ ...prev, end: point }));
    }
  }, [isSelecting, isPanning, selectionRect.start, pan]);

  const handleCanvasMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isSelecting && selectionRect.start && selectionRect.end) {
      // Calculate selection bounds
      const minX = Math.min(selectionRect.start.x, selectionRect.end.x);
      const maxX = Math.max(selectionRect.start.x, selectionRect.end.x);
      const minY = Math.min(selectionRect.start.y, selectionRect.end.y);
      const maxY = Math.max(selectionRect.start.y, selectionRect.end.y);

      // Find notes that intersect with selection rectangle
      const selectedIds = notes
        .filter(note => {
          const noteRight = note.x + note.width;
          const noteBottom = note.y + note.height;

          return (
            note.x < maxX &&
            noteRight > minX &&
            note.y < maxY &&
            noteBottom > minY
          );
        })
        .map(note => note.id);

      selectNotes(selectedIds);
    }

    setIsSelecting(false);
    setSelectionRect({ start: null, end: null });
  }, [isPanning, isSelecting, selectionRect, notes, selectNotes]);

  useEffect(() => {
    if (isSelecting || isPanning) {
      const handleMouseUpGlobal = () => handleCanvasMouseUp();
      window.addEventListener('mouseup', handleMouseUpGlobal);
      return () => window.removeEventListener('mouseup', handleMouseUpGlobal);
    }
    return undefined;
  }, [isSelecting, isPanning, handleCanvasMouseUp]);

  // Prevent context menu on right-click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => window.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  return (
    <div className="App">
      <div className="canvas-switcher">
        <button
          className={`canvas-button ${activeCanvas === 1 ? 'active' : ''}`}
          onClick={() => setActiveCanvas(1)}
        >
          1
        </button>
        <button
          className={`canvas-button ${activeCanvas === 2 ? 'active' : ''}`}
          onClick={() => setActiveCanvas(2)}
        >
          2
        </button>
      </div>

      <div
        ref={canvasRef}
        className={`canvas ${isPanning ? 'panning' : ''}`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
      >
        <canvas ref={dotMatrixRef} className="dot-matrix" />

        {showOverlay && (
          <div className="canvas-overlay">
            CLICK TO ADD
            <br />
            A STICKY NOTE
          </div>
        )}

        {isSelecting && selectionRect.start && selectionRect.end && (
          <div
            className="selection-rectangle"
            style={{
              left: `${Math.min(selectionRect.start.x, selectionRect.end.x)}px`,
              top: `${Math.min(selectionRect.start.y, selectionRect.end.y)}px`,
              width: `${Math.abs(selectionRect.end.x - selectionRect.start.x)}px`,
              height: `${Math.abs(selectionRect.end.y - selectionRect.start.y)}px`,
            }}
          />
        )}

        <div
          className="canvas-content"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px)`,
          }}
        >
          {notes.map((note) => (
            <StickyNote key={note.id} note={note} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
