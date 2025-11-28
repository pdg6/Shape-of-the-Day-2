import { Classroom, Task, LiveStudent, AnalyticsLog } from '../types';
import { Timestamp } from 'firebase/firestore';

/**
 * Dummy Data for UX Exploration
 * 
 * This file contains comprehensive sample data for testing both teacher and student flows.
 * Includes: classrooms, tasks, live students, and analytics data.
 */

// --- HELPER FUNCTIONS ---

/**
 * Get date string for a given offset from today
 * @param daysOffset Number of days to offset (negative for past, positive for future)
 */
const getDateString = (daysOffset: number = 0): string => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0] ?? ''; // YYYY-MM-DD format
};

/**
 * Generate a random timestamp within the last N hours
 */
const getRecentTimestamp = (hoursAgo: number = 1): Timestamp => {
    const date = new Date();
    date.setHours(date.getHours() - Math.random() * hoursAgo);
    return Timestamp.fromDate(date);
};

// --- CLASSROOMS ---

export const DUMMY_CLASSROOMS: Classroom[] = [
    {
        id: 'class-cs101',
        joinCode: '123456',
        teacherId: 'teacher-1', // Will be replaced with actual teacher ID
        name: 'Computer Science 101',
        subject: 'Computer Science',
        gradeLevel: 'Grade 10',
        color: '#3B82F6',
        presentationSettings: {
            defaultView: 'grid',
            showTimeEstimates: true,
            allowStudentSorting: true,
        },
    },
    {
        id: 'class-webdev',
        joinCode: '234567',
        teacherId: 'teacher-1',
        name: 'Web Development Advanced',
        subject: 'Technology',
        gradeLevel: 'Grade 11',
        color: '#10B981',
        presentationSettings: {
            defaultView: 'list',
            showTimeEstimates: true,
            allowStudentSorting: false,
        },
    },
    {
        id: 'class-design',
        joinCode: '345678',
        teacherId: 'teacher-1',
        name: 'Digital Design & Media',
        subject: 'Art & Design',
        gradeLevel: 'Grade 12',
        color: '#8B5CF6',
        presentationSettings: {
            defaultView: 'grid',
            showTimeEstimates: false,
            allowStudentSorting: true,
        },
    },
];

// --- TASKS ---

/**
 * Tasks for Computer Science 101 - 5 tasks
 */
export const CS101_TASKS: Task[] = [
    {
        id: `task-cs-1`,
        title: 'Algorithm Warm-up: Array Manipulation',
        description: 'Solve 3 array challenges on LeetCode focusing on two-pointer technique and sliding window patterns. Submit your solutions.',
        status: 'todo',
        dueDate: '9:00 AM',
    },
    {
        id: `task-cs-2`,
        title: 'Data Structures Lecture: Stacks & Queues',
        description: 'Watch the 25-minute video on stacks and queues. Take notes on LIFO vs FIFO principles and real-world applications.',
        status: 'todo',
        dueDate: '9:30 AM',
    },
    {
        id: `task-cs-3`,
        title: 'Coding Lab: Implement a Stack Class',
        description: 'Create a Stack class in JavaScript with push(), pop(), peek(), and isEmpty() methods. Include unit tests for edge cases.',
        status: 'todo',
        dueDate: '10:15 AM',
    },
    {
        id: `task-cs-4`,
        title: 'Code Review: Peer Feedback Session',
        description: 'Exchange code with a partner. Review their Stack implementation and provide constructive feedback using the rubric.',
        status: 'todo',
        dueDate: '11:00 AM',
    },
    {
        id: `task-cs-5`,
        title: 'Quiz: Data Structures Fundamentals',
        description: 'Complete the 10-question quiz on Canvas covering arrays, linked lists, stacks, and queues. Time limit: 15 minutes.',
        status: 'todo',
        dueDate: '11:45 AM',
    },
];

/**
 * Tasks for Web Development Advanced - 5 tasks
 */
