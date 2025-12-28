import React, { createContext, useContext } from 'react';
import { Lightbulb, MousePointer, Keyboard } from 'lucide-react';

/**
 * Onboarding Tour System Types
 */

export interface TourStep {
    id: string;
    target: string; // CSS selector for the target element
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    icon?: React.ReactNode;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export interface TourContextType {
    isActive: boolean;
    currentStep: number;
    totalSteps: number;
    startTour: (tourId: string) => void;
    endTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    skipTour: () => void;
    hasCompletedTour: (tourId: string) => boolean;
}

export const TourContext = createContext<TourContextType | null>(null);

/**
 * Predefined tours data
 */
export const TOURS: Record<string, TourStep[]> = {
    'teacher-welcome': [
        {
            id: 'welcome',
            target: 'body',
            title: 'Welcome to Shape of the Day! 🎉',
            content: 'Let\'s take a quick tour to help you get started. This will only take a minute.',
            position: 'center',
            icon: React.createElement(Lightbulb, { className: "w-6 h-6 text-yellow-500" })
        },
        {
            id: 'create-class',
            target: '[data-tour="create-class"]',
            title: 'Create Your First Class',
            content: 'Start by creating a class. Students will use a unique code to join.',
            position: 'bottom',
            icon: React.createElement(MousePointer, { className: "w-5 h-5" })
        },
        {
            id: 'add-tasks',
            target: '[data-tour="task-manager"]',
            title: 'Add Tasks for Students',
            content: 'Create tasks, assignments, and projects. Drag them onto the calendar to schedule.',
            position: 'right'
        },
        {
            id: 'live-view',
            target: '[data-tour="live-view"]',
            title: 'Monitor in Real-Time',
            content: 'Watch student progress live. See who needs help and who\'s completed their work.',
            position: 'bottom'
        },
        {
            id: 'keyboard-shortcuts',
            target: 'body',
            title: 'Pro Tip: Keyboard Shortcuts',
            content: 'Press ? anytime to see available keyboard shortcuts for faster navigation.',
            position: 'center',
            icon: React.createElement(Keyboard, { className: "w-5 h-5" })
        }
    ],
    'student-welcome': [
        {
            id: 'welcome',
            target: 'body',
            title: 'Welcome! 👋',
            content: 'Here\'s a quick overview of how to use Shape of the Day.',
            position: 'center'
        },
        {
            id: 'tasks',
            target: '[data-tour="task-list"]',
            title: 'Your Tasks',
            content: 'All your tasks for today appear here. Click the status buttons to update your progress.',
            position: 'right'
        },
        {
            id: 'help',
            target: '[data-tour="help-button"]',
            title: 'Need Help?',
            content: 'Click "Stuck" or "Question" to notify your teacher. They\'ll see your message right away!',
            position: 'top'
        },
        {
            id: 'calendar',
            target: '[data-tour="calendar"]',
            title: 'Plan Ahead',
            content: 'Check the calendar to see upcoming tasks and assignments.',
            position: 'left'
        }
    ]
};

/**
 * useTour Hook
 */
export const useTour = () => {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
};
