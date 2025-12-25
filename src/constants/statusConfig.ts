import { TaskStatus } from '../types';

/**
 * Configuration for task status display styling
 * Note: Only includes statuses that have distinct visual representations
 * 'help' and 'draft' statuses use special rendering logic elsewhere
 */
interface StatusConfigEntry {
    id: TaskStatus;
    label: string;
    color: string;
    borderColor: string;
    textColor: string;
}

// Partial record since not all TaskStatus values have display configs
export const STATUS_CONFIG: Partial<Record<TaskStatus, StatusConfigEntry>> = {
    todo: {
        id: 'todo',
        label: 'To Do',
        color: 'bg-slate-100',
        borderColor: 'border-slate-300',
        textColor: 'text-slate-700'
    },
    in_progress: {
        id: 'in_progress',
        label: 'In Progress',
        color: 'bg-blue-50',
        borderColor: 'border-blue-300',
        textColor: 'text-blue-700'
    },
    done: {
        id: 'done',
        label: 'Done',
        color: 'bg-green-50',
        borderColor: 'border-green-300',
        textColor: 'text-green-700'
    }
};

export const STATUS_IDS = Object.keys(STATUS_CONFIG) as TaskStatus[];
