import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { TourContext, TourStep, TOURS } from '../../context/tour-context';

interface TourProviderProps {
    children: ReactNode;
}

/**
 * TourProvider Component
 * 
 * Manages the onboarding tour state and renders the overlay.
 * Logic is separated into tour-context.ts for Fast Refresh compatibility.
 */
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
                    className="absolute border border-brand-accent rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] pointer-events-none transition-all duration-300"
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
                    absolute bg-brand-lightSurface dark:bg-[#1a1d24] rounded-2xl shadow-layered-lg
                    border border-slate-200 dark:border-white/10 p-5 w-80 max-w-[90vw]
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
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
                        <span>Step {currentStep + 1} of {totalSteps}</span>
                        <span>{Math.round(progress)}% complete</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 dark:bg-[#151921] rounded-full overflow-hidden">
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
                                className="flex items-center gap-1 px-3 py-2 text-sm font-bold text-brand-accent hover:bg-brand-accent/5 rounded-xl transition-all border border-transparent hover:border-brand-accent/30"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                BACK
                            </button>
                        )}
                        <button
                            onClick={onNext}
                            className="flex items-center gap-1 px-4 py-2 text-sm font-bold bg-brand-accent text-white rounded-xl hover:bg-brand-accent/90 transition-all active:scale-[0.98] shadow-layered-sm tracking-tight"
                        >
                            {isLastStep ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    DONE
                                </>
                            ) : (
                                <>
                                    NEXT
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

export default TourProvider;
