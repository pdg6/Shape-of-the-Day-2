import React, { useState, useEffect } from 'react';
import { AlertCircle, HelpCircle, Play, CheckCircle, RotateCcw, X, LucideIcon } from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import { StatusBadge } from '../shared/StatusBadge';

/**
 * Configuration for the different task status actions.
 * Each object defines the look and feel for a specific status button.
 */
interface StatusAction {
    id: TaskStatus;
    label: string;
    icon: LucideIcon;
    activeColor: string;
    hover: string;
    borderColor: string;
}

const STATUS_ACTIONS: StatusAction[] = [
    {
        id: 'todo',
        label: 'Reset',
        icon: RotateCcw,
        activeColor: 'text-gray-500 dark:text-gray-400',
        hover: 'hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
        borderColor: 'border-gray-200 dark:border-gray-700'
    },
    {
        id: 'stuck',
        label: 'Stuck',
        icon: AlertCircle,
        activeColor: 'text-status-stuck',
        hover: 'hover:text-status-stuck hover:bg-status-stuck/10',
        borderColor: 'border-status-stuck'
    },
    {
        id: 'question',
        label: 'Question',
        icon: HelpCircle,
        activeColor: 'text-status-question',
        hover: 'hover:text-status-question hover:bg-status-question/10',
        borderColor: 'border-status-question'
    },
    {
        id: 'in_progress',
        label: 'Start',
        icon: Play,
        activeColor: 'text-status-progress',
        hover: 'hover:text-status-progress hover:bg-status-progress/10',
        borderColor: 'border-status-progress'
    },
    {
        id: 'done',
        label: 'Complete',
        icon: CheckCircle,
        activeColor: 'text-status-complete',
        hover: 'hover:text-status-complete hover:bg-status-complete/10',
        borderColor: 'border-status-complete'
    }
];

/**
 * Props for the QuestionOverlay component.
 */
interface QuestionOverlayProps {
    task: Task;
    onClose: () => void;
    onUpdateComment: (taskId: string, comment: string) => void;
}

/**
 * QuestionOverlay Component
 * 
 * A modal overlay that appears when a student marks a task as "Stuck" or "Question".
 * It allows them to type a specific question or comment for the teacher.
 */
