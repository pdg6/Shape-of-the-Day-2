import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Props for the MiniCalendar component.
 * @property selectedDate - The currently selected date string (ISO format: YYYY-MM-DD).
 * @property onSelectDate - Callback function triggered when a date is selected.
 */
interface MiniCalendarProps {
    selectedDate: string;
    onSelectDate: (date: string) => void;
}

/**
 * MiniCalendar Component
 * 
 * A horizontal scrolling calendar strip that allows students to select a date.
 * It centers around "today" and allows dragging to scroll.
 */
const MiniCalendar: React.FC<MiniCalendarProps> = ({ selectedDate, onSelectDate }) => {
    // Ref to the scrollable container DOM element
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    // State for drag-to-scroll functionality
    const [isDragging, setIsDragging] = React.useState(false);
    const [startX, setStartX] = React.useState(0);
    const [scrollLeft, setScrollLeft] = React.useState(0);

    // Generate an array of Date objects centered around today (e.g., -3 to +10 days)
    // Memoized to prevent recalculation on every render
    const days = React.useMemo(() => {
        const result: Date[] = [];
        const today = new Date();
        // Start 3 days ago to center today in the view
        for (let i = -3; i < 11; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            result.push(date);
        }
        return result;
    }, []);

    /**
     * Helper to format a Date object into useful parts for display.
     */
    const formatDate = (date: Date) => {
        return {
            day: date.toLocaleDateString('en-US', { weekday: 'short' }), // e.g., "Mon"
            date: date.getDate(), // e.g., 23
            full: date.toISOString().split('T')[0] ?? '', // e.g., "2023-10-23"
            isToday: new Date().toDateString() === date.toDateString()
        };
    };

    /**
     * Programmatically scrolls the container left or right.
     */
    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 200;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // --- Drag-to-Scroll Handlers ---

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div className="card-base p-4 mb-6 transition-colors">
            <div className="flex items-center justify-between mb-4 px-7">
                <h2 className="text-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                    {new Date().toLocaleString('default', { month: 'long' })} Schedule
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => scroll('left')}
                        className="p-3 hover:bg-brand-light dark:hover:bg-brand-dark rounded-full text-brand-textDarkSecondary dark:text-brand-textSecondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Previous Month"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="p-3 hover:bg-brand-light dark:hover:bg-brand-dark rounded-full text-brand-textDarkSecondary dark:text-brand-textSecondary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Next Month"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className="flex gap-3 overflow-x-auto pb-4 pt-2 px-1 scrollbar-hide cursor-grab active:cursor-grabbing select-none"
            >
                {days.map((d) => {
                    const { day, date, full, isToday } = formatDate(d);
                    const isSelected = selectedDate === full;

                    return (
                        <button
                            key={full}
                            onClick={() => {
                                // Only select if we weren't dragging
                                if (!isDragging) onSelectDate(full);
                            }}
                            className={`
                flex flex-col items-center justify-center min-w-[4.5rem] min-h-[5rem] flex-1 p-3 rounded-lg border-2 transition-all duration-200 outline-none
                focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20
                ${isSelected
                                    ? 'bg-brand-lightSurface dark:bg-brand-darkSurface border-brand-accent shadow-sm scale-105 z-10'
                                    : 'bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkSecondary dark:text-brand-textSecondary border-transparent hover:border-gray-400 dark:hover:border-gray-500'}
              `}
                        >
                            <span className={`text-xs font-medium mb-1 text-brand-textDarkSecondary dark:text-brand-textSecondary ${isToday ? 'underline decoration-brand-accent decoration-2 underline-offset-4' : ''}`}>
                                {day}
                            </span>
                            <span className="text-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                {date}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MiniCalendar;
