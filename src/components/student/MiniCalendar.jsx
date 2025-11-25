import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MiniCalendar = ({ selectedDate, onSelectDate }) => {
    const scrollContainerRef = React.useRef(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [startX, setStartX] = React.useState(0);
    const [scrollLeft, setScrollLeft] = React.useState(0);

    // Generate dates centered around today (e.g., -3 to +10 days)
    const days = React.useMemo(() => {
        const result = [];
        const today = new Date();
        // Start 3 days ago to center today in the view
        for (let i = -3; i < 11; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            result.push(date);
        }
        return result;
    }, []);

    const formatDate = (date) => {
        return {
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            date: date.getDate(),
            full: date.toISOString().split('T')[0],
            isToday: new Date().toDateString() === date.toDateString()
        };
    };

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = 200;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const handleMouseDown = (e) => {
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

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    return (
        <div className="bg-brand-lightSurface dark:bg-brand-darkSurface p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 transition-colors">
            <div className="flex items-center justify-between mb-4 px-7">
                <h2 className="text-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                    {new Date().toLocaleString('default', { month: 'long' })} Schedule
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => scroll('left')}
                        className="p-1 hover:bg-brand-light dark:hover:bg-brand-dark rounded-full text-brand-textDarkSecondary dark:text-brand-textSecondary transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="p-1 hover:bg-brand-light dark:hover:bg-brand-dark rounded-full text-brand-textDarkSecondary dark:text-brand-textSecondary transition-colors"
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
                                if (!isDragging) onSelectDate(full);
                            }}
                            className={`
                flex flex-col items-center justify-center min-w-[4.5rem] flex-1 p-3 rounded-xl border-2 transition-all duration-200 outline-none
                focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/50
                ${isSelected
                                    ? 'bg-brand-lightSurface dark:bg-brand-darkSurface border-emerald-500 shadow-sm scale-105 z-10'
                                    : 'bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkSecondary dark:text-brand-textSecondary border-transparent hover:border-gray-400 dark:hover:border-gray-500'}
              `}
                        >
                            <span className={`text-xs font-medium mb-1 text-brand-textDarkSecondary dark:text-brand-textSecondary ${isToday ? 'underline decoration-emerald-500 decoration-2 underline-offset-4' : ''}`}>
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
