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
            <div className="bg-tile p-6 rounded-2xl border border-dashed border-border-subtle text-center mb-6 shadow-layered-sm">
                <p className="text-brand-textSecondary font-medium">No tasks scheduled for this day.</p>
            </div>
        );
    }

    return (
        <div className="mb-6 w-full max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-bold text-brand-textPrimary">
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
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-tile-alt text-brand-textSecondary border border-border-subtle hover:border-brand-accent/50 hover:bg-tile-hover hover:text-brand-textPrimary transition-float button-lift-dynamic font-bold text-xs uppercase tracking-widest shadow-layered-sm"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">
                                {someTasksImported ? 'Import Remaining' : 'Import All'}
                            </span>
                            <span className="sm:hidden">
                                {someTasksImported ? 'Remaining' : 'All'}
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
                                return 'border-status-stuck/30';
                            case 'in_progress':
                                return 'border-status-progress/30';
                            case 'done':
                                return 'border-status-complete/30';
                            default: // 'todo'
                                return 'border-border-subtle';
                        }
                    };

                    const borderClass = getStatusBorderColor(task.status || 'todo');

                    return (
                        <div
                            key={task.id}
                            className={`relative bg-tile p-4 rounded-xl border border-border-subtle ${borderClass} shadow-layered-sm transition-float lift-dynamic hover:shadow-layered hover:border-brand-accent/50`}
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
                                        className="absolute top-3 right-3 p-2 rounded-lg transition-float bg-tile-alt text-brand-textSecondary border border-border-subtle hover:text-brand-accent hover:border-brand-accent/50 button-lift-dynamic"
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
                                <h4 className="font-bold text-base text-brand-textPrimary mb-2">
                                    {task.title}
                                </h4>

                                {/* Date Information */}
                                <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-wider">
                                    <div className="flex items-center gap-1.5 text-brand-textSecondary">
                                        <span className="text-brand-textMuted lowercase font-bold">Assigned:</span>
                                        <span>{formatDate(date)}</span>
                                    </div>
                                    {task.dueDate && (
                                        <div className="flex items-center gap-1.5 text-brand-textSecondary">
                                            <span className="text-brand-textMuted lowercase font-bold">Due:</span>
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