const QuestionOverlay: React.FC<QuestionOverlayProps> = ({ task, onClose, onUpdateComment }) => {
    const [comment, setComment] = useState(task.comment || '');
    const maxChars = 200;

    // Sync comment changes to the parent component
    useEffect(() => {
        onUpdateComment(task.id, comment);
    }, [comment, task.id, onUpdateComment]);

    const activeAction = STATUS_ACTIONS.find(a => a.id === task.status);
    const borderColor = activeAction ? activeAction.borderColor : 'border-gray-200 dark:border-gray-700';

    return (
        <div className="fixed inset-0 z-overlay flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all duration-300">
            <div
                className={`bg-brand-lightSurface dark:bg-brand-darkSurface w-full max-w-md rounded-xl shadow-2xl border-[3px] ${borderColor} transform transition-all scale-100 animate-in fade-in zoom-in duration-300`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                {task.title}
                            </h3>
                            <StatusBadge status={task.status} />
                        </div>
                        <p className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary">
                            {task.description}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <label className="block text-sm font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary mb-2">
                        What do you need help with?
                    </label>
                    <div className="relative">
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value.slice(0, maxChars))}
                            placeholder="I don't understand..."
                            className="w-full h-32 p-3 rounded-lg bg-brand-light dark:bg-brand-dark border-[3px] border-gray-200 dark:border-gray-700 text-brand-textDarkPrimary dark:text-brand-textPrimary focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-offset-brand-darkSurface focus:border-transparent resize-none transition-all outline-none"
                            autoFocus
                        />
                        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                            {comment.length}/{maxChars}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-brand-light dark:bg-brand-dark hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-textDarkPrimary dark:text-brand-textPrimary rounded-lg text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Props for the TaskCard component.
 */
interface TaskCardProps {
    task: Task;
    onUpdateStatus: (taskId: string, status: TaskStatus) => void;
    onOpenOverlay: (task: Task) => void;
    assignedDate?: string;
    formatDate: (dateString: string) => string;
}

/**
 * TaskCard Component
 * 
 * Displays a single task with its details and status controls.
 * Handles the logic for clicking status buttons and opening the question overlay.
 */
const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdateStatus, onOpenOverlay, assignedDate, formatDate }) => {
    // Helper to render the small status badge next to the title
    // const getStatusBadge = (status: TaskStatus) => { ... } - Replaced by StatusBadge component

    const activeAction = STATUS_ACTIONS.find(a => a.id === task.status);
    // Match parent border color to status color, default to gray
    const cardBorderClass = activeAction && task.status !== 'todo' ? activeAction.borderColor : 'border-gray-200 dark:border-gray-700';

    const isDone = task.status === 'done';

    const handleActionClick = (actionId: TaskStatus) => {
        onUpdateStatus(task.id, actionId);

        // Open overlay for Question or Stuck statuses
        if (actionId === 'question' || actionId === 'stuck') {
            // We pass the task with the NEW status conceptually
            onOpenOverlay({ ...task, status: actionId });
        }
    };

    return (
        <div className={`bg-brand-lightSurface dark:bg-brand-darkSurface p-5 rounded-2xl hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-300 border-[3px] ${cardBorderClass} w-full max-w-full hover:scale-[1.005]`}>
            <div className="flex items-start justify-between gap-4">
                <div className={`flex-1 transition-opacity duration-300 ${isDone ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className={`text-lg font-bold ${isDone ? 'text-gray-500 dark:text-gray-500 line-through decoration-2 decoration-gray-300 dark:decoration-gray-600' : 'text-brand-textDarkPrimary dark:text-brand-textPrimary'}`}>
                            {task.title}
                        </h3>
                        <StatusBadge status={task.status} />
                    </div>
                    <p className={`text-sm leading-relaxed mb-2 ${isDone ? 'text-gray-400 dark:text-gray-600' : 'text-brand-textDarkSecondary dark:text-brand-textSecondary'}`}>
                        {task.description}
                    </p>
                    {/* Date Information */}
                    <div className="flex flex-wrap gap-3 text-xs mb-2">
                        {assignedDate && (
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                <span className="font-medium">Assigned:</span>
                                <span>{formatDate(assignedDate)}</span>
                            </div>
                        )}
                        {task.dueDate && (
                            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                <span className="font-medium">Due:</span>
                                <span>{formatDate(task.dueDate)}</span>
                            </div>
                        )}
                    </div>
                    {/* Show comment preview if exists */}
                    {task.comment && (
                        <div className="mt-3 text-xs text-brand-textDarkSecondary dark:text-brand-textSecondary italic bg-brand-light dark:bg-brand-dark p-3 rounded-lg border border-gray-100 dark:border-gray-800 flex items-start gap-2">
                            <span className="text-brand-accent font-bold">Note:</span>
                            "{task.comment}"
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0 bg-brand-light dark:bg-brand-dark p-1.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    {STATUS_ACTIONS.map((action) => {
                        const Icon = action.icon;
                        const isActive = task.status === action.id;

                        // Don't show reset button if already in todo state, but show others
                        if (action.id === 'todo' && task.status === 'todo') return null;

                        return (
                            <button
                                key={action.id}
                                onClick={() => handleActionClick(action.id)}
                                title={action.label}
                                aria-label={action.label}
                                className={`
                  p-3 rounded-lg transition-all duration-200 relative group
                  min-w-[44px] min-h-[44px] flex items-center justify-center
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent dark:focus:ring-offset-brand-darkSurface
                  ${isActive
                                        ? `${action.activeColor} bg-white dark:bg-brand-darkSurface shadow-sm ring-1 ring-black/5 dark:ring-white/10`
                                        : `text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-brand-darkSurface hover:text-gray-600 dark:hover:text-gray-300`}
                `}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                                {/* Tooltip */}
                                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-tooltip">
                                    {action.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/**
 * Props for the CurrentTaskList component.
 */
interface CurrentTaskListProps {
    tasks: Task[];
    onUpdateStatus: (taskId: string, status: TaskStatus) => void;
    onUpdateComment: (taskId: string, comment: string) => void;
    assignedDate?: string; // Optional: The date these tasks were assigned
}

/**
 * CurrentTaskList Component
 * 
 * Renders the list of active tasks for the day.
 * It handles sorting (completed tasks go to the bottom) and manages the overlay state.
 */
const CurrentTaskList: React.FC<CurrentTaskListProps> = ({ tasks, onUpdateStatus, onUpdateComment, assignedDate }) => {
    const [overlayTask, setOverlayTask] = useState<Task | null>(null);

    // Helper function to format dates - shows "Today" if it's today, otherwise short date
    const formatDate = (dateString: string): string => {
        const today = new Date().toISOString().split('T')[0];
        const taskDate = dateString.includes('-') ? dateString : new Date(dateString).toISOString().split('T')[0];

        if (taskDate === today) {
            return 'Today';
        }

        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleOpenOverlay = (task: Task) => {
        setOverlayTask(task);
    };

    const handleCloseOverlay = () => {
        setOverlayTask(null);
    };

    if (tasks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-2xl border-[3px] border-dashed border-gray-300 dark:border-gray-700 w-full text-center">
                <div className="w-16 h-16 bg-brand-light dark:bg-brand-dark rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary mb-1">All Caught Up!</h3>
                <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary max-w-xs mx-auto">
                    You have no tasks for today. Enjoy your free time or check upcoming days.
                </p>
            </div>
        );
    }

    // Sort tasks: Active tasks first, then completed (done) tasks.
    // Preserve original order within groups.
    const sortedTasks = [...tasks].sort((a, b) => {
        const aDone = a.status === 'done';
        const bDone = b.status === 'done';

        if (aDone === bDone) return 0; // Keep original order if both done or both active
        return aDone ? 1 : -1; // Move done to bottom
    });

    return (
        <div className="flex flex-col gap-4 w-full">
            {sortedTasks.map((task) => (
                <TaskCard
                    key={task.id}
                    task={task}
                    onUpdateStatus={onUpdateStatus}
                    onOpenOverlay={handleOpenOverlay}
                    assignedDate={assignedDate}
                    formatDate={formatDate}
                />
            ))}

            {overlayTask && (
                <QuestionOverlay
                    task={overlayTask}
                    onClose={handleCloseOverlay}
                    onUpdateComment={onUpdateComment}
                />
            )}
        </div>
    );
};

export default CurrentTaskList;
