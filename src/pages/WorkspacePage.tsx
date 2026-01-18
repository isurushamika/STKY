import React, { useState } from 'react';
import KanbanBoard from '../components/KanbanBoard/KanbanBoard';
import './WorkspacePage.css';

const WorkspacePage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'urgent'>('all');

  return (
    <div className="workspace-page">
      <header className="workspace-header">
        <div>
          <h2>Workspace</h2>
          <p className="workspace-sub">Interactive Kanban board for all tasks</p>
        </div>

        <div className="workspace-controls">
          <input
            type="search"
            placeholder="Search tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="workspace-search"
          />

          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)} className="workspace-select">
            <option value="all">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </header>

      <main className="workspace-main">
        <KanbanBoard searchQuery={query} priorityFilter={priorityFilter} />
      </main>
    </div>
  );
};

export default WorkspacePage;
