import { useState, useRef, useEffect, useCallback } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { format, parse, isValid, isBefore, startOfDay } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, ArrowRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import 'react-day-picker/style.css';

// --- Types ---

interface DateRangePickerProps {
    startDate: string; // ISO date string: YYYY-MM-DD
    endDate: string;
    onStartDateChange: (value: string) => void;
    onEndDateChange: (value: string) => void;
    startLabel?: string;
    endLabel?: string;
    startPlaceholder?: string;
    endPlaceholder?: string;
    disabled?: boolean;
    className?: string;
}

// Detect touch device for native fallback
const isTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * DateRangePicker Component
 * 
 * A paired date picker for start and end dates with:
 * - Auto-opens end date picker after selecting start date
 * - Constrains end date to be >= start date
 * - Portal-rendered calendar popup on desktop
 * - Native <input type="date"> on touch devices
 */
export function DateRangePicker({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    startLabel = 'Start:',
    endLabel = 'Due:',
    startPlaceholder = 'Start date',
    endPlaceholder = 'Due date',
    disabled = false,
    className = '',
}: DateRangePickerProps) {
    const [activeField, setActiveField] = useState<'start' | 'end' | null>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    
    const startButtonRef = useRef<HTMLButtonElement>(null);
    const endButtonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const startNativeRef = useRef<HTMLInputElement>(null);
    const endNativeRef = useRef<HTMLInputElement>(null);

    // Parse dates
    const startDateObj = startDate ? parse(startDate, 'yyyy-MM-dd', new Date()) : undefined;
    const endDateObj = endDate ? parse(endDate, 'yyyy-MM-dd', new Date()) : undefined;
    const isStartValid = startDateObj && isValid(startDateObj);
    const isEndValid = endDateObj && isValid(endDateObj);

    // Format for display
    const startDisplay = isStartValid ? format(startDateObj, 'MMM d') : '';
    const endDisplay = isEndValid ? format(endDateObj, 'MMM d') : '';

    // Update position based on active field
    const updatePosition = useCallback((field: 'start' | 'end') => {
        const buttonRef = field === 'start' ? startButtonRef : endButtonRef;
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const popoverHeight = 380;
            const popoverWidth = 300;
            
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceRight = window.innerWidth - rect.left;
            
            let top = rect.bottom + window.scrollY + 4;
            let left = rect.left + window.scrollX;
            
            if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
                top = rect.top + window.scrollY - popoverHeight - 4;
            }
            
            if (spaceRight < popoverWidth) {
                left = Math.max(8, rect.right + window.scrollX - popoverWidth);
            }
            
            setPosition({ top, left });
        }
    }, []);

    // Handle click outside and escape
    useEffect(() => {
        if (!activeField) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (
                popoverRef.current && 
                !popoverRef.current.contains(e.target as Node) &&
                !startButtonRef.current?.contains(e.target as Node) &&
                !endButtonRef.current?.contains(e.target as Node)
            ) {
                setActiveField(null);
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setActiveField(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [activeField]);

    // Set calendar month when opening
    useEffect(() => {
        if (activeField === 'start' && isStartValid) {
            setCalendarMonth(startDateObj);
        } else if (activeField === 'end' && isEndValid) {
            setCalendarMonth(endDateObj);
        } else if (activeField === 'end' && isStartValid) {
            setCalendarMonth(startDateObj);
        } else if (activeField) {
            setCalendarMonth(new Date());
        }
    }, [activeField, isStartValid, isEndValid, startDateObj, endDateObj]);

    // Handle date selection
    const handleSelect = (date: Date | undefined) => {
        if (!date) return;
        
        const dateStr = format(date, 'yyyy-MM-dd');
        
        if (activeField === 'start') {
            onStartDateChange(dateStr);
            
            // If end date is before new start date, update it
            if (isEndValid && isBefore(startOfDay(endDateObj), startOfDay(date))) {
                onEndDateChange(dateStr);
            }
            
            // Auto-open end date picker after short delay
            setTimeout(() => {
                if (isTouchDevice() && endNativeRef.current) {
                    endNativeRef.current.showPicker();
                } else {
                    updatePosition('end');
                    setActiveField('end');
                }
            }, 150);
        } else {
            onEndDateChange(dateStr);
            setActiveField(null);
        }
    };

    // Handle "Today" button
    const handleToday = () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        if (activeField === 'start') {
            onStartDateChange(today);
            // Auto-open end picker
            setTimeout(() => {
                if (isTouchDevice() && endNativeRef.current) {
                    endNativeRef.current.showPicker();
                } else {
                    updatePosition('end');
                    setActiveField('end');
                }
            }, 150);
        } else {
            onEndDateChange(today);
            setActiveField(null);
        }
    };

    // Handle button clicks
    const handleButtonClick = (field: 'start' | 'end') => {
        if (disabled) return;
        
        // On touch devices, use native picker
        if (isTouchDevice()) {
            const nativeRef = field === 'start' ? startNativeRef : endNativeRef;
            if (nativeRef.current) {
                nativeRef.current.showPicker();
            }
            return;
        }
        
        if (activeField === field) {
            setActiveField(null);
        } else {
            updatePosition(field);
            setActiveField(field);
        }
    };

    // Handle native input changes
    const handleNativeStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onStartDateChange(e.target.value);
        // Auto-trigger end date picker on mobile
        setTimeout(() => {
            if (endNativeRef.current) {
                endNativeRef.current.showPicker();
            }
        }, 100);
    };

    const handleNativeEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onEndDateChange(e.target.value);
    };

    // Disabled dates for calendar
    const getDisabledDays = () => {
        if (activeField === 'end' && isStartValid) {
            return { before: startOfDay(startDateObj) };
        }
        return undefined;
    };

    return (
        <div className={`flex gap-2 ${className}`}>
            {/* Hidden native inputs for touch devices */}
            <input
                ref={startNativeRef}
                type="date"
                value={startDate}
                onChange={handleNativeStartChange}
                className="sr-only"
                tabIndex={-1}
            />
            <input
                ref={endNativeRef}
                type="date"
                value={endDate}
                onChange={handleNativeEndChange}
                min={startDate || undefined}
                className="sr-only"
                tabIndex={-1}
            />

            {/* Start Date Button */}
            <button
                ref={startButtonRef}
                type="button"
                onClick={() => handleButtonClick('start')}
                disabled={disabled}
                className={`
                    relative flex-1 cursor-pointer
                    pl-9 pr-4 py-2.5 rounded-lg text-sm font-medium text-left
                    border-2 transition-all duration-200
                    bg-brand-lightSurface dark:bg-brand-darkSurface
                    hover:bg-gray-50 dark:hover:bg-gray-800/50
                    focus:outline-none focus:ring-2 focus:ring-brand-accent/20
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${activeField === 'start' 
                        ? 'border-brand-accent' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
                    ${startDate ? 'text-brand-textDarkPrimary dark:text-brand-textPrimary' : 'text-gray-400 dark:text-gray-500'}
                `}
            >
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                    <CalendarIcon size={14} />
                </span>
                <span className="block truncate">
                    {startDisplay || startPlaceholder}
                </span>
            </button>

            {/* Arrow indicator */}
            <div className="flex items-center text-gray-300 dark:text-gray-600">
                <ArrowRight size={16} />
            </div>

            {/* End Date Button */}
            <button
                ref={endButtonRef}
                type="button"
                onClick={() => handleButtonClick('end')}
                disabled={disabled}
                className={`
                    relative flex-1 cursor-pointer
                    pl-9 pr-4 py-2.5 rounded-lg text-sm font-medium text-left
                    border-2 transition-all duration-200
                    bg-brand-lightSurface dark:bg-brand-darkSurface
                    hover:bg-gray-50 dark:hover:bg-gray-800/50
                    focus:outline-none focus:ring-2 focus:ring-brand-accent/20
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${activeField === 'end' 
                        ? 'border-brand-accent' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}
                    ${endDate ? 'text-brand-textDarkPrimary dark:text-brand-textPrimary' : 'text-gray-400 dark:text-gray-500'}
                `}
            >
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                    <CalendarIcon size={14} />
                </span>
                <span className="block truncate">
                    {endDisplay || endPlaceholder}
                </span>
            </button>

            {/* Portal-rendered Calendar Popover */}
            {typeof document !== 'undefined' && activeField && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed z-[9999] bg-brand-lightSurface dark:bg-brand-darkSurface border-2 border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 animate-fade-in"
                    style={{
                        top: position.top,
                        left: position.left,
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-brand-textDarkSecondary dark:text-brand-textSecondary uppercase">
                                {activeField === 'start' ? startLabel : endLabel}
                            </span>
                            <button
                                type="button"
                                onClick={handleToday}
                                className="text-xs font-medium text-brand-accent hover:text-brand-accent/80 transition-colors"
                            >
                                Today
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveField(null)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Selected Range Display */}
                    {(isStartValid || isEndValid) && (
                        <div className="flex items-center justify-center gap-2 mb-2 py-1.5 px-2 bg-gray-50 dark:bg-gray-800/50 rounded text-xs">
                            <span className={activeField === 'start' ? 'font-semibold text-brand-accent' : 'text-gray-500'}>
                                {startDisplay || '—'}
                            </span>
                            <ArrowRight size={12} className="text-gray-400" />
                            <span className={activeField === 'end' ? 'font-semibold text-brand-accent' : 'text-gray-500'}>
                                {endDisplay || '—'}
                            </span>
                        </div>
                    )}

                    {/* Calendar */}
                    <DayPicker
                        mode="single"
                        selected={activeField === 'start' ? (isStartValid ? startDateObj : undefined) : (isEndValid ? endDateObj : undefined)}
                        onSelect={handleSelect}
                        month={calendarMonth}
                        onMonthChange={setCalendarMonth}
                        disabled={getDisabledDays()}
                        modifiers={{
                            range_start: isStartValid ? startDateObj : undefined,
                            range_end: isEndValid ? endDateObj : undefined,
                            in_range: isStartValid && isEndValid ? { 
                                from: startDateObj, 
                                to: endDateObj 
                            } : undefined,
                        }}
                        modifiersClassNames={{
                            range_start: 'bg-brand-accent text-white rounded-l-lg',
                            range_end: 'bg-brand-accent text-white rounded-r-lg',
                            in_range: 'bg-brand-accent/10',
                        }}
                        components={{
                            Chevron: ({ orientation }) => 
                                orientation === 'left' 
                                    ? <ChevronLeft size={16} /> 
                                    : <ChevronRight size={16} />,
                        }}
                        classNames={{
                            ...getDefaultClassNames(),
                            root: `${getDefaultClassNames().root} rdp-custom`,
                            today: 'ring-2 ring-brand-accent/20 ring-inset',
                            selected: 'bg-brand-accent text-white border-[3px] border-brand-accent',
                            disabled: 'text-gray-300 dark:text-gray-600 cursor-not-allowed',
                            outside: 'text-gray-300 dark:text-gray-600 opacity-50',
                            chevron: 'fill-gray-500 dark:fill-gray-400',
                        }}
                    />
                </div>,
                document.body
            )}
        </div>
    );
}

export default DateRangePicker;
