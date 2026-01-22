import React from 'react';
import { useNotesStore } from '../../store/notesStore';
import './NotificationCenter.css';
import Modal from '../Modal/Modal';

const POLL_INTERVAL_MS = 15000;

const NotificationCenter: React.FC = () => {
  const { canvases, activeCanvasId, updateTask, removeReminder, setDetailViewNoteId } = useNotesStore();
  const [notifications, setNotifications] = React.useState<Array<{ id: string; noteId: string; taskId: string; message?: string }>>([]);
  const [permission, setPermission] = React.useState<NotificationPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'default';
    return Notification.permission;
  });

  const requestPermission = React.useCallback(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    Notification.requestPermission().then(p => setPermission(p));
  }, []);

  const [pushSupported] = React.useState<boolean>(() => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window);
  const [subscription, setSubscription] = React.useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('stky-push-sub') || 'null'); } catch { return null; }
  });

  // Accessibility / keyboard navigation
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [confirmModal, setConfirmModal] = React.useState<null | { type: 'complete' | 'remove'; noteId: string; taskId: string; reminderId: string }>(null);
  const [snoozeModal, setSnoozeModal] = React.useState<null | { noteId: string; taskId: string; reminderId: string }>(null);

  React.useEffect(() => {
    if (focusedIndex === null) return;
    const el = listRef.current?.querySelectorAll('.notification-item')[focusedIndex] as HTMLElement | undefined;
    if (el) el.focus();
  }, [focusedIndex, notifications.length]);

  const subscribeToPush = React.useCallback(async () => {
    if (!pushSupported || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      // Try to get optional public VAPID key from localStorage; otherwise attempt subscribe without it.
      const vapidKey = localStorage.getItem('stky-vapid-public-key') || undefined;
      const options: any = { userVisibleOnly: true };
      if (vapidKey) options.applicationServerKey = vapidKey;

      const sub = await reg.pushManager.subscribe(options);
      const json = sub.toJSON ? sub.toJSON() : sub;
      localStorage.setItem('stky-push-sub', JSON.stringify(json));
      setSubscription(json);

      // Try to POST subscription to a server endpoint if present
      try {
        await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json) });
      } catch (e) {
        // ignore network errors; subscription saved locally
      }
    } catch (err) {
      // subscribe can fail if vapid key required or permission denied
      try { setSubscription(JSON.parse(localStorage.getItem('stky-push-sub') || 'null')); } catch {};
    }
  }, [pushSupported]);

  

  React.useEffect(() => {
    const checkReminders = () => {
      try {
        const all = canvases[activeCanvasId] ?? [];
        const now = Date.now();
        const found: Array<{ id: string; noteId: string; taskId: string; message?: string }> = [];

        all.forEach((note) => {
          (note.tasks || []).forEach((task: any) => {
            (task.reminders || []).forEach((r: any) => {
              if (!r.fired && typeof r.when === 'number' && r.when <= now) {
                found.push({ id: r.id, noteId: note.id, taskId: task.id, message: r.message });
                // handle recurrence: if recurring, compute next when and keep reminder; otherwise mark fired
                const updated = (task.reminders || []).map((rr: any) => {
                  if (rr.id !== r.id) return rr;
                  const rec = rr.recurrence ?? 'none';
                  if (rec === 'none') return { ...rr, fired: true };
                  const currWhen = typeof rr.when === 'number' ? rr.when : Date.now();
                  let nextWhen = currWhen;
                  if (rec === 'daily') nextWhen = currWhen + 24 * 60 * 60 * 1000;
                  else if (rec === 'weekly') nextWhen = currWhen + 7 * 24 * 60 * 60 * 1000;
                  else if (rec === 'monthly') {
                    const d = new Date(currWhen);
                    d.setMonth(d.getMonth() + 1);
                    nextWhen = d.getTime();
                  }
                  return { ...rr, when: nextWhen, fired: false };
                });
                updateTask(note.id, task.id, { reminders: updated });

                // show native notification when permitted (prefer service worker)
                if (permission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
                  try {
                    const body = `${task.name}: ${r.message ?? 'Reminder'}`;
                    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
                      navigator.serviceWorker.ready.then(reg => {
                        try { reg.showNotification('stky reminder', { body, tag: r.id }); }
                        catch (e) { try { new Notification('stky reminder', { body, tag: r.id }); } catch (_) {} }
                      }).catch(() => { try { new Notification('stky reminder', { body, tag: r.id }); } catch (_) {} });
                    } else {
                      try { const notif = new Notification('stky reminder', { body, tag: r.id }); notif.onclick = () => { try { window.focus(); } catch (_) {} }; }
                      catch (_) {}
                    }
                  } catch (err) {
                    // ignore
                  }
                }
              }
            });
          });
        });

        if (found.length > 0) setNotifications((s) => [...found, ...s]);
      } catch (err) {
        // ignore
      }
    };

    checkReminders();
    const id = window.setInterval(checkReminders, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [canvases, activeCanvasId, updateTask, permission]);

  if (notifications.length === 0 && permission === 'granted') return null;

  return (
    <div className="notification-center" aria-live="polite">
      <div className="notification-header">
        {permission !== 'granted' && (
          <div className="notification-permission">
            <div className="permission-text">Enable native notifications for reminders</div>
            <div className="permission-actions">
              <button type="button" onClick={requestPermission}>Enable</button>
            </div>
          </div>
        )}
        <div style={{ flex: 1 }} />
        {pushSupported && !subscription && (
          <div style={{ marginRight: 8 }}>
            <button type="button" onClick={() => subscribeToPush()}>Enable Push</button>
          </div>
        )}
        {pushSupported && subscription && (
          <div style={{ marginRight: 8 }}>
            <span className="push-enabled">Push enabled</span>
            <button type="button" onClick={() => { localStorage.removeItem('stky-push-sub'); setSubscription(null); }}>Remove</button>
          </div>
        )}
        {notifications.length > 0 && (
          <div className="notification-actions-global">
            <button type="button" onClick={() => setNotifications([])}>Dismiss all</button>
          </div>
        )}
      </div>

      <div ref={listRef} role="list" aria-label="Reminders">
        {notifications.map((n, idx) => (
          <div
            key={n.id}
            className="notification-item"
            role="listitem"
            tabIndex={focusedIndex === null ? 0 : focusedIndex === idx ? 0 : -1}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex((s) => (s === null ? 0 : Math.min((notifications.length - 1), (s + 1)))); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex((s) => (s === null ? 0 : Math.max(0, (s - 1)))); }
              else if (e.key === 'Escape') { e.preventDefault(); setNotifications((s) => s.filter(x => x.id !== n.id)); }
              else if (e.key === 'Enter') { e.preventDefault(); try { setDetailViewNoteId(n.noteId); } catch {} }
            }}
          >
            <div className="notification-message">Reminder: {n.message ?? 'Task reminder'}</div>
            <div className="notification-actions">
              <button
                type="button"
                onClick={() => { setNotifications((s) => s.filter(x => x.id !== n.id)); }}
              >Dismiss</button>

              <button
                type="button"
                onClick={() => { try { setDetailViewNoteId(n.noteId); } catch (err) {} }}
              >Open</button>

              <button
                type="button"
                onClick={() => setSnoozeModal({ noteId: n.noteId, taskId: n.taskId, reminderId: n.id })}
              >Snooze</button>

              <button
                type="button"
                onClick={() => setConfirmModal({ type: 'complete', noteId: n.noteId, taskId: n.taskId, reminderId: n.id })}
              >Complete</button>
            </div>
          </div>
        ))}
      </div>

      {snoozeModal && (
        <Modal
          title="Snooze reminder"
          onClose={() => setSnoozeModal(null)}
        >
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[5, 10, 15, 30, 60].map(m => (
              <button key={m} type="button" onClick={() => {
                try {
                  const canvasNotes = canvases[activeCanvasId] ?? [];
                  const note = canvasNotes.find((nn:any) => nn.id === snoozeModal.noteId);
                  const task = note?.tasks?.find((t:any) => t.id === snoozeModal.taskId);
                  if (task) {
                    const updated = (task.reminders || []).map((r:any) => r.id === snoozeModal.reminderId ? { ...r, when: Date.now() + m * 60 * 1000, fired: false } : r);
                    updateTask(snoozeModal.noteId, snoozeModal.taskId, { reminders: updated });
                  }
                } catch (err) {}
                setNotifications(s => s.filter(x => x.id !== snoozeModal.reminderId));
                setSnoozeModal(null);
              }}>{m}m</button>
            ))}
          </div>
        </Modal>
      )}

      {confirmModal && (
        <Modal
          title={confirmModal.type === 'complete' ? 'Complete task?' : 'Remove reminder?'}
          onClose={() => setConfirmModal(null)}
          onConfirm={() => {
            try {
              if (confirmModal.type === 'complete') {
                updateTask(confirmModal.noteId, confirmModal.taskId, { status: 'completed' });
                removeReminder(confirmModal.noteId, confirmModal.taskId, confirmModal.reminderId);
              } else {
                removeReminder(confirmModal.noteId, confirmModal.taskId, confirmModal.reminderId);
              }
            } catch (err) {}
            setNotifications(s => s.filter(x => x.id !== confirmModal.reminderId));
            setConfirmModal(null);
          }}
          confirmLabel={confirmModal.type === 'complete' ? 'Complete' : 'Remove'}
        >
          <div>{confirmModal.type === 'complete' ? 'Mark the task complete and remove this reminder?' : 'Permanently remove this reminder?'}</div>
        </Modal>
      )}
    </div>
  );
};

export default NotificationCenter;
