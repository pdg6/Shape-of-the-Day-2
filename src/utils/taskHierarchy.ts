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
    task: Task | undefined,
    allTasks: Task[],
    forDate?: string
): string => {
    if (!task) return '...';

    // Get siblings - all root tasks or all children of the same parent
    const siblings = task.parentId
        ? allTasks.filter(t => t && t.parentId === task.parentId)
        : allTasks.filter(t => t && !t.parentId);

    // Strictly sort by presentation order to ensure numbering stays consistent with manual reordering
    siblings.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));

    const myIndex = siblings.findIndex(t => t.id === task.id) + 1;

    if (!task.parentId) return String(myIndex);

    const parent = allTasks.find(t => t.id === task.parentId);
    if (!parent) return String(myIndex);

    return `${getHierarchicalNumber(parent, allTasks, forDate)}.${myIndex}`;
};

/**
 * Get predictive number for a task being created (before save)
 * This allows displaying the task number while the user is typing.
 * 
 * @param parentId - Parent task ID (null for root tasks)
 * @param allTasks - All existing tasks
 * @param selectedDate - Date for filtering (tasks active on this date)
 * @param currentClassId - Class to filter by (null for all classes)
 * @param includeDrafts - Whether to include draft tasks in count
 */
export const getPredictiveNumber = (
    parentId: string | null,
    allTasks: Task[],
    selectedDate: string,
    currentClassId: string | null,
    includeDrafts: boolean = true
): string => {
    // Filter tasks to same date + class
    const relevantTasks = allTasks.filter(t => {
        if (!t) return false;
        const start = t.startDate || '';
        const end = t.endDate || '';
        const isInRange = start <= selectedDate && end >= selectedDate;
        const isInClass = !currentClassId || t.selectedRoomIds?.includes(currentClassId);
        const isDraft = t.status === 'draft';
        const statusOk = includeDrafts || !isDraft;
        return (isInRange || isDraft) && isInClass && statusOk;
    });

    // Get siblings (same parent level)
    const siblings = parentId
        ? relevantTasks.filter(t => t && t.parentId === parentId)
        : relevantTasks.filter(t => t && !t.parentId);

    // Sort by presentation order
    siblings.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));

    const nextNumber = siblings.length + 1;

    if (!parentId) return String(nextNumber);

    // Get parent's number
    const parent = relevantTasks.find(t => t.id === parentId);
    if (!parent) return String(nextNumber);

    return `${getHierarchicalNumber(parent, relevantTasks, selectedDate)}.${nextNumber}`;
};
