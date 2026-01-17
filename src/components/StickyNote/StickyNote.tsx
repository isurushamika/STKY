import React, { useState, useRef, useEffect } from 'react';
import { useNotesStore } from '../../store/notesStore';
import { StickyNote as StickyNoteType } from '../../types';
import { useClickOutside } from '../../hooks/useInteractions';
import './StickyNote.css';

interface StickyNoteProps {
  note: StickyNoteType;
}

const StickyNote: React.FC<StickyNoteProps> = ({ note }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const currentDragOffset = useRef({ x: 0, y: 0 });
  
  const noteRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    selectedNoteIds,
    updateNote,
    moveNote,
    selectNote,
    bringToFront,
  } = useNotesStore();

  const isSelected = selectedNoteIds.includes(note.id);

  useClickOutside(noteRef, () => {
    if (isSelected && !isEditing) {
      selectNote(null);
    }
  });

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
    
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
    };
    setIsDragging(true);
    setDragOffset({ x: 0, y: 0 });
    currentDragOffset.current = { x: 0, y: 0 };
    selectNote(note.id);
    bringToFront(note.id);
    e.stopPropagation();
  };

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        const offsetX = e.clientX - dragStartPos.current.x;
        const offsetY = e.clientY - dragStartPos.current.y;
        currentDragOffset.current = { x: offsetX, y: offsetY };
        setDragOffset({ x: offsetX, y: offsetY });
      };

      const handleMouseUp = () => {
        const finalOffset = currentDragOffset.current;
        // Reset drag state first
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        currentDragOffset.current = { x: 0, y: 0 };
        
        // Then update the actual position
        if (finalOffset.x !== 0 || finalOffset.y !== 0) {
          moveNote(note.id, { 
            x: note.x + finalOffset.x, 
            y: note.y + finalOffset.y 
          });
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, note.id, note.x, note.y, moveNote]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNote(note.id, { text: e.target.value });
  };

  return (
    <div
      ref={noteRef}
      className={`sticky-note ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${note.x}px`,
        top: `${note.y}px`,
        width: `${note.width}px`,
        minHeight: `${note.height}px`,
        backgroundColor: note.color,
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${note.rotation}deg)`,
        zIndex: note.zIndex,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={note.text}
          onChange={handleChange}
          onBlur={handleBlur}
          className="note-textarea"
          rows={6}
        />
      ) : (
        <div className="note-text">{note.text}</div>
      )}
      
      {isSelected && (
        <div className="note-selection-indicator" />
      )}
    </div>
  );
};

export default StickyNote;
