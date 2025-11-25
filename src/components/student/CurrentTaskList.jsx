import React, { useState, useEffect } from 'react';
import { AlertCircle, HelpCircle, Play, CheckCircle, RotateCcw, X } from 'lucide-react';

const STATUS_ACTIONS = [
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
        activeColor: 'text-red-600 dark:text-red-500',
        hover: 'hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10',
        borderColor: 'border-red-600 dark:border-red-500'
    },
    {
        id: 'question',
        label: 'Question',
        icon: HelpCircle,
        activeColor: 'text-amber-600 dark:text-amber-500',
        hover: 'hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/10',
        borderColor: 'border-amber-600 dark:border-amber-500'
    },
    {
        id: 'in_progress',
        label: 'Start',
        icon: Play,
        activeColor: 'text-emerald-600 dark:text-emerald-500',
        hover: 'hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10',
        borderColor: 'border-emerald-600 dark:border-emerald-500'
    },
    {
        id: 'done',
        label: 'Complete',
        icon: CheckCircle,
        activeColor: 'text-blue-600 dark:text-blue-500',
        hover: 'hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10',
        borderColor: 'border-blue-600 dark:border-blue-500'
    }
];

const QuestionOverlay = ({ task, onClose, onUpdateComment }) => {
    const [comment, setComment] = useState(task.comment || '');
    const maxChars = 200;

    useEffect(() => {
        // Sync comment on unmount or when it changes (debounced could be better but per requirement "As they type")
        // We'll sync on change for "real-time" feel, but maybe debounce slightly in a real app.
        // For now, let's just call it.
        onUpdateComment(task.id, comment);
    }, [comment, task.id, onUpdateComment]);

    const activeAction = STATUS_ACTIONS.find(a => a.id === task.status);
    const borderColor = activeAction ? activeAction.borderColor : 'border-gray-200 dark:border-gray-700';
    const activeColor = activeAction ? activeAction.activeColor : 'text-gray-500';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-all duration-300">
            <div
                className={`bg-brand-darkSurface dark:bg-brand-darkSurface w-full max-w-md rounded-xl shadow-2xl border-2 ${borderColor} transform transition-all scale-100 animate-in fade-in zoom-in duration-300`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                {task.title}
                            </h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${activeColor} border-current`}>
                                {activeAction?.label}
                            </span>
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
                            className="w-full h-32 p-3 rounded-lg bg-brand-light dark:bg-brand-dark border-2 border-gray-200 dark:border-gray-700 text-brand-textDarkPrimary dark:text-brand-textPrimary focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent dark:focus:ring-offset-brand-darkSurface focus:border-transparent resize-none transition-all outline-none"
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

const TaskCard = ({ task, onUpdateStatus, onOpenOverlay }) => {
    const getStatusBadge = (status) => {
        switch (status) {
            case 'stuck': return <span className="px-2 py-0.5 text-red-600 dark:text-red-500 rounded text-[10px] font-bold uppercase tracking-wider border border-red-600 dark:border-red-500">Stuck</span>;
            case 'question': return <span className="px-2 py-0.5 text-amber-600 dark:text-amber-500 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-600 dark:border-amber-500">Question</span>;
            case 'in_progress': return <span className="px-2 py-0.5 text-emerald-600 dark:text-emerald-500 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-600 dark:border-emerald-500">Active</span>;
            case 'done': return <span className="px-2 py-0.5 text-blue-600 dark:text-blue-500 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-600 dark:border-blue-500">Done</span>;
            default: return <span className="px-2 py-0.5 text-gray-500 dark:text-gray-400 rounded text-[10px] font-bold uppercase tracking-wider border border-gray-300 dark:border-gray-600">To Do</span>;
        }
    };

    const activeAction = STATUS_ACTIONS.find(a => a.id === task.status);
    // Match parent border color to status color, default to gray
    const cardBorderClass = activeAction && task.status !== 'todo' ? activeAction.borderColor : 'border-gray-200 dark:border-gray-700';

    const isDone = task.status === 'done';

    const handleActionClick = (actionId) => {
        onUpdateStatus(task.id, actionId);

        // Open overlay for Question or Stuck statuses
        if (actionId === 'question' || actionId === 'stuck') {
            // We pass the task with the NEW status conceptually, but state might not be updated yet.
            // So we pass the current task and the overlay will pick up the status from the task prop or we can pass it.
            // Actually, onUpdateStatus triggers a state update in parent. 
            // We should call onOpenOverlay immediately. 
            // Note: The task passed to onOpenOverlay might still have the OLD status if we use 'task' directly here.
            // However, the overlay renders based on the 'task' passed to it.
            // If we want the overlay to show the NEW status styling immediately, we might need to handle that.
            // But since onUpdateStatus is optimistic in StudentView, the re-render should happen fast.
            // Let's just open it. The re-render will update the overlay's task prop if we pass the ID or if we pass the object.
            onOpenOverlay({ ...task, status: actionId });
        }
    };

    return (
        <div className={`bg-brand-lightSurface dark:bg-brand-darkSurface p-4 rounded-xl hover:shadow-[0_8px_15px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_8px_15px_rgba(0,0,0,0.2)] transition-all duration-300 border-2 ${cardBorderClass} w-full max-w-full`}>
            <div className="flex items-start justify-between gap-4">
                <div className={`flex-1 transition-opacity duration-300 ${isDone ? 'opacity-50 grayscale' : ''}`}>
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className={`font-bold ${isDone ? 'text-gray-500 dark:text-gray-500' : 'text-brand-textDarkPrimary dark:text-brand-textPrimary'}`}>
                            {task.title}
                        </h3>
                        {task.dueDate && (
                            <span className={`text-sm font-medium ${isDone ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                {task.dueDate}
                            </span>
                        )}
                        {getStatusBadge(task.status)}
                    </div>
                    <p className={`text-sm ${isDone ? 'text-gray-400 dark:text-gray-600' : 'text-brand-textDarkSecondary dark:text-brand-textSecondary'}`}>
                        {task.description}
                    </p>
                    {/* Show comment preview if exists */}
                    {task.comment && (
                        <div className="mt-2 text-xs text-brand-textDarkSecondary dark:text-brand-textSecondary italic bg-brand-light dark:bg-brand-dark p-2 rounded border border-gray-100 dark:border-gray-800">
                            "{task.comment}"
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
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
                                className={`
                  p-1.5 rounded-full transition-all duration-200
                  ${isActive
                                        ? `${action.activeColor} scale-110 shadow-sm bg-transparent`
                                        : `text-gray-400 dark:text-gray-500 ${action.hover}`}
                `}
                            >
                                <Icon className="w-5 h-5" />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const CurrentTaskList = ({ tasks, onUpdateStatus, onUpdateComment }) => {
    const [overlayTask, setOverlayTask] = useState(null);

    const handleOpenOverlay = (task) => {
        setOverlayTask(task);
    };

    const handleCloseOverlay = () => {
        setOverlayTask(null);
    };

    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border border-dashed border-gray-300 dark:border-gray-700 w-full">
                <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">No tasks for today. Select a date to import tasks.</p>
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
        <div className="space-y-4 w-full">
            {sortedTasks.map((task) => (
                <TaskCard
                    key={task.id}
                    task={task}
                    onUpdateStatus={onUpdateStatus}
                    onOpenOverlay={handleOpenOverlay}
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