export const WEBDEV_TASKS: Task[] = [
    {
        id: `task-web-1`,
        title: 'React Hooks Deep Dive',
        description: 'Complete the tutorial on useState, useEffect, and custom hooks. Build the example counter and timer components.',
        status: 'todo',
        dueDate: '9:00 AM',
    },
    {
        id: `task-web-2`,
        title: 'Build a Task Manager App',
        description: 'Create a fully functional task manager using React. Features: add/delete tasks, mark complete, filter by status. Use CSS modules for styling.',
        status: 'todo',
        dueDate: '10:30 AM',
    },
    {
        id: `task-web-3`,
        title: 'API Integration: Fetch Weather Data',
        description: 'Integrate the OpenWeather API into your app. Display current weather and 5-day forecast. Handle loading states and errors.',
        status: 'todo',
        dueDate: '11:30 AM',
    },
    {
        id: `task-web-4`,
        title: 'Responsive Design Challenge',
        description: 'Make your app fully responsive for mobile, tablet, and desktop. Use CSS Grid/Flexbox and media queries. Test on different screen sizes.',
        status: 'todo',
        dueDate: '12:30 PM',
    },
    {
        id: `task-web-5`,
        title: 'Deploy to Vercel',
        description: 'Deploy your completed app to Vercel. Set up automatic deployments from your GitHub repository. Submit the live URL.',
        status: 'todo',
        dueDate: '1:00 PM',
    },
];

/**
 * Tasks for Digital Design & Media - 5 tasks
 */
export const DESIGN_TASKS: Task[] = [
    {
        id: `task-design-1`,
        title: 'Figma Fundamentals: Design System Setup',
        description: 'Create a design system in Figma with typography scale, color palette, spacing tokens, and component library for a mobile app.',
        status: 'todo',
        dueDate: '9:00 AM',
    },
    {
        id: `task-design-2`,
        title: 'UI Challenge: E-commerce App Redesign',
        description: 'Redesign 5 key screens of a popular e-commerce app (Home, Product, Cart, Checkout, Profile). Focus on UX improvements and visual hierarchy.',
        status: 'todo',
        dueDate: '10:30 AM',
    },
    {
        id: `task-design-3`,
        title: 'Color Theory & Accessibility',
        description: 'Create 3 accessible color palettes that meet WCAG AA standards. Test contrast ratios. Design one light and one dark theme.',
        status: 'todo',
        dueDate: '11:30 AM',
    },
    {
        id: `task-design-4`,
        title: 'Prototyping: Interactive Mobile App',
        description: 'Create interactive prototypes with animations and transitions in Figma. Add micro-interactions for button states and page transitions.',
        status: 'todo',
        dueDate: '12:30 PM',
    },
    {
        id: `task-design-5`,
        title: 'Design Presentation: Portfolio Case Study',
        description: 'Prepare a 5-minute presentation of your redesign. Include problem statement, research, design decisions, and before/after comparisons.',
        status: 'todo',
        dueDate: '1:30 PM',
    },
];


// --- LIVE STUDENTS ---

/**
 * Simulated live student sessions with various progress states
 * These would appear in the teacher's LiveView
 */
