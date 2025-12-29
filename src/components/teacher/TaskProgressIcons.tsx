import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Task, TaskStatus } from '../../types';

/**
 * TaskProgressIcons Component
 * 
 * Displays task progress as numbered circular icons that show status through color.
 * Supports horizontal scrolling for many tasks with chevron navigation.
 */

interface TaskProgressIconsProps {
    tasks: Task[];  // All tasks for the class, will be sorted by presentationOrder
    taskStatuses: Record<string, TaskStatus>;  // Student's status per task { taskId: status }
    maxVisible?: number;  // Maximum icons visible before scrolling, default 10
}

// Get hierarchical number for nested tasks (matches existing app logic)
const getHierarchicalNumber = (task: Task, allTasks: Task[]): string => {
    const siblings = task.parentId
        ? allTasks.filter(t => t.parentId === task.parentId)
        : allTasks.filter(t => !t.parentId);

    siblings.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
    const myIndex = siblings.findIndex(t => t.id === task.id) + 1;

    if (!task.parentId) return String(myIndex);

    const parent = allTasks.find(t => t.id === task.parentId);
    if (!parent) return String(myIndex);

    return `${getHierarchicalNumber(parent, allTasks)}.${myIndex}`;
};

// Get status color classes
const getStatusColors = (status: string | undefined): { bg: string; text: string; border: string } => {
    // Normalize legacy statuses (stuck/question -> help)
    const normalizedStatus = (status === 'stuck' || status === 'question') ? 'help' : status;

    switch (normalizedStatus) {
        case 'help':
            return {
                bg: 'bg-[var(--color-status-stuck)]',
                text: 'text-white',
                border: 'border-red-600'
            };
        case 'in_progress':
            return {
                bg: 'bg-[var(--color-status-progress)]',
                text: 'text-white',
                border: 'border-emerald-600'
            };
        case 'done':
            return {
                bg: 'bg-[var(--color-status-complete)]',
                text: 'text-white',
                border: 'border-blue-600'
            };
        default: // todo, draft, undefined
            return {
                bg: 'bg-[var(--color-bg-tile-alt)]',
                text: 'text-brand-textSecondary',
                border: 'border-[var(--color-border-subtle)]'
            };
    }
};

const TaskProgressIcons: React.FC<TaskProgressIconsProps> = ({
    tasks,
    taskStatuses,
    maxVisible = 10
}) => {
    const [scrollPosition, setScrollPosition] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sort tasks by presentationOrder
    const sortedTasks = [...tasks].sort((a, b) =>
        (a.presentationOrder || 0) - (b.presentationOrder || 0)
    );

    // Filter to only show non-draft tasks
    const visibleTasks = sortedTasks.filter(t => t.status !== 'draft');

    const totalTasks = visibleTasks.length;
    const showScrollButtons = totalTasks > maxVisible;
    const maxScrollPosition = Math.max(0, totalTasks - maxVisible);

    // Handle scroll left
    const scrollLeft = () => {
        setScrollPosition(prev => Math.max(0, prev - 1));
    };

    // Handle scroll right
    const scrollRight = () => {
        setScrollPosition(prev => Math.min(maxScrollPosition, prev + 1));
    };

    // Get visible tasks based on scroll position
    const displayedTasks = showScrollButtons
        ? visibleTasks.slice(scrollPosition, scrollPosition + maxVisible)
        : visibleTasks;

    if (totalTasks === 0) {
        return (
            <span className="text-xs text-brand-textMuted italic">No tasks</span>
        );
    }

    return (
        <div className="flex items-center gap-1">
            {/* Left Chevron */}
            {showScrollButtons && (
                <button
                    onClick={scrollLeft}
                    disabled={scrollPosition === 0}
                    className={`p-1 rounded transition-colors ${scrollPosition === 0
                        ? 'text-brand-textSecondary/30 cursor-not-allowed'
                        : 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-[var(--color-bg-tile-hover)]'
                        }`}
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
            )}

            {/* Task Icons */}
            <div
                ref={containerRef}
                className="flex items-center gap-1"
            >
                {displayedTasks.map((task) => {
                    const status = taskStatuses[task.id];
                    const colors = getStatusColors(status);
                    const number = getHierarchicalNumber(task, visibleTasks);

                    return (
                        <div
                            key={task.id}
                            className={`
                                relative group
                                w-7 h-7 min-w-7
                                flex items-center justify-center
                                rounded-full
                                border-2 ${colors.border}
                                ${colors.bg} ${colors.text}
                                text-xs font-bold
                                transition-all duration-200
                                cursor-default
                            `}
                            title={task.title}
                        >
                            {/* Number - truncate if too long */}
                            <span className="truncate max-w-5 text-center leading-none">
                                {number}
                            </span>

                            {/* Hover Tooltip */}
                            <div
                                className="
                                    absolute bottom-full left-1/2 -translate-x-1/2 mb-2
                                    px-2 py-1
                                    bg-[var(--color-bg-tile-alt)]
                                    text-brand-textPrimary
                                    text-xs font-medium
                                    rounded-md shadow-lg border border-[var(--color-border-subtle)]
                                    whitespace-nowrap
                                    opacity-0 invisible
                                    group-hover:opacity-100 group-hover:visible
                                    transition-all duration-200
                                    z-50
                                    pointer-events-none
                                    max-w-[200px] truncate
                                "
                            >
                                {task.title}
                                {/* Arrow */}
                                <div
                                    className="
                                        absolute top-full left-1/2 -translate-x-1/2
                                        border-4 border-transparent
                                        border-t-[var(--color-bg-tile-alt)]
                                    "
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Right Chevron */}
            {showScrollButtons && (
                <button
                    onClick={scrollRight}
                    disabled={scrollPosition >= maxScrollPosition}
                    className={`p-1 rounded transition-colors ${scrollPosition >= maxScrollPosition
                        ? 'text-brand-textSecondary/30 cursor-not-allowed'
                        : 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-[var(--color-bg-tile-hover)]'
                        }`}
                    aria-label="Scroll right"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            )}

            {/* Scroll indicator (if scrollable) */}
            {showScrollButtons && (
                <span className="text-xs text-brand-textMuted ml-1">
                    {scrollPosition + 1}-{Math.min(scrollPosition + maxVisible, totalTasks)}/{totalTasks}
                </span>
            )}
        </div>
    );
};

export default TaskProgressIcons;
