import React from 'react';
import { Download } from 'lucide-react';
import { Task } from '../../types';

/**
 * Props for the DayTaskPreview component.
 * @property date - The date string (e.g., "2023-10-27") for the previewed tasks.
 * @property tasks - Array of Task objects scheduled for that day.
 * @property onImport - Callback function to import these tasks into the "My Day" view.
 */
interface DayTaskPreviewProps {
    date: string;
    tasks: Task[];
    onImport: () => void;
    onImportTask?: (task: Task) => void; // Import individual task
}

/**
 * DayTaskPreview Component
 * 
 * Displays a summary of tasks scheduled for a future date.
 * Allows the student to "import" these tasks into their current daily view.
 */
const DayTaskPreview: React.FC<DayTaskPreviewProps> = ({ date, tasks, onImport, onImportTask }) => {
    // If no tasks exist for this date, show a simple empty state message
    if (tasks.length === 0) {
        return (
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center mb-6">
                <p className="text-gray-500">No tasks scheduled for this day.</p>
            </div>
        );
    }

    return (
        <div className="bg-brand-lightSurface dark:bg-brand-darkSurface p-6 rounded-xl border-[3px] border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                    Tasks for {new Date(date).toLocaleDateString()}
                </h3>
                <button
                    onClick={onImport}
                    className="flex items-center gap-2 bg-brand-accent text-white px-4 py-2 rounded-lg hover:bg-brand-accent/90 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                >
                    <Download className="w-4 h-4" />
                    Import All
                </button>
            </div>

            <div className="space-y-3">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        className="bg-brand-light dark:bg-brand-dark p-4 rounded-lg border-[3px] border-gray-200 dark:border-gray-700 flex items-start justify-between gap-3"
                    >
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-brand-textDarkPrimary dark:text-brand-textPrimary mb-1">
                                {task.title}
                            </h4>
                            <p className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary">
                                {task.description}
                            </p>
                        </div>

                        {onImportTask && (
                            <button
                                onClick={() => onImportTask(task)}
                                className="flex-shrink-0 p-2 text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent"
                                title="Import this task"
                                aria-label={`Import ${task.title}`}
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DayTaskPreview;
