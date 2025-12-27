import React from 'react';
import { TaskStatus } from '../../types';

interface StatusBadgeProps {
    status: TaskStatus | 'stuck' | 'question'; // Allow legacy values
    size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
    const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs';

    // Map legacy statuses to help
    const normalizedStatus = (status === 'stuck' || status === 'question') ? 'help' : status;

    const statusConfig = {
        help: {
            color: 'text-status-question',
            bg: 'bg-status-question/10',
            border: 'border-status-question/20',
            label: 'Needs Help'
        },
        in_progress: {
            color: 'text-status-progress',
            bg: 'bg-status-progress/10',
            border: 'border-status-progress/20',
            label: 'Active'
        },
        done: {
            color: 'text-status-complete',
            bg: 'bg-status-complete/10',
            border: 'border-status-complete/20',
            label: 'Done'
        },
        todo: {
            color: 'text-brand-textDarkSecondary dark:text-gray-400',
            bg: 'bg-slate-50 dark:bg-[#151921]',
            border: 'border-slate-200 dark:border-white/5',
            label: 'To Do'
        },
        draft: {
            color: 'text-slate-400 dark:text-gray-500',
            bg: 'bg-slate-50 dark:bg-[#151921]',
            border: 'border-slate-200 dark:border-white/5',
            label: 'Draft'
        }
    };

    const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || statusConfig.todo;

    return (
        <span className={`
      ${sizeClasses} ${config.color} ${config.bg} ${config.border}
      rounded-full font-bold uppercase tracking-wider border inline-block
    `}>
            {config.label}
        </span>
    );
};

