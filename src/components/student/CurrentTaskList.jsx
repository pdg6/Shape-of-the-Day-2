import React from 'react';
import { AlertCircle, HelpCircle, Play, CheckCircle, RotateCcw } from 'lucide-react';

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

const TaskCard = ({ task, onUpdateStatus }) => {
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

    return (
        <div className={`bg-brand-lightSurface dark:bg-brand-darkSurface p-4 rounded-xl hover:shadow-md transition-all duration-300 border-2 ${cardBorderClass} w-full max-w-full`}>
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
                                onClick={() => onUpdateStatus(task.id, action.id)}
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

const CurrentTaskList = ({ tasks, onUpdateStatus }) => {
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
                <TaskCard key={task.id} task={task} onUpdateStatus={onUpdateStatus} />
            ))}
        </div>
    );
};

export default CurrentTaskList;
