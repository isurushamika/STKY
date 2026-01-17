# Sticky Notes Canvas

A modern, feature-rich React + TypeScript application for creating and managing sticky notes on an infinite canvas.

## 🚀 Features

### Core Functionality
- **Infinite Canvas**: Pan and zoom freely across unlimited workspace
- **Sticky Notes**: Create, edit, move, and delete notes with handwritten-style fonts
- **Drag & Drop**: Intuitive note positioning with smooth drag interactions
- **Rich Typography**: Beautiful handwritten font (Caveat) with large, readable text

### Advanced Features
- **State Management**: Robust Zustand store with persistence
- **Undo/Redo**: Full history tracking (up to 50 states)
- **Keyboard Shortcuts**: Efficient workflow with hotkeys
- **Import/Export**: Save and load your notes as JSON
- **Auto-Save**: Automatic persistence to localStorage
- **Selection System**: Visual feedback for selected notes
- **Z-Index Management**: Automatic layering when clicking notes

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Double-click` | Add new note |
| `Double-click note` | Edit note text |
| `Alt + Drag` | Pan canvas |
| `Ctrl + Scroll` | Zoom in/out |
| `Ctrl + Z` | Undo |
| `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| `Delete` | Delete selected note |
| `Ctrl + D` | Duplicate selected note |
| `Escape` | Deselect note |
| `Ctrl + +` | Zoom in |
| `Ctrl + -` | Zoom out |
| `Ctrl + 0` | Reset view |

## 🏗️ Architecture

### Project Structure
```
src/
├── components/        # React components
│   ├── StickyNote/   # Note component with drag/edit
│   └── Toolbar/      # Top toolbar with controls
├── store/            # Zustand state management
│   └── notesStore.ts # Global notes store
├── hooks/            # Custom React hooks
│   └── useInteractions.ts
├── types/            # TypeScript type definitions
│   └── index.ts
├── utils/            # Helper functions
│   └── helpers.ts
├── App.tsx           # Main application
└── index.tsx         # Entry point
```

### Technology Stack
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Zustand** - Lightweight state management with persistence
- **CSS3** - Custom styling with animations

## 🎨 Color Palette
Notes automatically get random pastel colors:
- Moccasin (#FFE4B5)
- Light Pink (#FFB6C1)
- Powder Blue (#B0E0E6)
- Misty Rose (#FFE4E1)
- Light Green (#E0FFE0)
- Khaki (#F0E68C)
- Plum (#DDA0DD)
- Peach (#FFE4CC)

## 🔧 Development

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm start
```

### Build for Production
```bash
npm build
```

## 📝 Usage Tips

1. **Creating Notes**: Double-click anywhere on the canvas
2. **Editing**: Double-click a note to enter edit mode
3. **Moving**: Click and drag notes to reposition
4. **Organizing**: Notes stack automatically - click to bring to front
5. **Saving Work**: Notes auto-save to browser localStorage
6. **Backing Up**: Use Export button to download JSON backup
7. **Restoring**: Use Import button to restore from backup

## 🎯 Future Enhancement Ideas

- [ ] Real-time collaboration
- [ ] Note categories/tags
- [ ] Search and filter
- [ ] Custom colors per note
- [ ] Rich text formatting
- [ ] Image attachments
- [ ] Note templates
- [ ] Dark mode
- [ ] Mobile touch support
- [ ] Canvas backgrounds
- [ ] Note linking
- [ ] Markdown support

## 📄 License

MIT
