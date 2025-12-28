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
                    p-2 rounded-xl text-gray-500 hover:text-brand-accent hover:bg-slate-100 
                    dark:hover:bg-[#151921] transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/5
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
                <div className="absolute right-0 mt-3 w-48 bg-brand-lightSurface dark:bg-[#1a1d24] rounded-2xl shadow-layered-lg border border-slate-200 dark:border-white/5 py-2 z-50">
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
