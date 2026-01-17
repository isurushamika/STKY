import React from 'react';
import './Toolbar.css';

interface ToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onResetPan: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  noteCount: number;
  onDeleteAll: () => void;
  onExport: () => void;
  onImport: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onResetPan,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  noteCount,
  onDeleteAll,
  onExport,
  onImport,
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <h1>Sticky Notes Canvas</h1>
        <span className="note-count">{noteCount} note{noteCount !== 1 ? 's' : ''}</span>
      </div>

      <div className="toolbar-section">
        <div className="button-group">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="toolbar-btn"
          >
            ↶ Undo
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="toolbar-btn"
          >
            ↷ Redo
          </button>
        </div>

        <div className="button-group">
          <button onClick={onZoomOut} title="Zoom Out (Ctrl+-)" className="toolbar-btn">
            −
          </button>
          <span className="zoom-indicator">{Math.round(zoom * 100)}%</span>
          <button onClick={onZoomIn} title="Zoom In (Ctrl++)" className="toolbar-btn">
            +
          </button>
          <button onClick={onResetZoom} title="Reset Zoom (Ctrl+0)" className="toolbar-btn">
            100%
          </button>
        </div>

        <div className="button-group">
          <button onClick={onResetPan} title="Reset View" className="toolbar-btn">
            ⟲ Reset View
          </button>
        </div>

        <div className="button-group">
          <button onClick={onImport} title="Import Notes" className="toolbar-btn">
            📥 Import
          </button>
          <button onClick={onExport} title="Export Notes" className="toolbar-btn">
            📤 Export
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete all ${noteCount} notes?`)) {
                onDeleteAll();
              }
            }}
            disabled={noteCount === 0}
            title="Delete All Notes"
            className="toolbar-btn toolbar-btn-danger"
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      <div className="toolbar-section">
        <span className="toolbar-hint">
          💡 Double-click to add | Alt+Drag to pan | Ctrl+Scroll to zoom
        </span>
      </div>
    </div>
  );
};

export default Toolbar;
