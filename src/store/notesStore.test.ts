import { useNotesStore } from './notesStore';

describe('notesStore time entries', () => {
  beforeEach(() => {
    // reset store by reloading module state isn't straightforward in jest without clearing modules
  });

  test('start and stop time entry accumulates timeSpentMs', () => {
    const addCanvasSpy = useNotesStore.getState().addCanvas;
    // create a note and task to operate on
    const canvasId = useNotesStore.getState().activeCanvasId;
    const noteId = useNotesStore.getState().notes[0]?.id || null;
    if (!noteId) {
      // add a note programmatically
      useNotesStore.getState().addNote({ x: 0, y: 0 });
    }
    const nid = useNotesStore.getState().notes[0].id;
    useNotesStore.getState().addTask(nid, { name: 't', startDate: new Date().toISOString(), endDate: new Date().toISOString(), progress:0, status:'not-started' });
    const task = useNotesStore.getState().notes[0].tasks![0];

    const now = Date.now();
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    useNotesStore.getState().startTimeEntry(nid, task.id, 'manual', 'test');
    jest.spyOn(Date, 'now').mockImplementation(() => now + 1000 * 60 * 10); // +10 minutes
    useNotesStore.getState().stopTimeEntry(nid, task.id);

    const updatedTask = useNotesStore.getState().notes[0].tasks!.find(t => t.id === task.id)!;
    expect(updatedTask.timeSpentMs).toBeGreaterThanOrEqual(10 * 60 * 1000 - 1000);
  });
});
