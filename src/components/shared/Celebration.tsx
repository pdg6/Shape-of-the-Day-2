import React, { useEffect, useState } from 'react';
import { Sparkles, PartyPopper, Star, Trophy } from 'lucide-react';

/**
 * Celebration Components
 * 
 * Implements the Peak-End Rule: People judge experiences by their peak and end moments.
 * Delightful celebrations when students complete tasks create positive lasting impressions.
 */

interface ConfettiPiece {
    id: number;
    x: number;
    color: string;
    delay: number;
    duration: number;
    size: number;
}

/**
 * Confetti animation component
 */
export const Confetti: React.FC<{ active: boolean; duration?: number }> = ({
    active,
    duration = 3000
}) => {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    const colors = [
        '#10B981', // Emerald
        '#3B82F6', // Blue  
        '#F59E0B', // Amber
        '#EF4444', // Red
        '#8B5CF6', // Purple
        '#EC4899', // Pink
    ];

    useEffect(() => {
        if (active) {
            setIsVisible(true);
            // Generate confetti pieces
            const newPieces: ConfettiPiece[] = Array.from({ length: 50 }).map((_, i) => ({
                id: i,
                x: Math.random() * 100,
                color: colors[Math.floor(Math.random() * colors.length)]!,
                delay: Math.random() * 500,
                duration: 2000 + Math.random() * 1000,
                size: 6 + Math.random() * 8,
            }));
            setPieces(newPieces);

            // Clean up after animation
            const timer = setTimeout(() => {
                setIsVisible(false);
                setPieces([]);
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [active, duration]);

    if (!isVisible || pieces.length === 0) return null;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[2000] overflow-hidden"
            aria-hidden="true"
        >
            {pieces.map(piece => (
                <div
                    key={piece.id}
                    className="absolute animate-confetti-fall"
                    style={{
                        left: `${piece.x}%`,
                        top: '-20px',
                        width: piece.size,
                        height: piece.size,
                        backgroundColor: piece.color,
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                        animationDelay: `${piece.delay}ms`,
                        animationDuration: `${piece.duration}ms`,
                        transform: `rotate(${Math.random() * 360}deg)`,
                    }}
                />
            ))}
        </div>
    );
};

/**
 * Celebration modal for task completion milestones
 */
interface CelebrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'task-complete' | 'all-tasks' | 'streak' | 'milestone';
    message?: string;
    subMessage?: string;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
    isOpen,
    onClose,
    type,
    message,
    subMessage
}) => {
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowConfetti(true);
            // Auto-close after 3 seconds for non-milestone celebrations
            if (type !== 'milestone') {
                const timer = setTimeout(onClose, 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [isOpen, type, onClose]);

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'all-tasks': return <Trophy className="w-16 h-16 text-yellow-500" />;
            case 'streak': return <Star className="w-16 h-16 text-yellow-500" />;
            case 'milestone': return <PartyPopper className="w-16 h-16 text-purple-500" />;
            default: return <Sparkles className="w-16 h-16 text-brand-accent" />;
        }
    };

    const getDefaultMessage = () => {
        switch (type) {
            case 'all-tasks': return "All Tasks Complete! 🎉";
            case 'streak': return "You're on Fire! 🔥";
            case 'milestone': return "Achievement Unlocked!";
            default: return "Great Job! ✨";
        }
    };

    const getDefaultSubMessage = () => {
        switch (type) {
            case 'all-tasks': return "You've finished everything for today. Amazing work!";
            case 'streak': return "Keep up the incredible momentum!";
            case 'milestone': return "You've reached a new milestone!";
            default: return "One step closer to your goal!";
        }
    };

    return (
        <>
            <Confetti active={showConfetti} />
            <div
                className="fixed inset-0 z-[1500] flex items-center justify-center p-4"
                onClick={type === 'milestone' ? undefined : onClose}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

                {/* Modal */}
                <div
                    className="relative bg-brand-lightSurface dark:bg-[#1a1d24] rounded-2xl border border-slate-200 dark:border-white/5 shadow-layered-lg p-8 text-center max-w-sm w-full animate-celebration-pop"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Animated icon */}
                    <div className="mb-4 animate-bounce-gentle">
                        {getIcon()}
                    </div>

                    {/* Message */}
                    <h2 className="text-2xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary mb-2">
                        {message || getDefaultMessage()}
                    </h2>
                    <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">
                        {subMessage || getDefaultSubMessage()}
                    </p>

                    {/* Close button for milestone type */}
                    {type === 'milestone' && (
                        <button
                            onClick={onClose}
                            className="mt-6 px-6 py-2 bg-brand-accent text-white font-bold rounded-xl hover:bg-brand-accent/90 transition-all active:scale-[0.98] shadow-layered-sm tracking-tight"
                        >
                            AWESOME!
                        </button>
                    )}

                    {/* Auto-close indicator for other types */}
                    {type !== 'milestone' && (
                        <div className="mt-4 text-xs text-gray-400">
                            Tap anywhere to continue
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

/**
 * Inline success animation for individual task completion
 */
export const TaskCompleteAnimation: React.FC<{ show: boolean }> = ({ show }) => {
    if (!show) return null;

    return (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="animate-ping-once">
                <Sparkles className="w-8 h-8 text-brand-accent" />
            </div>
        </div>
    );
};

/**
 * Progress celebration - shows micro-celebrations at progress milestones
 */
interface ProgressCelebrationProps {
    progress: number; // 0-100
    previousProgress: number;
}

export const ProgressCelebration: React.FC<ProgressCelebrationProps> = ({
    progress,
    previousProgress
}) => {
    const [showCelebration, setShowCelebration] = useState(false);
    const [milestoneType, setMilestoneType] = useState<'25' | '50' | '75' | '100' | null>(null);

    useEffect(() => {
        // Check for milestone crossings
        const milestones = [25, 50, 75, 100];

        for (const milestone of milestones) {
            if (previousProgress < milestone && progress >= milestone) {
                setMilestoneType(milestone.toString() as '25' | '50' | '75' | '100');
                setShowCelebration(true);

                const timer = setTimeout(() => {
                    setShowCelebration(false);
                    setMilestoneType(null);
                }, 2000);

                return () => clearTimeout(timer);
            }
        }
    }, [progress, previousProgress]);

    if (!showCelebration || !milestoneType) return null;

    const messages: Record<string, string> = {
        '25': "Great start! 💪",
        '50': "Halfway there! 🎯",
        '75': "Almost done! 🚀",
        '100': "Complete! 🏆"
    };

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1000] animate-slide-up-fade">
            <div className="bg-brand-accent text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                <Star className="w-4 h-4" />
                {messages[milestoneType]}
            </div>
        </div>
    );
};

/**
 * CSS to add to index.css for animations
 * 
 * @keyframes confetti-fall {
 *   0% {
 *     transform: translateY(0) rotate(0deg);
 *     opacity: 1;
 *   }
 *   100% {
 *     transform: translateY(100vh) rotate(720deg);
 *     opacity: 0;
 *   }
 * }
 * 
 * @keyframes celebration-pop {
 *   0% { transform: scale(0.5); opacity: 0; }
 *   50% { transform: scale(1.1); }
 *   100% { transform: scale(1); opacity: 1; }
 * }
 * 
 * @keyframes bounce-gentle {
 *   0%, 100% { transform: translateY(0); }
 *   50% { transform: translateY(-10px); }
 * }
 * 
 * @keyframes ping-once {
 *   0% { transform: scale(1); opacity: 1; }
 *   75% { transform: scale(2); opacity: 0; }
 *   100% { transform: scale(2); opacity: 0; }
 * }
 * 
 * @keyframes slide-up-fade {
 *   0% { transform: translate(-50%, 20px); opacity: 0; }
 *   10% { transform: translate(-50%, 0); opacity: 1; }
 *   90% { transform: translate(-50%, 0); opacity: 1; }
 *   100% { transform: translate(-50%, -20px); opacity: 0; }
 * }
 * 
 * .animate-confetti-fall {
 *   animation: confetti-fall ease-out forwards;
 * }
 * 
 * .animate-celebration-pop {
 *   animation: celebration-pop 0.4s ease-out forwards;
 * }
 * 
 * .animate-bounce-gentle {
 *   animation: bounce-gentle 1s ease-in-out infinite;
 * }
 * 
 * .animate-ping-once {
 *   animation: ping-once 0.5s ease-out forwards;
 * }
 * 
 * .animate-slide-up-fade {
 *   animation: slide-up-fade 2s ease-out forwards;
 * }
 */

export default CelebrationModal;
