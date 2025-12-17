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
// Note: 'help' consolidates the previous 'stuck' and 'question' statuses
export type TaskStatus = 'todo' | 'in_progress' | 'help' | 'done' | 'draft';

// Legacy status type for backwards compatibility with existing data
export type LegacyTaskStatus = 'stuck' | 'question';


// Define the hierarchy level for tasks
// Project → Assignment → Task → Subtask (4 levels max)
export type ItemType = 'project' | 'assignment' | 'task' | 'subtask';

// Helper to get allowed child types for each item type
export const ALLOWED_CHILD_TYPES: Record<ItemType, ItemType[]> = {
    project: ['task'],
    assignment: ['task'],
    task: ['subtask'],
    subtask: [], // Subtasks cannot have children
};

// Helper to get allowed parent types for each item type
export const ALLOWED_PARENT_TYPES: Record<ItemType, ItemType[]> = {
    project: [], // Projects cannot have parents
    assignment: [], // Assignments are standalone (cannot have parents)
    task: ['project', 'assignment'],
    subtask: ['task'],
};

// Interface for file/image attachments on tasks
export interface Attachment {
    id: string;              // Unique identifier for the attachment
    filename: string;        // Original filename (e.g., "worksheet.pdf")
    mimeType: string;        // MIME type (e.g., "application/pdf", "image/png")
    url: string;             // Download/view URL from Firebase Storage
    size: number;            // File size in bytes
    uploadedAt: any;         // Firebase Timestamp
    uploadedBy: string;      // UID of uploader (teacher)
}

// Interface for student question history on a task
// Note: Questions are NOT duplicated when a task is copied
export interface QuestionEntry {
    id: string;              // Unique identifier
    studentId: string;       // UID of the student who asked
    studentName: string;     // Display name of the student
    classroomId: string;     // Which class this question was asked in
    question: string;        // The question text
    askedAt: any;            // Firebase Timestamp
    resolved: boolean;       // Whether the teacher has addressed it
    resolvedAt?: any;        // Firebase Timestamp when resolved
    teacherResponse?: string; // Optional teacher response
}

// Interface for a Task object (now supports hierarchy)
export interface Task {
    id: string;             // Unique identifier for the task
    title: string;          // The main display title
    description: string;    // Detailed description
    status: TaskStatus;     // Current status (must be one of the values above)
    dueDate?: string;       // Optional: Date when task is due (e.g., "2023-11-27" or "Nov 27")
    comment?: string;       // Optional: Student's comment or question
    startedAt?: number;     // Timestamp when task was started
    completedAt?: number;   // Timestamp when task was completed
    wasStuck?: boolean;     // Flag if student was ever stuck
    questions?: string[];   // Array of questions asked during this task (deprecated, use questionHistory)

    // --- Hierarchy Fields ---
    type: ItemType;         // The hierarchy level of this item
    parentId: string | null; // ID of the parent item (null for top-level)
    rootId: string | null;   // ID of the root project/assignment (for quick filtering)
    path: string[];          // Array of ancestor IDs for breadcrumb display [rootId, ..., parentId]
    pathTitles: string[];    // Array of ancestor titles for breadcrumb display
    childIds: string[];      // Array of direct child IDs (for progress tracking)

    // --- Attachments ---
    attachments?: Attachment[]; // Array of file/image attachments

    // --- Question History ---
    // Note: This is stored separately and NOT copied when duplicating tasks
    questionHistory?: QuestionEntry[]; // Array of student questions for this task

    // --- Teacher-side scheduling fields ---
    // Legacy single link fields (for backwards compatibility)
    linkURL?: string;        // Resource link (deprecated, use links array)
    linkTitle?: string;      // Fetched title (deprecated, use links array)
    // New multiple links support
    links?: LinkAttachment[]; // Array of URL links with metadata
    imageURL?: string;       // Attachment URL (legacy, prefer attachments array)
    startDate?: string;      // YYYY-MM-DD
    endDate?: string;        // YYYY-MM-DD
    selectedRoomIds: string[]; // Multi-class assignment (inherited from parent if not set)
    presentationOrder: number; // Display order within parent
    teacherId?: string;      // UID of the teacher who created this
    createdAt?: any;         // Firebase Timestamp
    updatedAt?: any;         // Firebase Timestamp
}

// Interface for URL link attachments on tasks
export interface LinkAttachment {
    id: string;              // Unique identifier for the link
    url: string;             // The URL
    title?: string;          // Fetched page/video title
    addedAt: any;            // Firebase Timestamp
}

// Type for creating a new task (without id and with optional fields)
export interface TaskFormData {
    title: string;
    description: string;
    type: ItemType;
    parentId: string | null;
    links?: LinkAttachment[]; // Array of URL links
    startDate: string;
    endDate: string;
    selectedRoomIds: string[];
    attachments?: Attachment[]; // File/image attachments
}

// Type for task card in the multi-card editor
export interface TaskCardState {
    id: string;              // Temporary ID for the card (not saved to DB)
    formData: TaskFormData;
    isNew: boolean;          // True if this is a new unsaved task
    isDirty: boolean;        // True if form has unsaved changes
    parentCardId?: string;   // ID of the parent card (for hierarchy in editor)
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
    joinCode: string;       // 6-char join code (e.g., "7X99L")
    teacherId: string;      // UID of the teacher
    name: string;           // Class name (e.g., "Mrs. Smith's 5th Grade")
    subject?: string;       // e.g., "Computer Science"
    gradeLevel?: string;    // e.g., "Grade 10"
    color?: string;         // Hex code
    presentationSettings?: {
        defaultView: 'grid' | 'list';
        showTimeEstimates: boolean;
        allowStudentSorting: boolean;
    };
    contentLibrary?: Task[]; // List of available tasks for this class
}

// Phase B: The Live Session (Ephemeral - Stored in 'classrooms/{classId}/live_students')
export interface LiveStudent {
    uid: string;            // Anonymous Auth UID
    displayName: string;    // "Sarah"
    joinedAt: Timestamp;    // Server timestamp
    currentStatus: TaskStatus | LegacyTaskStatus; // Includes legacy 'stuck'/'question' for backwards compatibility
    currentTaskId?: string; // ID of the task they are working on
    taskHistory: Task[];    // Local copy of their progress for this session
    metrics: {
        tasksCompleted: number;
        activeTasks: string[]; // IDs of active tasks
    };
    currentMessage?: string; // Student's question or comment
    lastSeen?: any;         // Timestamp of last heartbeat
    lastActive?: any;       // Timestamp of last interaction
}

// Phase C: The Analytics Vault (Persistent - Stored in 'analytics_logs')
// Names are ANONYMIZED for COPPA/FERPA/PIPEDA compliance. TTL auto-deletes after 30 days.
export interface AnalyticsLog {
    id?: string;
    classroomId: string;
    studentId: string;      // Preserved ID (Anonymous Auth UID)
    studentName: string;    // Anonymized (e.g., "Student a1b2")
    date: string;           // YYYY-MM-DD
    sessionDuration: number;// Milliseconds
    expireAt?: Date;        // Firestore TTL field - auto-delete after 30 days
    taskPerformance: {
        taskId: string;
        title: string;
        timeToComplete_ms: number;
        statusWasStuck: boolean;
        questionsAsked: string[];
    }[];
}
