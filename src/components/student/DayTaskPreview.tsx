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
    // Helper function to format dates - shows "Today" if it's today, otherwise short date
    const formatDate = (dateString: string): string => {
        const today = new Date().toISOString().split('T')[0];
        const taskDate = dateString.includes('-') ? dateString : new Date(dateString).toISOString().split('T')[0];

        if (taskDate === today) {
            return 'Today';
        }

        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // If no tasks exist for this date, show a simple empty state message
    if (tasks.length === 0) {
        return (
            <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border-[3px] border-gray-200 dark:border-gray-700 text-center mb-6">
                <p className="text-gray-400 dark:text-gray-500">No tasks scheduled for this day.</p>
            </div>
        );
    }

    return (
        <div className="mb-6 w-full max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                    Tasks for {new Date(date).toLocaleDateString()}
                </h3>
                <button
                    onClick={onImport}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-[3px] border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 active:bg-emerald-50 dark:active:bg-emerald-900/20"
                >
                    <Download className="w-4 h-4" />
                    <span className="font-medium hidden sm:inline">Import All</span>
                    <span className="font-medium sm:hidden">All</span>
                </button>
            </div>

            {/* Task Cards */}
            <div className="space-y-3">
                {tasks.map((task) => {
                    // Determine border color based on task status
                    const getStatusBorderColor = (status: string) => {
                        switch (status) {
                            case 'stuck':
                                return 'border-red-300 dark:border-red-800';
                            case 'question':
                                return 'border-yellow-300 dark:border-yellow-800';
                            case 'in_progress':
                                return 'border-emerald-300 dark:border-emerald-800';
                            case 'done':
                                return 'border-blue-300 dark:border-blue-800';
                            default: // 'todo'
                                return 'border-gray-200 dark:border-gray-700';
                        }
                    };

                    const borderClass = getStatusBorderColor(task.status || 'todo');

                    return (
                        <div
                            key={task.id}
                            className={`relative bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border-[3px] ${borderClass} transition-all duration-200 hover:brightness-95 dark:hover:brightness-110`}
                        >
                            {/* Import Button - Top Right */}
                            {onImportTask && (
                                <button
                                    onClick={() => onImportTask(task)}
                                    className="absolute top-3 right-3 p-2 rounded-lg transition-all bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-[3px] border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 active:bg-emerald-50 dark:active:bg-emerald-900/20 active:text-emerald-600 dark:active:text-emerald-400"
                                    title="Import this task"
                                    aria-label={`Import ${task.title}`}
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                            )}

                            {/* Task Content */}
                            <div className="pr-12">
                                {/* Title */}
                                <h4 className="font-bold text-base text-gray-600 dark:text-gray-400 mb-2">
                                    {task.title}
                                </h4>

                                {/* Description */}
                                {task.description && (
                                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-3">
                                        {task.description}
                                    </p>
                                )}

                                {/* Date Information */}
                                <div className="flex flex-wrap gap-3 text-xs">
                                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-500">
                                        <span className="font-medium">Assigned:</span>
                                        <span>{formatDate(date)}</span>
                                    </div>
                                    {task.dueDate && (
                                        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-500">
                                            <span className="font-medium">Due:</span>
                                            <span>{formatDate(task.dueDate)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DayTaskPreview;
