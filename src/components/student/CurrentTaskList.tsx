import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    const overlayRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Focus management: store previous focus and focus close button on mount
    useEffect(() => {
        previousFocusRef.current = document.activeElement as HTMLElement;
        // Focus is set to textarea via autoFocus, but we keep close button ref for focus trap
        return () => {
            // Restore focus when overlay closes
            previousFocusRef.current?.focus();
        };
    }, []);

    // Handle Escape key to close overlay
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Sync comment changes to the parent component
    useEffect(() => {
        onUpdateComment(task.id, comment);
    }, [comment, task.id, onUpdateComment]);

    const activeAction = STATUS_ACTIONS.find(a => a.id === task.status);
    const borderColor = activeAction ? activeAction.borderColor : 'border-gray-200 dark:border-gray-700';

    return (
        <div
            className="fixed inset-0 z-overlay flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all duration-300"
            onClick={onClose}
        >
            <div
                ref={overlayRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="question-overlay-title"
                className={`bg-brand-lightSurface dark:bg-brand-darkSurface w-full max-w-md rounded-xl shadow-2xl border-[3px] ${borderColor} transform transition-all duration-300`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 id="question-overlay-title" className="font-bold text-lg text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                {task.title}
                            </h2>
                            <StatusBadge status={task.status} />
                        </div>
                        <p className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary">
                            {task.description}
                        </p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label="Close"
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
    formatDateRange: (assigned?: string, due?: string) => string;
}

/**
 * Get the display label for a status
 */
const getStatusLabel = (status: TaskStatus): string => {
    switch (status) {
        case 'todo': return 'To Do';
        case 'in_progress': return 'In Progress';
        case 'stuck': return 'Stuck';
        case 'question': return 'Question';
        case 'done': return 'Complete';
        default: return 'To Do';
    }
};

/**
 * TaskCard Component
 *
 * Displays a single task with its details and status controls.
 * New layout: Left column (title, dates, status buttons), Right column (description).
 * Floating status button in top right that expands to show reset option.
 */
const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdateStatus, onOpenOverlay, assignedDate, formatDateRange }) => {
    const [isStatusExpanded, setIsStatusExpanded] = useState(false);
    const statusButtonRef = React.useRef<HTMLDivElement>(null);

    // Handle click outside to collapse the status button
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusButtonRef.current && !statusButtonRef.current.contains(event.target as Node)) {
                setIsStatusExpanded(false);
            }
        };

        if (isStatusExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isStatusExpanded]);

    const activeAction = STATUS_ACTIONS.find(a => a.id === task.status);
    const cardBorderClass = activeAction && task.status !== 'todo' ? activeAction.borderColor : 'border-gray-200 dark:border-gray-700';

    const isDone = task.status === 'done';

    const handleActionClick = (actionId: TaskStatus) => {
        onUpdateStatus(task.id, actionId);

        if (actionId === 'question' || actionId === 'stuck') {
            onOpenOverlay({ ...task, status: actionId });
        }
    };

    const handleReset = () => {
        onUpdateStatus(task.id, 'todo');
        setIsStatusExpanded(false);
    };

    const handleStatusButtonClick = () => {
        if (task.status !== 'todo') {
            setIsStatusExpanded(!isStatusExpanded);
        }
    };

    // Filter out the reset action from the main buttons (it's now in the floating button)
    const mainStatusActions = STATUS_ACTIONS.filter(a => a.id !== 'todo');

    return (
        <div className={`relative bg-brand-lightSurface dark:bg-brand-darkSurface p-5 rounded-2xl hover:shadow-lg dark:hover:shadow-black/30 transition-all duration-300 border-[3px] ${cardBorderClass} w-full max-w-full min-h-[160px]`}>
            {/* Main Content - Two Column Layout */}
            <div className="flex gap-6">
                {/* Left Column - Title, Dates, Status Buttons */}
                <div className={`flex flex-col gap-3 w-48 shrink-0 transition-opacity duration-300 ${isDone ? 'opacity-60' : ''}`}>
                    {/* Title */}
                    <h3 className={`text-lg font-bold pr-2 ${isDone ? 'text-gray-500 dark:text-gray-500 line-through decoration-2 decoration-gray-300 dark:decoration-gray-600' : 'text-brand-textDarkPrimary dark:text-brand-textPrimary'}`}>
                        {task.title}
                    </h3>

                    {/* Date Information */}
                    {(assignedDate || task.dueDate) && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {formatDateRange(assignedDate, task.dueDate)}
                        </div>
                    )}

                    {/* Status Action Buttons */}
                    <div className="flex items-center gap-1 bg-brand-light dark:bg-brand-dark p-1.5 rounded-xl border border-gray-100 dark:border-gray-800 mt-auto">
                        {mainStatusActions.map((action) => {
                            const Icon = action.icon;
                            const isActive = task.status === action.id;

                            return (
                                <button
                                    key={action.id}
                                    onClick={() => handleActionClick(action.id)}
                                    title={action.label}
                                    aria-label={action.label}
                                    className={`
                                        p-2.5 rounded-lg transition-all duration-200 relative group
                                        min-w-[40px] min-h-[40px] flex items-center justify-center
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

                {/* Right Column - Description with floating status button */}
                <div className={`flex-1 transition-opacity duration-300 ${isDone ? 'opacity-60' : ''}`}>
                    {/* Floating Status Button - floats right so text wraps around it */}
                    <div
                        ref={statusButtonRef}
                        className="float-right ml-3 mb-2 z-10"
                    >
                        <div className={`flex items-center overflow-hidden rounded-full border-2 transition-all duration-300 ease-out ${activeAction ? activeAction.borderColor : 'border-gray-200 dark:border-gray-700'
                            } ${isStatusExpanded ? 'shadow-lg scale-105' : 'shadow-md hover:shadow-lg hover:scale-[1.02]'}`}>
                            {/* Reset Button - Slides in from left */}
                            <button
                                onClick={handleReset}
                                className={`flex items-center gap-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-all duration-300 ease-out overflow-hidden ${isStatusExpanded ? 'w-[72px] px-3 py-2 opacity-100' : 'w-0 px-0 py-2 opacity-0'
                                    }`}
                            >
                                <RotateCcw className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isStatusExpanded ? 'rotate-0' : '-rotate-180'}`} />
                                <span className="whitespace-nowrap">Reset</span>
                            </button>

                            {/* Current Status Button */}
                            <button
                                onClick={handleStatusButtonClick}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all duration-200 ${activeAction ? `${activeAction.activeColor} bg-white dark:bg-brand-darkSurface` : 'text-gray-500 bg-white dark:bg-brand-darkSurface'
                                    } ${task.status !== 'todo' ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
                            >
                                {activeAction && <activeAction.icon className={`w-4 h-4 transition-transform duration-200 ${isStatusExpanded ? 'rotate-0' : ''}`} />}
                                <span className="whitespace-nowrap">{getStatusLabel(task.status)}</span>
                            </button>
                        </div>
                    </div>

                    <p className={`text-sm leading-relaxed ${isDone ? 'text-gray-400 dark:text-gray-600' : 'text-brand-textDarkSecondary dark:text-brand-textSecondary'}`}>
                        {task.description}
                    </p>

                    {/* Show comment preview if exists */}
                    {task.comment && (
                        <div className="mt-3 text-xs text-brand-textDarkSecondary dark:text-brand-textSecondary italic bg-brand-light dark:bg-brand-dark p-3 rounded-lg border border-gray-100 dark:border-gray-800 flex items-start gap-2 clear-right">
                            <span className="text-brand-accent font-bold">Note:</span>
                            "{task.comment}"
                        </div>
                    )}
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

    // Helper function to format a single date
    const formatSingleDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Helper to check if a date is today
    const isToday = (dateString: string): boolean => {
        const today = new Date().toISOString().split('T')[0];
        const checkDate = dateString.includes('-') ? dateString : new Date(dateString).toISOString().split('T')[0];
        return checkDate === today;
    };

    // Helper to check if two dates are the same
    const isSameDay = (date1: string, date2: string): boolean => {
        const d1 = date1.includes('-') ? date1 : new Date(date1).toISOString().split('T')[0];
        const d2 = date2.includes('-') ? date2 : new Date(date2).toISOString().split('T')[0];
        return d1 === d2;
    };

    // Format date range for display
    const formatDateRange = (assigned?: string, due?: string): string => {
        // No dates at all
        if (!assigned && !due) return '';

        // Only due date
        if (!assigned && due) {
            return isToday(due) ? 'Due Today' : formatSingleDate(due);
        }

        // Only assigned date
        if (assigned && !due) {
            return isToday(assigned) ? 'Today' : formatSingleDate(assigned);
        }

        // Both dates exist
        if (assigned && due) {
            const assignedIsToday = isToday(assigned);
            const dueIsToday = isToday(due);
            const sameDay = isSameDay(assigned, due);

            // Same day task
            if (sameDay) {
                return assignedIsToday ? 'Due Today' : formatSingleDate(due);
            }

            // Multi-day task
            const assignedDate = new Date(assigned);
            const dueDate = new Date(due);
            const sameMonth = assignedDate.getMonth() === dueDate.getMonth() &&
                assignedDate.getFullYear() === dueDate.getFullYear();

            const assignedStr = assignedIsToday ? 'Today' : formatSingleDate(assigned);
            const dueStr = dueIsToday ? 'Today' : (sameMonth ? dueDate.getDate().toString() : formatSingleDate(due));

            return `${assignedStr} - ${dueStr}`;
        }

        return '';
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
                    formatDateRange={formatDateRange}
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