export const DUMMY_LIVE_STUDENTS: LiveStudent[] = [
    {
        uid: 'student-001',
        displayName: 'Emma Thompson',
        joinedAt: getRecentTimestamp(0.5),
        currentStatus: 'in_progress',
        currentTaskId: 'task-cs-3',
        taskHistory: [
            {
                id: 'task-cs-1',
                title: 'Algorithm Warm-up: Array Manipulation',
                description: 'Solve 3 array challenges',
                status: 'done',
                completedAt: Date.now() - 3600000,
            },
            {
                id: 'task-cs-2',
                title: 'Data Structures Lecture: Stacks & Queues',
                description: 'Watch the video',
                status: 'done',
                completedAt: Date.now() - 1800000,
            },
            {
                id: 'task-cs-3',
                title: 'Coding Lab: Implement a Stack Class',
                description: 'Create a Stack class',
                status: 'in_progress',
                startedAt: Date.now() - 600000,
            },
        ],
        metrics: {
            tasksCompleted: 2,
            activeTasks: ['task-cs-3'],
        },
    },
    {
        uid: 'student-002',
        displayName: 'Marcus Rodriguez',
        joinedAt: getRecentTimestamp(0.3),
        currentStatus: 'stuck',
        currentTaskId: 'task-cs-3',
        taskHistory: [
            {
                id: 'task-cs-1',
                title: 'Algorithm Warm-up: Array Manipulation',
                description: 'Solve 3 array challenges',
                status: 'done',
                completedAt: Date.now() - 4200000,
            },
            {
                id: 'task-cs-2',
                title: 'Data Structures Lecture: Stacks & Queues',
                description: 'Watch the video',
                status: 'done',
                completedAt: Date.now() - 2400000,
            },
            {
                id: 'task-cs-3',
                title: 'Coding Lab: Implement a Stack Class',
                description: 'Create a Stack class',
                status: 'stuck',
                startedAt: Date.now() - 1200000,
                wasStuck: true,
            },
        ],
        metrics: {
            tasksCompleted: 2,
            activeTasks: ['task-cs-3'],
        },
        currentMessage: 'I\'m having trouble with the pop() method. Not sure how to handle empty stack.',
    },
    {
        uid: 'student-003',
        displayName: 'Aisha Patel',
        joinedAt: getRecentTimestamp(0.7),
        currentStatus: 'done',
        currentTaskId: 'task-cs-4',
        taskHistory: [
            {
                id: 'task-cs-1',
                title: 'Algorithm Warm-up: Array Manipulation',
                description: 'Solve 3 array challenges',
                status: 'done',
                completedAt: Date.now() - 5400000,
            },
            {
                id: 'task-cs-2',
                title: 'Data Structures Lecture: Stacks & Queues',
                description: 'Watch the video',
                status: 'done',
                completedAt: Date.now() - 3600000,
            },
            {
                id: 'task-cs-3',
                title: 'Coding Lab: Implement a Stack Class',
                description: 'Create a Stack class',
                status: 'done',
                completedAt: Date.now() - 600000,
            },
            {
                id: 'task-cs-4',
                title: 'Code Review: Peer Feedback Session',
                description: 'Peer code review',
                status: 'done',
                completedAt: Date.now() - 300000,
            },
        ],
        metrics: {
            tasksCompleted: 4,
            activeTasks: [],
        },
    },
    {
        uid: 'student-004',
        displayName: 'Liam Chen',
        joinedAt: getRecentTimestamp(0.2),
        currentStatus: 'question',
        currentTaskId: 'task-cs-2',
        taskHistory: [
            {
                id: 'task-cs-1',
                title: 'Algorithm Warm-up: Array Manipulation',
                description: 'Solve 3 array challenges',
                status: 'done',
                completedAt: Date.now() - 3000000,
            },
            {
                id: 'task-cs-2',
                title: 'Data Structures Lecture: Stacks & Queues',
                description: 'Watch the video',
                status: 'question',
                questions: ['Can you explain time complexity for linked list insertions?'],
            },
        ],
        metrics: {
            tasksCompleted: 1,
            activeTasks: ['task-cs-2'],
        },
        currentMessage: 'Can you explain time complexity for linked list insertions?',
    },
    {
        uid: 'student-005',
        displayName: 'Sofia Martinez',
        joinedAt: getRecentTimestamp(0.4),
        currentStatus: 'in_progress',
        currentTaskId: 'task-cs-2',
        taskHistory: [
            {
                id: 'task-cs-1',
                title: 'Algorithm Warm-up: Array Manipulation',
                description: 'Solve 3 array challenges',
                status: 'done',
                completedAt: Date.now() - 3900000,
            },
            {
                id: 'task-cs-2',
                title: 'Data Structures Lecture: Stacks & Queues',
                description: 'Watch the video',
                status: 'in_progress',
                startedAt: Date.now() - 900000,
            },
        ],
        metrics: {
            tasksCompleted: 1,
            activeTasks: ['task-cs-2'],
        },
    },
    {
        uid: 'student-006',
        displayName: 'Noah Johnson',
        joinedAt: getRecentTimestamp(0.6),
        currentStatus: 'todo',
        currentTaskId: 'task-cs-1',
        taskHistory: [],
        metrics: {
            tasksCompleted: 0,
            activeTasks: [],
        },
    },
    {
        uid: 'student-007',
        displayName: 'Zara Kim',
        joinedAt: getRecentTimestamp(0.8),
        currentStatus: 'in_progress',
        currentTaskId: 'task-cs-3',
        taskHistory: [
            {
                id: 'task-cs-1',
                title: 'Algorithm Warm-up: Array Manipulation',
                description: 'Solve 3 array challenges',
                status: 'done',
                completedAt: Date.now() - 4800000,
            },
            {
                id: 'task-cs-2',
                title: 'Data Structures Lecture: Stacks & Queues',
                description: 'Watch the video',
                status: 'done',
                completedAt: Date.now() - 3000000,
            },
            {
                id: 'task-cs-3',
                title: 'Coding Lab: Implement a Stack Class',
                description: 'Create a Stack class',
                status: 'in_progress',
                startedAt: Date.now() - 1800000,
            },
        ],
        metrics: {
            tasksCompleted: 2,
            activeTasks: ['task-cs-3'],
        },
    },
    {
        uid: 'student-008',
        displayName: 'Ethan Williams',
        joinedAt: getRecentTimestamp(0.1),
        currentStatus: 'in_progress',
        currentTaskId: 'task-cs-4',
        taskHistory: [
            {
                id: 'task-cs-1',
                title: 'Algorithm Warm-up: Array Manipulation',
                description: 'Solve 3 array challenges',
                status: 'done',
                completedAt: Date.now() - 5100000,
            },
            {
                id: 'task-cs-2',
                title: 'Data Structures Lecture: Stacks & Queues',
                description: 'Watch the video',
                status: 'done',
                completedAt: Date.now() - 3900000,
            },
            {
                id: 'task-cs-3',
                title: 'Coding Lab: Implement a Stack Class',
                description: 'Create a Stack class',
                status: 'done',
                completedAt: Date.now() - 1200000,
                wasStuck: true,
                questions: ['How do I test edge cases?'],
            },
            {
                id: 'task-cs-4',
                title: 'Code Review: Peer Feedback Session',
                description: 'Peer code review',
                status: 'in_progress',
                startedAt: Date.now() - 600000,
            },
        ],
        metrics: {
            tasksCompleted: 3,
            activeTasks: ['task-cs-4'],
        },
    },
];

