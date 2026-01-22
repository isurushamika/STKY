import React from 'react';
import './Modal.css';

interface Props {
  title?: string;
  children?: React.ReactNode;
  onClose: () => void;
  onConfirm?: () => void;
  confirmLabel?: string;
}

const Modal: React.FC<Props> = ({ title, children, onClose, onConfirm, confirmLabel }) => {
  const backdropRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    // focus first focusable inside modal
    const el = backdropRef.current;
    if (!el) return;
    const focusable = el.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); try { prevActive?.focus(); } catch {} };
  }, [onClose]);

  return (
    <div ref={backdropRef} className="stky-modal-backdrop" role="dialog" aria-modal="true">
      <div className="stky-modal" onClick={(e) => e.stopPropagation()}>
        {title && <div className="stky-modal-title">{title}</div>}
        <div className="stky-modal-body">{children}</div>
        <div className="stky-modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          {onConfirm && <button type="button" className="primary" onClick={onConfirm}>{confirmLabel ?? 'OK'}</button>}
        </div>
      </div>
    </div>
  );
};

export default Modal;
