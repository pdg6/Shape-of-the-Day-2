/**
 * Task Hierarchy Utilities
 * 
 * Shared functions for calculating hierarchical task numbers
 * across teacher and student views.
 */

import { Task } from '../types';

/**
 * Check if a task is "ongoing" (multi-day and not due on the selected date)
 */
export const isOngoingTask = (task: Task, forDate: string): boolean => {
    if (!task.startDate || !task.endDate) return false;
    return task.startDate !== task.endDate && task.endDate !== forDate;
};

/**
 * Get hierarchical number for a task (e.g., "1.2.1" for nested tasks)
 * Handles ongoing tasks sorting after due-today tasks for root items.
 * 
 * @param task - The task to get the number for
 * @param allTasks - All tasks in the current view
 * @param forDate - Optional date for ongoing/due-today sorting
 */
export const getHierarchicalNumber = (
    task: Task,
    allTasks: Task[],
    forDate?: string
): string => {
    // Get siblings - all root tasks or all children of the same parent
    const siblings = task.parentId
        ? allTasks.filter(t => t.parentId === task.parentId)
        : allTasks.filter(t => !t.parentId);

    // Strictly sort by presentation order to ensure numbering stays consistent with manual reordering
    siblings.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));

    const myIndex = siblings.findIndex(t => t.id === task.id) + 1;

    if (!task.parentId) return String(myIndex);

    const parent = allTasks.find(t => t.id === task.parentId);
    if (!parent) return String(myIndex);

    return `${getHierarchicalNumber(parent, allTasks, forDate)}.${myIndex}`;
};
