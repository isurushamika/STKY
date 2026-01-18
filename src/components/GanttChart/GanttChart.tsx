import React from 'react';
import { Task } from '../../types';
import { formatDateShort } from '../../utils/helpers';
import './GanttChart.css';

interface GanttChartProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks, onTaskClick }) => {
  if (tasks.length === 0) {
    return (
      <div className="gantt-empty">
        <div className="empty-icon">📊</div>
        <p>No tasks added yet</p>
        <span>Add tasks to see them in the timeline</span>
      </div>
    );
  }

  // Calculate date range
  const allDates = tasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
  const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
  
  // Add padding
  minDate.setDate(minDate.getDate() - 2);
  maxDate.setDate(maxDate.getDate() + 2);
  
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

  const getTaskPosition = (task: Task) => {
    const start = new Date(task.startDate);
    const end = new Date(task.endDate);
    const startOffset = Math.ceil((start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      left: `${(startOffset / totalDays) * 100}%`,
      width: `${(duration / totalDays) * 100}%`,
    };
  };

  const hashStringToHue = (value: string) => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash * 31 + value.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) % 360;
  };

  const getTaskColor = (task: Task) => {
    if (task.color) return task.color;
    const hue = hashStringToHue(task.id);
    return `hsl(${hue} 90% 55%)`;
  };

  // Generate timeline markers
  const generateTimelineMarkers = () => {
    const markers = [];
    const markerCount = Math.min(10, totalDays);
    
    for (let i = 0; i <= markerCount; i++) {
      const date = new Date(minDate);
      date.setDate(date.getDate() + (i * totalDays / markerCount));
      markers.push(
        <div
          key={i}
          className="timeline-marker"
          style={{ left: `${(i / markerCount) * 100}%` }}
        >
          <div className="marker-line"></div>
          <div className="marker-label">
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      );
    }
    return markers;
  };

  return (
    <div className="gantt-chart">
      <div className="gantt-header">
        <div className="timeline-axis">
          {generateTimelineMarkers()}
        </div>
      </div>
      
      <div className="gantt-tasks">
        {tasks.map(task => {
          const position = getTaskPosition(task);
          return (
            <div
              key={task.id}
              className={`gantt-task-row ${onTaskClick ? 'clickable' : ''}`}
              onClick={() => onTaskClick?.(task)}
            >
              <div className="task-info">
                <div className="task-name">{task.name}</div>
                <div className="task-dates">
                  {formatDateShort(task.startDate)} - {formatDateShort(task.endDate)}
                </div>
              </div>
              <div className="task-timeline">
                <div
                  className={`task-bar status-${task.status}`}
                  style={{
                    ...position,
                    backgroundColor: getTaskColor(task),
                  }}
                >
                  <div className="task-progress" style={{ width: `${task.progress}%` }}></div>
                  <span className="task-bar-label">
                    {task.name} ({task.progress}%)
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GanttChart;
