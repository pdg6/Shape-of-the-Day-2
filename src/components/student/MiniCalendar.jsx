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
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">Schedule</h2>
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
                flex flex-col items-center justify-center min-w-[4.5rem] flex-1 p-3 rounded-xl border-2 transition-all duration-200
                ${isSelected
                                    ? 'bg-brand-accent text-white border-brand-accent shadow-md scale-105 z-10'
                                    : 'bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkSecondary dark:text-brand-textSecondary border-transparent hover:border-brand-accent/30 hover:bg-brand-accent/5 dark:hover:bg-brand-dark'}
                ${isToday && !isSelected ? 'border-brand-accent dark:border-brand-accent text-brand-accent dark:text-brand-accent' : ''}
              `}
                        >
                            <span className={`text-xs font-medium mb-1 ${isSelected ? 'text-white/80' : isToday ? 'text-brand-accent' : 'text-brand-textDarkSecondary dark:text-brand-textSecondary'}`}>
                                {day}
                            </span>
                            <span className={`text-xl font-bold ${isSelected ? 'text-white' : isToday ? 'text-brand-accent' : 'text-brand-textDarkPrimary dark:text-brand-textPrimary'}`}>
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
