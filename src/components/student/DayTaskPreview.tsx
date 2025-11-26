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
}

/**
 * DayTaskPreview Component
 * 
 * Displays a summary of tasks scheduled for a future date.
 * Allows the student to "import" these tasks into their current daily view.
 */
const DayTaskPreview: React.FC<DayTaskPreviewProps> = ({ date, tasks, onImport }) => {
    // If no tasks exist for this date, show a simple empty state message
    if (tasks.length === 0) {
        return (
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center mb-6">
                <p className="text-gray-500">No tasks scheduled for this day.</p>
            </div>
        );
    }

    return (
        <div className="bg-brand-lightSurface dark:bg-brand-darkSurface p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                    Tasks for {new Date(date).toLocaleDateString()}
                </h3>
                <button
                    onClick={onImport}
                    className="flex items-center gap-2 bg-brand-accent text-white px-4 py-2 rounded-lg hover:bg-brand-accent/90 transition-colors shadow-sm"
                >
                    <Download className="w-4 h-4" />
                    Import to My Day
                </button>
            </div>

            <div className="space-y-2">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        className="bg-brand-light dark:bg-brand-dark p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 text-sm"
                    >
                        <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            {task.title}
                        </span>
                        <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                        <span className="text-brand-textDarkSecondary dark:text-brand-textSecondary">
                            {task.description}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DayTaskPreview;
