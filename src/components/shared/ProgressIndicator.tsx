import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';

/**
 * Progress Indicator Components
 * 
 * Implements:
 * - Goal-Gradient Effect: Users work faster as they approach the goal
 * - Zeigarnik Effect: Incomplete tasks are remembered, progress bars motivate completion
 */

interface ProgressBarProps {
    current: number;
    total: number;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'success' | 'gradient';
    className?: string;
    animate?: boolean;
}

/**
 * Linear progress bar with percentage
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
    current,
    total,
    showLabel = true,
    size = 'md',
    variant = 'default',
    className = '',
    animate = true
}) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    const isComplete = percentage >= 100;

    const sizeClasses = {
        sm: 'h-1.5',
        md: 'h-2.5',
        lg: 'h-4'
    };

    const variantClasses = {
        default: 'bg-brand-accent',
        success: isComplete ? 'bg-status-complete' : 'bg-brand-accent',
        gradient: 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
    };

    return (
        <div className={`${className}`}>
            {showLabel && (
                <div className="flex justify-between items-center mb-1.5 px-0.5">
                    <span className="text-[10px] font-black text-brand-textMuted uppercase tracking-widest">
                        {current} of {total} complete
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isComplete ? 'text-status-complete' : 'text-brand-accent'}`}>
                        {percentage}%
                    </span>
                </div>
            )}
            <div className={`w-full bg-[var(--color-bg-tile-alt)] rounded-full overflow-hidden ${sizeClasses[size]} border border-[var(--color-border-subtle)]`}>
                <div
                    className={`
                        ${sizeClasses[size]} rounded-full
                        ${variantClasses[variant]}
                        ${animate ? 'transition-all duration-500 ease-out' : ''}
                    `}
                    style={{ width: `${percentage}%` }}
                    role="progressbar"
                    aria-valuenow={current}
                    aria-valuemin={0}
                    aria-valuemax={total}
                    aria-label={`${current} of ${total} tasks complete`}
                />
            </div>
        </div>
    );
};

/**
 * Circular progress indicator
 */
interface CircularProgressProps {
    current: number;
    total: number;
    size?: number;
    strokeWidth?: number;
    showPercentage?: boolean;
    className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
    current,
    total,
    size = 60,
    strokeWidth = 4,
    showPercentage = true,
    className = ''
}) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    const isComplete = percentage >= 100;

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg width={size} height={size} className="-rotate-90">
                {/* Background circle */}
                <circle
                    className="text-[var(--color-bg-tile-alt)]"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                {/* Progress circle */}
                <circle
                    className={`transition-all duration-500 ease-out ${isComplete ? 'text-status-complete' : 'text-brand-accent'}`}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            {showPercentage && (
                <span className={`absolute text-xs font-black ${isComplete ? 'text-status-complete' : 'text-brand-accent'}`}>
                    {percentage}%
                </span>
            )}
        </div>
    );
};

/**
 * Step progress indicator for multi-step processes
 */
interface Step {
    id: string;
    label: string;
    completed?: boolean;
}

interface StepProgressProps {
    steps: Step[];
    currentStep: number;
    className?: string;
}

export const StepProgress: React.FC<StepProgressProps> = ({
    steps,
    currentStep,
    className = ''
}) => {
    return (
        <div className={`flex items-center ${className}`}>
            {steps.map((step, index) => {
                const isCompleted = index < currentStep || step.completed;
                const isCurrent = index === currentStep;
                const isLast = index === steps.length - 1;

                return (
                    <React.Fragment key={step.id}>
                        {/* Step indicator */}
                        <div className="flex flex-col items-center">
                            <div
                                className={`
                                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                    transition-all duration-300
                                    ${isCompleted
                                        ? 'bg-status-complete text-white'
                                        : isCurrent
                                            ? 'bg-brand-accent text-white ring-4 ring-brand-accent/10'
                                            : 'bg-[var(--color-bg-tile-alt)] text-brand-textMuted border border-[var(--color-border-subtle)]'
                                    }
                                `}
                            >
                                {isCompleted ? (
                                    <CheckCircle className="w-5 h-5" />
                                ) : (
                                    index + 1
                                )}
                            </div>
                            <span className={`
                                mt-1.5 text-[10px] font-black uppercase tracking-widest
                                ${isCurrent ? 'text-brand-accent' : 'text-brand-textMuted'}
                            `}>
                                {step.label}
                            </span>
                        </div>

                        {/* Connector line */}
                        {!isLast && (
                            <div className={`
                                flex-1 h-0.5 mx-2 transition-all duration-300 rounded-full
                                ${isCompleted ? 'bg-status-complete' : 'bg-[var(--color-bg-tile-alt)] border border-[var(--color-border-subtle)]'}
                            `} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

/**
 * Task completion summary with visual indicators
 */
interface TaskSummaryProps {
    completed: number;
    total: number;
    inProgress?: number;
    stuck?: number;
    className?: string;
}

export const TaskSummary: React.FC<TaskSummaryProps> = ({
    completed,
    total,
    inProgress = 0,
    stuck = 0,
    className = ''
}) => {
    const remaining = total - completed - inProgress - stuck;
    const allComplete = completed === total && total > 0;

    return (
        <div className={`bg-[var(--color-bg-tile)] rounded-2xl p-5 border border-[var(--color-border-subtle)] shadow-layered transition-float ${className}`}>
            {/* Main progress */}
            <div className="flex items-center gap-5 mb-4">
                <CircularProgress current={completed} total={total} size={52} />
                <div>
                    <div className="text-lg font-black text-brand-textPrimary uppercase tracking-tight">
                        {allComplete ? "All Done! 🎉" : `${completed}/${total} Tasks`}
                    </div>
                    <div className="text-[10px] font-black text-brand-textMuted uppercase tracking-widest">
                        {allComplete ? "Great work today!" : `${total - completed} remaining`}
                    </div>
                </div>
            </div>

            {/* Status breakdown */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-black uppercase tracking-widest">
                {inProgress > 0 && (
                    <div className="flex items-center gap-1.5 text-status-progress">
                        <Circle className="w-2.5 h-2.5 fill-current" />
                        <span>{inProgress} active</span>
                    </div>
                )}
                {stuck > 0 && (
                    <div className="flex items-center gap-1.5 text-status-stuck">
                        <Circle className="w-2.5 h-2.5 fill-current" />
                        <span>{stuck} stuck</span>
                    </div>
                )}
                {remaining > 0 && (
                    <div className="flex items-center gap-1.5 text-brand-textMuted">
                        <Circle className="w-2.5 h-2.5 border border-current rounded-full" />
                        <span>{remaining} to do</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressBar;
