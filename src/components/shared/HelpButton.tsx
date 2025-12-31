import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useTour } from '../../context/tour-context';

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
                    p-2 rounded-xl text-brand-textMuted hover:text-brand-accent hover:bg-tile-alt 
                    transition-float border border-transparent hover:border-border-subtle button-lift-dynamic
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
                <div className="absolute right-0 mt-3 w-56 bg-tile rounded-2xl shadow-layered-lg border border-border-subtle py-2.5 z-tooltip animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                        onClick={() => { startTour('teacher-welcome'); setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-brand-textSecondary hover:bg-tile-hover hover:text-brand-textPrimary transition-colors"
                    >
                        Take the Tour
                    </button>
                    <button
                        onClick={() => { /* Open docs */ setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-brand-textSecondary hover:bg-tile-hover hover:text-brand-textPrimary transition-colors"
                    >
                        View Documentation
                    </button>
                    <button
                        onClick={() => { /* Open shortcuts */ setShowMenu(false); }}
                        className="w-full px-4 py-2 text-left text-[10px] font-black uppercase tracking-widest text-brand-textMuted hover:bg-tile-hover hover:text-brand-textSecondary transition-colors"
                    >
                        Keyboard Shortcuts
                    </button>
                </div>
            )}
        </div>
    );
};
