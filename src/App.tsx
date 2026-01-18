import React, { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import CanvasPage from './pages/CanvasPage';
import DashboardPage from './pages/DashboardPage';
import WorkspacePage from './pages/WorkspacePage';
import './App.css';

type ThemeMode = 'dark' | 'light';

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [theme, setTheme] = React.useState<ThemeMode>(() => {
    const saved = localStorage.getItem('stky-theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  const isDashboard = location.pathname.startsWith('/dashboard');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('stky-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSettingsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen]);
  const handleToggleView = () => {
    navigate(isDashboard ? '/' : '/dashboard');
  };

  return (
    <>
      <div className="top-controls">
        <button
          type="button"
          className="view-switch-button"
          aria-label={isDashboard ? 'Switch to canvas view' : 'Open dashboard'}
          title={isDashboard ? 'Canvas' : 'Dashboard'}
          onClick={handleToggleView}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {isDashboard ? (
              <>
                <path d="M4 6h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 12h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            ) : (
              <>
                <path d="M4 4h7v7H4V4z" stroke="currentColor" strokeWidth="2" />
                <path d="M13 4h7v4h-7V4z" stroke="currentColor" strokeWidth="2" />
                <path d="M13 10h7v10h-7V10z" stroke="currentColor" strokeWidth="2" />
                <path d="M4 13h7v7H4v-7z" stroke="currentColor" strokeWidth="2" />
              </>
            )}
          </svg>
        </button>

        <button
          type="button"
          className="settings-button"
          aria-label="Open settings"
          aria-expanded={isSettingsOpen}
          onClick={() => setIsSettingsOpen((prev) => !prev)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M19.4 15a7.9 7.9 0 0 0 .1-2l2-1.2-2-3.5-2.3.6a7.3 7.3 0 0 0-1.7-1l-.3-2.3H9.8l-.3 2.3a7.3 7.3 0 0 0-1.7 1l-2.3-.6-2 3.5L5.6 13a7.9 7.9 0 0 0 .1 2l-2 1.2 2 3.5 2.3-.6c.5.4 1.1.7 1.7 1l.3 2.3h4.4l.3-2.3c.6-.3 1.2-.6 1.7-1l2.3.6 2-3.5-2-1.2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {isSettingsOpen && (
        <div className="settings-backdrop" onClick={() => setIsSettingsOpen(false)} aria-hidden="true" />
      )}

      <aside className={`settings-panel ${isSettingsOpen ? 'open' : ''}`} aria-label="Settings">
        <div className="settings-header">
          <div className="settings-title">Settings</div>
          <button
            type="button"
            className="settings-close"
            aria-label="Close settings"
            onClick={() => setIsSettingsOpen(false)}
          >
            ×
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-row">
            <div className="settings-label">
              <div className="settings-label-title">Theme</div>
              <div className="settings-label-sub">Toggle light/dark mode</div>
            </div>

            <label className="theme-toggle">
              <input
                type="checkbox"
                checked={theme === 'light'}
                onChange={(e) => setTheme(e.target.checked ? 'light' : 'dark')}
              />
              <span className="theme-toggle-track" aria-hidden="true">
                <span className="theme-toggle-thumb" aria-hidden="true" />
              </span>
            </label>
          </div>
        </div>
      </aside>

      <Routes>
        <Route path="/" element={<CanvasPage theme={theme} />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="*" element={<CanvasPage theme={theme} />} />
      </Routes>
    </>
  );
};

export default App;
