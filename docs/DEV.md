# Development Notes

Repository conventions and developer guidance for working on the Sticky Notes project.

Branching
- Use feature branches named `feature/<short-description>` (example: `feature/kanban-workspace`).
- Use `fix/<short-description>` for bug fixes.

Store versioning & migrations
- Any change to persisted state must bump the store `version` in `src/store/notesStore.ts` and add a migration that maps older persisted state to the new shape.
- Add unit tests covering migrations where possible.

Tests
- Add small unit tests for store migrations and core actions (task move, reorder, time entry recording).

Data model guidance
- Keep task additions backward compatible: prefer adding optional fields with sensible defaults.
- For time-tracking, prefer immutable `timeEntries` (start/stop timestamps) and update a derived `timeSpentMs` for fast UI reads.

Local development
- Start dev server: `npm start`
- Build production bundle: `npm run build`

Code style
- Follow existing TypeScript and React patterns in the codebase.
