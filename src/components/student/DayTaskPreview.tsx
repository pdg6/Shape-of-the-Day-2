import React from 'react';
import { Download, Check } from 'lucide-react';
import { Task } from '../../types';

/**
 * Props for the DayTaskPreview component.
 * @property date - The date string (e.g., "2023-10-27") for the previewed tasks.
 * @property tasks - Array of Task objects scheduled for that day.
 * @property onImport - Callback function to import these tasks into the "My Day" view.
 * @property onImportTask - Callback to import individual task.
 * @property importedTaskIds - Set of task IDs already in the current list.
 * @property hideImportButtons - If true, hide all import buttons (e.g., for today's view).
 */
interface DayTaskPreviewProps {
    date: string;
    tasks: Task[];
    onImport: () => void;
    onImportTask?: (task: Task) => void;
    importedTaskIds?: Set<string>;
    hideImportButtons?: boolean;
}

/**
 * DayTaskPreview Component
 * 
 * Displays a summary of tasks scheduled for a future date.
 * Allows the student to "import" these tasks into their current daily view.
 */
const DayTaskPreview: React.FC<DayTaskPreviewProps> = ({
    date,
    tasks,
    onImport,
    onImportTask,
    importedTaskIds = new Set(),
    hideImportButtons = false
}) => {
    // Check if all tasks are already imported
    const allTasksImported = tasks.length > 0 && tasks.every(t => importedTaskIds.has(t.id));
    const someTasksImported = tasks.some(t => importedTaskIds.has(t.id));
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
            <div className="bg-brand-lightSurface dark:bg-[#1a1d24] p-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center mb-6 shadow-layered-sm">
                <p className="text-gray-400 dark:text-gray-500 font-medium">No tasks scheduled for this day.</p>
            </div>
        );
    }

    return (
        <div className="mb-6 w-full max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                    Tasks for {new Date(date).toLocaleDateString()}
                </h3>
                {!hideImportButtons && (
                    allTasksImported ? (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-accent/10 text-brand-accent border border-brand-accent/30 font-bold text-sm tracking-tight">
                            <Check className="w-4 h-4" />
                            <span className="hidden sm:inline">ALL ADDED</span>
                            <span className="sm:hidden">ADDED</span>
                        </div>
                    ) : (
                        <button
                            onClick={onImport}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all bg-gray-100 dark:bg-[#151921] text-gray-600 dark:text-gray-400 border border-slate-200 dark:border-white/10 hover:border-brand-accent/30 hover:shadow-layered-sm focus:outline-none focus:ring-2 focus:ring-brand-accent active:bg-brand-accent/10 font-bold text-sm tracking-tight"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">
                                {someTasksImported ? 'IMPORT REMAINING' : 'IMPORT ALL'}
                            </span>
                            <span className="sm:hidden">
                                {someTasksImported ? 'REST' : 'ALL'}
                            </span>
                        </button>
                    )
                )}
            </div>

            {/* Task Cards */}
            <div className="space-y-3">
                {tasks.map((task) => {
                    // Determine border color based on task status
                    const getStatusBorderColor = (status: string) => {
                        switch (status) {
                            case 'stuck':
                            case 'question':
                            case 'help':
                                return 'border-amber-300 dark:border-amber-800';
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
                            className={`relative bg-brand-lightSurface dark:bg-brand-darkSurface p-4 rounded-lg border-2 ${borderClass} shadow-layered-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-layered hover:brightness-95 dark:hover:brightness-110`}
                        >
                            {/* Import Button - Top Right */}
                            {onImportTask && !hideImportButtons && (
                                importedTaskIds.has(task.id) ? (
                                    <div
                                        className="absolute top-3 right-3 p-2 rounded-lg bg-brand-accent/10 text-brand-accent border-2 border-brand-accent/30"
                                        title="Already added"
                                        aria-label={`${task.title} already added`}
                                    >
                                        <Check className="w-5 h-5" />
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => onImportTask(task)}
                                        className="absolute top-3 right-3 p-2 rounded-lg transition-all bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-2 border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent active:bg-brand-accent/10 active:text-brand-accent"
                                        title="Import this task"
                                        aria-label={`Import ${task.title}`}
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                )
                            )}

                            {/* Task Content */}
                            <div className="pr-12">
                                {/* Title */}
                                <h4 className="font-bold text-base text-gray-600 dark:text-gray-400 mb-2">
                                    {task.title}
                                </h4>

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
