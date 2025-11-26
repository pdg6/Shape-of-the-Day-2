/**
 * Shared Type Definitions
 * 
 * This file contains the TypeScript interfaces (types) used throughout the application.
 * Defining these types helps ensure that we are always passing the correct data
 * to our components and functions.
 */

import { Timestamp } from 'firebase/firestore';

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
    startedAt?: number;     // Timestamp when task was started
    completedAt?: number;   // Timestamp when task was completed
    wasStuck?: boolean;     // Flag if student was ever stuck
    questions?: string[];   // Array of questions asked during this task
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

// --- New Types for Privacy Architecture ---

// Phase A: Static Configuration (Stored in 'classrooms' collection)
export interface Classroom {
    id: string;             // Auto-generated ID
    code: string;           // 6-char join code (e.g., "7X99L")
    teacherId: string;      // UID of the teacher
    name: string;           // Class name (e.g., "Mrs. Smith's 5th Grade")
    contentLibrary: Task[]; // List of available tasks for this class
}

// Phase B: The Live Session (Ephemeral - Stored in 'classrooms/{classId}/live_students')
export interface LiveStudent {
    uid: string;            // Anonymous Auth UID
    displayName: string;    // "Sarah"
    joinedAt: Timestamp;    // Server timestamp
    currentStatus: TaskStatus;
    currentTaskId?: string; // ID of the task they are working on
    taskHistory: Task[];    // Local copy of their progress for this session
    metrics: {
        tasksCompleted: number;
        activeTasks: string[]; // IDs of active tasks
    };
}

// Phase C: The Analytics Vault (Persistent - Stored in 'analytics_logs')
// NO NAMES allowed here.
export interface AnalyticsLog {
    id?: string;
    classroomId: string;
    date: string;           // YYYY-MM-DD
    sessionDuration: number;// Milliseconds
    taskPerformance: {
        taskId: string;
        title: string;
        timeToComplete_ms: number;
        statusWasStuck: boolean;
        questionsAsked: string[];
    }[];
}