// --- ANALYTICS LOGS ---

/**
 * Historical analytics data for past sessions
 * Used for the Data/Analytics view in teacher dashboard
 */
export const DUMMY_ANALYTICS: AnalyticsLog[] = [
    {
        classroomId: 'class-cs101',
        studentId: 'student-001',
        studentName: 'Emma Thompson',
        date: getDateString(-1), // Yesterday
        sessionDuration: 7200000, // 2 hours
        taskPerformance: [
            {
                taskId: 'task-past-1',
                title: 'Review: Binary Search Trees',
                timeToComplete_ms: 1800000, // 30 min
                statusWasStuck: false,
                questionsAsked: [],
            },
            {
                taskId: 'task-past-2',
                title: 'Project: Build a Calculator',
                timeToComplete_ms: 5400000, // 90 min
                statusWasStuck: true,
                questionsAsked: ['How do I handle division by zero?'],
            },
        ],
    },
    {
        classroomId: 'class-cs101',
        studentId: 'student-002',
        studentName: 'Marcus Rodriguez',
        date: getDateString(-1),
        sessionDuration: 6300000, // 1h 45min
        taskPerformance: [
            {
                taskId: 'task-past-1',
                title: 'Review: Binary Search Trees',
                timeToComplete_ms: 2100000, // 35 min
                statusWasStuck: false,
                questionsAsked: ['What is the difference between BST and regular trees?'],
            },
            {
                taskId: 'task-past-2',
                title: 'Project: Build a Calculator',
                timeToComplete_ms: 4200000, // 70 min
                statusWasStuck: false,
                questionsAsked: [],
            },
        ],
    },
    {
        classroomId: 'class-cs101',
        studentId: 'student-003',
        studentName: 'Aisha Patel',
        date: getDateString(-2), // 2 days ago
        sessionDuration: 5400000, // 1h 30min
        taskPerformance: [
            {
                taskId: 'task-old-1',
                title: 'Introduction to Algorithms',
                timeToComplete_ms: 3000000, // 50 min
                statusWasStuck: false,
                questionsAsked: [],
            },
            {
                taskId: 'task-old-2',
                title: 'Practice: Sorting Algorithms',
                timeToComplete_ms: 2400000, // 40 min
                statusWasStuck: false,
                questionsAsked: [],
            },
        ],
    },
];

// --- HELPER TO GET ALL DATA ---

/**
 * Get all dummy data organized by type
 */
export const getAllDummyData = () => ({
    classrooms: DUMMY_CLASSROOMS,
    tasks: {
        'class-cs101': CS101_TASKS,
        'class-webdev': WEBDEV_TASKS,
        'class-design': DESIGN_TASKS,
    },
    liveStudents: {
        'class-cs101': DUMMY_LIVE_STUDENTS,
    },
    analytics: DUMMY_ANALYTICS,
});

/**
 * Get tasks organized by date for a specific classroom
 */
export const getTasksByDate = (classId: string) => {
    const tasks = classId === 'class-cs101' ? CS101_TASKS
        : classId === 'class-webdev' ? WEBDEV_TASKS
            : DESIGN_TASKS;

    const tasksByDate: Record<string, Task[]> = {
        [getDateString(0)]: [], // Today
        [getDateString(-1)]: [], // Yesterday
        [getDateString(1)]: [], // Tomorrow
    };

    // Distribute tasks by date (this is simplified - in real app would use actual date fields)
    tasks.forEach((task, index) => {
        if (index < 5) {
            tasksByDate[getDateString(0)]?.push(task);
        } else if (index < 7) {
            tasksByDate[getDateString(-1)]?.push(task);
        } else {
            tasksByDate[getDateString(1)]?.push(task);
        }
    });

    return tasksByDate;
};
