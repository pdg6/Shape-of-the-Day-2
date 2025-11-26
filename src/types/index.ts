/**
 * Shared Type Definitions
 * 
 * This file contains the TypeScript interfaces (types) used throughout the application.
 * Defining these types helps ensure that we are always passing the correct data
 * to our components and functions.
 */

// Define the possible statuses for a task.
// Using a "Union Type" (the | symbol) restricts the values to ONLY these strings.
export type TaskStatus = 'todo' | 'in_progress' | 'stuck' | 'question' | 'done';

// Interface for a Task object
export interface Task {
    id: string;             // Unique identifier for the task
    title: string;          // The main display title
    description: string;    // Detailed description
    status: TaskStatus;     // Current status (must be one of the values above)
    dueDate?: string;       // Optional: When the task is due (e.g., "10:30 AM")
    comment?: string;       // Optional: Student's comment or question
}

// Interface for a Student object (used in Roster)
export interface Student {
    id: string;
    name: string;
    status: 'active' | 'idle' | 'offline';
    currentTask?: string;
    progress: number;       // Percentage (0-100) or count of completed tasks
}

// Interface for the User object (simplified from Firebase)
export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}
