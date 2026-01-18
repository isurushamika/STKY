import React, { useRef, useCallback, useEffect } from 'react';
import { useNotesStore } from '../store/notesStore';
import StickyNote from '../components/StickyNote/StickyNote';
import NoteDetailView from '../components/NoteDetailView/NoteDetailView';

type CanvasCreateType = 'idea' | 'project';

type ThemeMode = 'dark' | 'light';

interface CanvasPageProps {
  theme: ThemeMode;
}

const CanvasPage: React.FC<CanvasPageProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dotMatrixRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const dotRgbRef = useRef<string>('255, 255, 255');

  const [isAddCanvasOpen, setIsAddCanvasOpen] = React.useState(false);
  const [newCanvasName, setNewCanvasName] = React.useState('');
  const [newCanvasType, setNewCanvasType] = React.useState<CanvasCreateType>('idea');
  const [canvasMenu, setCanvasMenu] = React.useState<{ open: boolean; x: number; y: number; canvasId: string | null }>({
    open: false,
    x: 0,
    y: 0,
    canvasId: null,
  });
  const [isRenameCanvasOpen, setIsRenameCanvasOpen] = React.useState(false);
  const [renameCanvasId, setRenameCanvasId] = React.useState<string | null>(null);
  const [renameCanvasName, setRenameCanvasName] = React.useState('');
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ open: boolean; canvasId: string | null }>({
    open: false,
    canvasId: null,
  });

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
    activeCanvasId,
    canvasesMeta,
    canvasOrder,
    detailViewNoteId,
    setActiveCanvas,
    addCanvas,
    renameCanvas,
    deleteCanvas,
    addNote,
    deleteNote,
    selectNotes,
    clearSelection,
  } = useNotesStore();

  const effectiveCanvasOrder = canvasOrder.length ? canvasOrder : Object.keys(canvasesMeta);

  useEffect(() => {
    dotRgbRef.current = theme === 'light' ? '17, 24, 39' : '255, 255, 255';
  }, [theme]);

  useEffect(() => {
    if (!isAddCanvasOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAddCanvasOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddCanvasOpen]);

  const handleCreateCanvas = () => {
    const name = newCanvasName.trim();
    if (!name) return;
    const id = addCanvas({ name, type: newCanvasType });
    setActiveCanvas(id);
    setIsAddCanvasOpen(false);
    setNewCanvasName('');
    setNewCanvasType('idea');
  };

  const closeCanvasMenu = () => {
    setCanvasMenu({ open: false, x: 0, y: 0, canvasId: null });
  };

  useEffect(() => {
    if (!canvasMenu.open) return;
    const handleMouseDown = () => closeCanvasMenu();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCanvasMenu();
    };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvasMenu.open]);

  useEffect(() => {
    if (!deleteConfirm.open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDeleteConfirm({ open: false, canvasId: null });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteConfirm.open]);

  const openRenameModal = (canvasId: string) => {
    const meta = canvasesMeta[canvasId];
    if (!meta) return;
    setRenameCanvasId(canvasId);
    setRenameCanvasName(meta.name);
    setIsRenameCanvasOpen(true);
  };

  const handleRenameCanvas = () => {
    if (!renameCanvasId) return;
    const name = renameCanvasName.trim();
    if (!name) return;
    renameCanvas(renameCanvasId, name);
    setIsRenameCanvasOpen(false);
    setRenameCanvasId(null);
    setRenameCanvasName('');
  };

  const handleConfirmDeleteCanvas = () => {
    const id = deleteConfirm.canvasId;
    if (!id) return;
    deleteCanvas(id);
    setDeleteConfirm({ open: false, canvasId: null });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedNoteIds.length > 0) {
        selectedNoteIds.forEach((id) => deleteNote(id));
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

        ctx.fillStyle = `rgba(${dotRgbRef.current}, ${alpha})`;
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

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle click starts panning
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { x: e.clientX, y: e.clientY };
        panOffset.current = { x: pan.x, y: pan.y };
        return;
      }

      // Right click creates a note
      if (e.button === 2) {
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

      // Left click starts selection rectangle
      if (e.button === 0) {
        const target = e.target as HTMLElement;
        if (target.closest('.sticky-note')) return;

        clearSelection();

        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        const start = {
          x: e.clientX - rect.left - pan.x,
          y: e.clientY - rect.top - pan.y,
        };

        setSelectionRect({ start, end: start });
        setIsSelecting(true);
      }
    },
    [addNote, clearSelection, pan.x, pan.y]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      if (isPanning) {
        const dx = e.clientX - panStart.current.x;
        const dy = e.clientY - panStart.current.y;
        setPan({ x: panOffset.current.x + dx, y: panOffset.current.y + dy });
        return;
      }

      if (!isSelecting || !selectionRect.start) return;

      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const end = {
        x: e.clientX - rect.left - pan.x,
        y: e.clientY - rect.top - pan.y,
      };
      setSelectionRect((prev) => ({ ...prev, end }));
    },
    [isPanning, isSelecting, pan.x, pan.y, selectionRect.start]
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isSelecting && selectionRect.start && selectionRect.end) {
      const minX = Math.min(selectionRect.start.x, selectionRect.end.x);
      const maxX = Math.max(selectionRect.start.x, selectionRect.end.x);
      const minY = Math.min(selectionRect.start.y, selectionRect.end.y);
      const maxY = Math.max(selectionRect.start.y, selectionRect.end.y);

      const ids = notes
        .filter((n) => {
          const right = n.x + (n.width ?? 240);
          const bottom = n.y + (n.height ?? 240);
          return n.x < maxX && right > minX && n.y < maxY && bottom > minY;
        })
        .map((n) => n.id);

      selectNotes(ids);
    }

    setSelectionRect({ start: null, end: null });
    setIsSelecting(false);
  }, [isPanning, isSelecting, notes, selectNotes, selectionRect.end, selectionRect.start]);

  return (
    <div className="App">
      <canvas
        ref={dotMatrixRef}
        className="dot-matrix"
        onMouseMove={(e) => {
          mousePos.current = { x: e.clientX, y: e.clientY };
        }}
      />

      {/* Add canvas modal */}
      {isAddCanvasOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddCanvasOpen(false)}>
          <div className="add-canvas-modal" onClick={(e) => e.stopPropagation()}>
            <div className="add-canvas-header">
              <div className="add-canvas-title">Add Canvas</div>
              <button
                type="button"
                className="add-canvas-close"
                aria-label="Close add canvas"
                onClick={() => setIsAddCanvasOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="add-canvas-body">
              <label className="form-label">Canvas Type</label>
              <div className="canvas-type-row">
                <button
                  type="button"
                  className={`canvas-type-btn ${newCanvasType === 'idea' ? 'active' : ''}`}
                  onClick={() => setNewCanvasType('idea')}
                >
                  Idea
                </button>
                <button
                  type="button"
                  className={`canvas-type-btn ${newCanvasType === 'project' ? 'active' : ''}`}
                  onClick={() => setNewCanvasType('project')}
                >
                  Project
                </button>
              </div>

              <label className="form-label">Name</label>
              <input
                className="canvas-name-input"
                type="text"
                value={newCanvasName}
                onChange={(e) => setNewCanvasName(e.target.value)}
                placeholder="Canvas name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateCanvas();
                }}
              />

              <button
                type="button"
                className="create-canvas-btn"
                onClick={handleCreateCanvas}
                disabled={!newCanvasName.trim()}
                style={{ marginTop: 14 }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename canvas modal */}
      {isRenameCanvasOpen && (
        <div className="modal-backdrop" onClick={() => setIsRenameCanvasOpen(false)}>
          <div className="add-canvas-modal" onClick={(e) => e.stopPropagation()}>
            <div className="add-canvas-header">
              <div className="add-canvas-title">Rename Canvas</div>
              <button
                type="button"
                className="add-canvas-close"
                aria-label="Close rename canvas"
                onClick={() => setIsRenameCanvasOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="add-canvas-body">
              <label className="form-label">Name</label>
              <input
                className="canvas-name-input"
                type="text"
                value={renameCanvasName}
                onChange={(e) => setRenameCanvasName(e.target.value)}
                placeholder="Canvas name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameCanvas();
                }}
              />
              <button
                type="button"
                className="create-canvas-btn"
                onClick={handleRenameCanvas}
                disabled={!renameCanvasName.trim()}
                style={{ marginTop: 14 }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm.open && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm({ open: false, canvasId: null })}>
          <div className="add-canvas-modal" onClick={(e) => e.stopPropagation()}>
            <div className="add-canvas-header">
              <div className="add-canvas-title">Delete Canvas?</div>
              <button
                type="button"
                className="add-canvas-close"
                aria-label="Close delete confirmation"
                onClick={() => setDeleteConfirm({ open: false, canvasId: null })}
              >
                ×
              </button>
            </div>
            <div className="add-canvas-body">
              <div className="confirm-text">
                This will permanently delete{' '}
                <strong>
                  “{deleteConfirm.canvasId ? (canvasesMeta[deleteConfirm.canvasId]?.name ?? 'this canvas') : 'this canvas'}”
                </strong>{' '}
                and all its notes.
              </div>
              <div className="confirm-actions">
                <button
                  type="button"
                  className="create-canvas-btn secondary"
                  onClick={() => setDeleteConfirm({ open: false, canvasId: null })}
                >
                  Cancel
                </button>
                <button type="button" className="create-canvas-btn danger" onClick={handleConfirmDeleteCanvas}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={canvasRef}
        className="canvas"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="notes-container" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
          {notes.map((note) => (
            <StickyNote key={note.id} note={note} />
          ))}

          {isSelecting && selectionRect.start && selectionRect.end && (
            <div
              className="selection-rect"
              style={{
                left: Math.min(selectionRect.start.x, selectionRect.end.x) + pan.x,
                top: Math.min(selectionRect.start.y, selectionRect.end.y) + pan.y,
                width: Math.abs(selectionRect.end.x - selectionRect.start.x),
                height: Math.abs(selectionRect.end.y - selectionRect.start.y),
              }}
            />
          )}
        </div>

        <div className="canvas-switcher">
          {effectiveCanvasOrder.map((id) => {
            const meta = canvasesMeta[id];
            if (!meta) return null;
            const typeClass = meta.type === 'project' ? 'project' : 'idea';
            return (
              <button
                key={id}
                className={`canvas-button ${typeClass} ${activeCanvasId === id ? 'active' : ''}`}
                onClick={() => setActiveCanvas(id)}
                title={meta.name}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const menuWidth = 180;
                  const menuHeight = 92;
                  const x = Math.min(e.clientX, window.innerWidth - menuWidth - 8);
                  const y = Math.min(e.clientY, window.innerHeight - menuHeight - 8);
                  setCanvasMenu({ open: true, x, y, canvasId: id });
                }}
              >
                <span className="canvas-dot" aria-hidden="true" />
                {meta.name}
              </button>
            );
          })}

          <button
            type="button"
            className="canvas-button add-canvas"
            title="Add canvas"
            onClick={() => setIsAddCanvasOpen(true)}
          >
            +
          </button>
        </div>

        {canvasMenu.open && (
          <div
            className="canvas-context-menu"
            style={{ left: canvasMenu.x, top: canvasMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="canvas-context-item"
              onClick={() => {
                if (!canvasMenu.canvasId) return;
                openRenameModal(canvasMenu.canvasId);
                closeCanvasMenu();
              }}
            >
              Rename
            </button>
            <button
              type="button"
              className="canvas-context-item danger"
              onClick={() => {
                const id = canvasMenu.canvasId;
                closeCanvasMenu();
                if (!id) return;
                setDeleteConfirm({ open: true, canvasId: id });
              }}
            >
              Delete
            </button>
          </div>
        )}

        {detailViewNoteId && <NoteDetailView />}
      </div>
    </div>
  );
};

export default CanvasPage;
