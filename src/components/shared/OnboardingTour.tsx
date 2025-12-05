import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Lightbulb, MousePointer, Keyboard, HelpCircle } from 'lucide-react';

/**
 * Onboarding Tour System
 * 
 * Implements multiple UX laws:
 * - Paradox of the Active User: Users don't read manuals, they dive in
 * - Tesler's Law: Absorb complexity, provide contextual guidance
 * - Goal-Gradient Effect: Show progress toward completion
 * - Zeigarnik Effect: Incomplete tours are remembered
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

interface TourContextType {
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

const TourContext = createContext<TourContextType | null>(null);

export const useTour = () => {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
};

// Predefined tours
const TOURS: Record<string, TourStep[]> = {
    'teacher-welcome': [
        {
            id: 'welcome',
            target: 'body',
            title: 'Welcome to Shape of the Day! 🎉',
            content: 'Let\'s take a quick tour to help you get started. This will only take a minute.',
            position: 'center',
            icon: <Lightbulb className="w-6 h-6 text-yellow-500" />
        },
        {
            id: 'create-class',
            target: '[data-tour="create-class"]',
            title: 'Create Your First Class',
            content: 'Start by creating a class. Students will use a unique code to join.',
            position: 'bottom',
            icon: <MousePointer className="w-5 h-5" />
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
            icon: <Keyboard className="w-5 h-5" />
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

interface TourProviderProps {
    children: ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
    const [isActive, setIsActive] = useState(false);
    const [currentTourId, setCurrentTourId] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());

    // Load completed tours from localStorage
    useEffect(() => {
        const saved = localStorage.getItem('completedTours');
        if (saved) {
            try {
                setCompletedTours(new Set(JSON.parse(saved)));
            } catch {
                // Invalid data, ignore
            }
        }
    }, []);

    // Save completed tours to localStorage
    const saveCompletedTour = (tourId: string) => {
        const newCompleted = new Set(completedTours);
        newCompleted.add(tourId);
        setCompletedTours(newCompleted);
        localStorage.setItem('completedTours', JSON.stringify([...newCompleted]));
    };

    const currentTour = currentTourId ? TOURS[currentTourId] : null;
    const totalSteps = currentTour?.length || 0;

    const startTour = useCallback((tourId: string) => {
        if (TOURS[tourId]) {
            setCurrentTourId(tourId);
            setCurrentStep(0);
            setIsActive(true);
        }
    }, []);

    const endTour = useCallback(() => {
        if (currentTourId) {
            saveCompletedTour(currentTourId);
        }
        setIsActive(false);
        setCurrentTourId(null);
        setCurrentStep(0);
    }, [currentTourId]);

    const skipTour = useCallback(() => {
        // Mark as skipped but not completed (can show again later)
        setIsActive(false);
        setCurrentTourId(null);
        setCurrentStep(0);
    }, []);

    const nextStep = useCallback(() => {
        if (currentTour && currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            endTour();
        }
    }, [currentTour, currentStep, totalSteps, endTour]);

    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const hasCompletedTour = useCallback((tourId: string) => {
        return completedTours.has(tourId);
    }, [completedTours]);

    return (
        <TourContext.Provider value={{
            isActive,
            currentStep,
            totalSteps,
            startTour,
            endTour,
            nextStep,
            prevStep,
            skipTour,
            hasCompletedTour
        }}>
            {children}
            {isActive && currentTour && (
                <TourOverlay
                    step={currentTour[currentStep]!}
                    currentStep={currentStep}
                    totalSteps={totalSteps}
                    onNext={nextStep}
                    onPrev={prevStep}
                    onSkip={skipTour}
                    onClose={endTour}
                />
            )}
        </TourContext.Provider>
    );
};

interface TourOverlayProps {
    step: TourStep;
    currentStep: number;
    totalSteps: number;
    onNext: () => void;
    onPrev: () => void;
    onSkip: () => void;
    onClose: () => void;
}

const TourOverlay: React.FC<TourOverlayProps> = ({
    step,
    currentStep,
    totalSteps,
    onNext,
    onPrev,
    onSkip,
    onClose
}) => {
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const target = document.querySelector(step.target);
        if (target && step.position !== 'center') {
            const rect = target.getBoundingClientRect();
            setTargetRect(rect);
            
            // Calculate tooltip position based on target
            let top = 0;
            let left = 0;
            
            switch (step.position) {
                case 'top':
                    top = rect.top - 20;
                    left = rect.left + rect.width / 2;
                    break;
                case 'bottom':
                    top = rect.bottom + 20;
                    left = rect.left + rect.width / 2;
                    break;
                case 'left':
                    top = rect.top + rect.height / 2;
                    left = rect.left - 20;
                    break;
                case 'right':
                    top = rect.top + rect.height / 2;
                    left = rect.right + 20;
                    break;
            }
            
            setPosition({ top, left });
        }
    }, [step]);

    // Progress percentage for Goal-Gradient Effect
    const progress = ((currentStep + 1) / totalSteps) * 100;
    const isLastStep = currentStep === totalSteps - 1;
    const isFirstStep = currentStep === 0;
    const isCentered = step.position === 'center';

    return (
        <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-label="Tour guide">
            {/* Backdrop with spotlight */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onSkip} />
            
            {/* Spotlight on target element */}
            {targetRect && !isCentered && (
                <div
                    className="absolute border-2 border-brand-accent rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none transition-all duration-300"
                    style={{
                        top: targetRect.top - 8,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                    }}
                />
            )}
            
            {/* Tooltip */}
            <div
                className={`
                    absolute bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl shadow-2xl
                    border-2 border-brand-accent p-5 w-80 max-w-[90vw]
                    transition-all duration-300 ease-out
                    ${isCentered ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ''}
                `}
                style={!isCentered ? {
                    top: position.top,
                    left: position.left,
                    transform: step.position === 'top' ? 'translate(-50%, -100%)' :
                               step.position === 'bottom' ? 'translate(-50%, 0)' :
                               step.position === 'left' ? 'translate(-100%, -50%)' :
                               'translate(0, -50%)'
                } : undefined}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label="Close tour"
                >
                    <X className="w-4 h-4" />
                </button>
                
                {/* Content */}
                <div className="pr-6">
                    {step.icon && (
                        <div className="mb-3 text-brand-accent">{step.icon}</div>
                    )}
                    <h3 className="text-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary mb-2">
                        {step.title}
                    </h3>
                    <p className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary mb-4">
                        {step.content}
                    </p>
                </div>
                
                {/* Progress bar (Goal-Gradient Effect) */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Step {currentStep + 1} of {totalSteps}</span>
                        <span>{Math.round(progress)}% complete</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-brand-accent transition-all duration-300 ease-out rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
                
                {/* Navigation */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={onSkip}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        Skip tour
                    </button>
                    
                    <div className="flex gap-2">
                        {!isFirstStep && (
                            <button
                                onClick={onPrev}
                                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-brand-accent hover:bg-brand-accent/10 rounded-md transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>
                        )}
                        <button
                            onClick={onNext}
                            className="flex items-center gap-1 px-4 py-2 text-sm font-bold bg-brand-accent text-white rounded-md hover:bg-brand-accent/90 transition-colors"
                        >
                            {isLastStep ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Done
                                </>
                            ) : (
                                <>
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Help button component that can trigger tours or show help menu
 */
interface HelpButtonProps {
    tourId?: string;
    className?: string;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ tourId, className = '' }) => {
    const { startTour, hasCompletedTour } = useTour();
    const [showMenu, setShowMenu] = useState(false);

    const handleClick = () => {
        if (tourId) {
            startTour(tourId);
        } else {
            setShowMenu(!showMenu);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleClick}
                className={`
                    p-2 rounded-md text-gray-500 hover:text-brand-accent hover:bg-gray-100 
                    dark:hover:bg-gray-800 transition-all
                    ${className}
                `}
                title="Help & Tour"
                aria-label="Help and tour options"
            >
                <HelpCircle className="w-5 h-5" />
                {tourId && !hasCompletedTour(tourId) && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-accent rounded-full animate-pulse" />
                )}
            </button>
            
            {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 py-2 z-50">
                    <button
                        onClick={() => { startTour('teacher-welcome'); setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        Take the Tour
                    </button>
                    <button
                        onClick={() => { /* Open docs */ setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        View Documentation
                    </button>
                    <button
                        onClick={() => { /* Open shortcuts */ setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        Keyboard Shortcuts
                    </button>
                </div>
            )}
        </div>
    );
};

export default TourProvider;
