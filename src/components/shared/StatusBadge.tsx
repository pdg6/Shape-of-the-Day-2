import React from 'react';
import { TaskStatus } from '../../types';

interface StatusBadgeProps {
    status: TaskStatus;
    size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm' }) => {
    const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs';

    const statusConfig = {
        stuck: {
            color: 'text-status-stuck',
            bg: 'bg-status-stuck/10',
            border: 'border-status-stuck/20',
            label: 'Stuck'
        },
        question: {
            color: 'text-status-question',
            bg: 'bg-status-question/10',
            border: 'border-status-question/20',
            label: 'Question'
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
            color: 'text-gray-500 dark:text-gray-400',
            bg: 'bg-gray-50 dark:bg-gray-800',
            border: 'border-gray-200 dark:border-gray-700',
            label: 'To Do'
        }
    };

    const config = statusConfig[status];

    return (
        <span className={`
      ${sizeClasses} ${config.color} ${config.bg} ${config.border}
      rounded-full font-bold uppercase tracking-wider border inline-block
    `}>
            {config.label}
        </span>
    );
};
