import React from 'react';
import { useNotesStore } from '../../store/notesStore';
import './NotificationCenter.css';

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
        <div style={{flex:1}} />
        {notifications.length > 0 && (
          <div className="notification-actions-global">
            <button type="button" onClick={() => setNotifications([])}>Dismiss all</button>
          </div>
        )}
      </div>

      {notifications.map((n) => (
        <div key={n.id} className="notification-item">
          <div className="notification-message">Reminder: {n.message ?? 'Task reminder'}</div>
          <div className="notification-actions">
            <button
              type="button"
              onClick={() => {
                // Dismiss only from UI
                setNotifications((s) => s.filter(x => x.id !== n.id));
              }}
            >Dismiss</button>

            <button
              type="button"
              onClick={() => {
                // Open the note detail view for the note containing the task
                try {
                  setDetailViewNoteId(n.noteId);
                } catch (err) {}
              }}
            >Open</button>

            <button
              type="button"
              onClick={() => {
                // Snooze by configured minutes by updating the reminder `when` and clearing fired flag
                try {
                  const canvasNotes = canvases[activeCanvasId] ?? [];
                  const note = canvasNotes.find((nn: any) => nn.id === n.noteId);
                  const task = note?.tasks?.find((t: any) => t.id === n.taskId);
                  if (task) {
                    const snooze = ((): number => {
                      try { return Number(localStorage.getItem('stky-default-snooze')) || 5; } catch { return 5; }
                    })();
                    const updated = (task.reminders || []).map((r: any) => r.id === n.id ? { ...r, when: Date.now() + snooze * 60 * 1000, fired: false } : r);
                    updateTask(n.noteId, n.taskId, { reminders: updated });
                  }
                } catch (err) {}
                setNotifications((s) => s.filter(x => x.id !== n.id));
              }}
            >Snooze 5m</button>

            <button
              type="button"
              onClick={() => {
                // Mark task completed and remove the reminder
                try {
                  updateTask(n.noteId, n.taskId, { status: 'completed' });
                  removeReminder(n.noteId, n.taskId, n.id);
                } catch (err) {}
                setNotifications((s) => s.filter(x => x.id !== n.id));
              }}
            >Complete</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;
