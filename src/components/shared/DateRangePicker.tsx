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
    buttonClassName?: string;
    singleDateMode?: boolean; // When true, shows only a single "Due Date" picker
    compactMode?: boolean; // When true, uses shorter date format (M/d) and reduces padding
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
    buttonClassName = '',

    compactMode = false,
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

    // Format for display - compact mode shows "MMM d → d" (e.g., "Dec 15 → 16")
    const startDisplay = isStartValid ? format(startDateObj, compactMode ? 'MMM d' : 'MMM d') : '';
    const endDisplay = isEndValid ? format(endDateObj, compactMode ? 'd' : 'MMM d') : '';

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
        if (activeField === 'start' && isStartValid && startDateObj) {
            setCalendarMonth(startDateObj);
        } else if (activeField === 'end' && isEndValid && endDateObj) {
            setCalendarMonth(endDateObj);
        } else if (activeField === 'end' && isStartValid && startDateObj) {
            setCalendarMonth(startDateObj);
        } else if (activeField) {
            setCalendarMonth(new Date());
        }
        // Use stable string values instead of Date objects to prevent infinite loops
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeField, startDate, endDate]);

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
                aria-label="Start date"
                title="Start date"
            />
            <input
                ref={endNativeRef}
                type="date"
                value={endDate}
                onChange={handleNativeEndChange}
                min={startDate || undefined}
                className="sr-only"
                tabIndex={-1}
                aria-label="End date"
                title="End date"
            />

            {/* Compact Mode: Single button showing date range */}
            {compactMode ? (
                <button
                    ref={startButtonRef}
                    type="button"
                    onClick={() => handleButtonClick('start')}
                    disabled={disabled}
                    className={`
                        cursor-pointer px-4 py-2.5 rounded-xl text-sm font-bold
                        border transition-float
                        bg-(--color-bg-tile)
                        shadow-layered
                        hover:shadow-layered-lg
                        button-lift-dynamic hover:text-brand-textPrimary hover:bg-(--color-bg-tile-hover) hover:border-brand-accent/50
                        focus:outline-none focus:border-brand-accent
                        min-h-[44px] flex items-center
                        disabled:opacity-50 disabled:cursor-not-allowed tracking-tight
                        ${activeField
                            ? 'border-brand-accent'
                            : 'border-border-subtle'}
                        ${startDate || endDate ? 'text-brand-textPrimary' : 'text-brand-textSecondary'}
                        ${buttonClassName}
                    `}
                >
                    {startDisplay && endDisplay
                        ? (startDisplay === endDisplay ? startDisplay : `${startDisplay} → ${endDisplay}`)
                        : 'Set dates'}
                </button>
            ) : (
                <>
                    {/* Start Date Button */}
                    <button
                        ref={startButtonRef}
                        type="button"
                        onClick={() => handleButtonClick('start')}
                        disabled={disabled}
                        className={`
                            group relative flex-1 cursor-pointer
                            pl-9 pr-4 py-2.5 rounded-xl text-sm font-bold text-left
                            border transition-float
                            bg-(--color-bg-tile)
                            shadow-layered
                            hover:shadow-layered-lg
                            button-lift-dynamic hover:text-brand-textPrimary hover:bg-(--color-bg-tile-hover) hover:border-brand-accent/50
                            focus:outline-none focus:border-brand-accent
                            min-h-[44px] flex items-center
                            disabled:opacity-50 disabled:cursor-not-allowed tracking-tight
                            ${activeField === 'start'
                                ? 'border-brand-accent'
                                : 'border-border-subtle'}
                            ${startDate ? 'text-brand-textPrimary' : 'text-brand-textSecondary'}
                            ${buttonClassName}
                        `}
                    >
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textSecondary pointer-events-none transition-colors group-hover:text-brand-accent">
                            <CalendarIcon size={14} />
                        </span>
                        <span className="block truncate">
                            {startDisplay || startPlaceholder}
                        </span>
                    </button>

                    {/* Arrow indicator */}
                    <div className="flex items-center text-brand-textMuted">
                        <ArrowRight size={16} />
                    </div>

                    {/* End Date Button */}
                    <button
                        ref={endButtonRef}
                        type="button"
                        onClick={() => handleButtonClick('end')}
                        disabled={disabled}
                        className={`
                            group relative flex-1 cursor-pointer
                            pl-9 pr-4 py-2.5 rounded-xl text-sm font-bold text-left
                            border transition-float
                            bg-(--color-bg-tile)
                            shadow-layered
                            hover:shadow-layered-lg
                            button-lift-dynamic hover:text-brand-textPrimary hover:bg-(--color-bg-tile-hover) hover:border-brand-accent/50
                            focus:outline-none focus:border-brand-accent
                            min-h-[44px] flex items-center
                            disabled:opacity-50 disabled:cursor-not-allowed tracking-tight
                            ${activeField === 'end'
                                ? 'border-brand-accent'
                                : 'border-border-subtle'}
                            ${endDate ? 'text-brand-textPrimary' : 'text-brand-textSecondary'}
                            ${buttonClassName}
                        `}
                    >
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textSecondary pointer-events-none transition-colors group-hover:text-brand-accent">
                            <CalendarIcon size={14} />
                        </span>
                        <span className="block truncate">
                            {endDisplay || endPlaceholder}
                        </span>
                    </button>
                </>
            )}

            {/* Portal-rendered Calendar Popover */}
            {typeof document !== 'undefined' && activeField && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed z-9999 bg-(--color-bg-tile) border border-border-subtle rounded-2xl shadow-layered-lg p-3 animate-fade-in date-range-picker-popover"
                    style={{
                        top: position.top,
                        left: position.left,
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Date range picker calendar"
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-border-subtle">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-brand-textSecondary uppercase">
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
                            className="text-brand-textSecondary hover:text-brand-textPrimary transition-colors"
                            aria-label="Close date picker"
                            title="Close date picker"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Selected Range Display */}
                    {(isStartValid || isEndValid) && (
                        <div className="flex items-center justify-center gap-2 mb-2 py-1.5 px-2 bg-tile-alt rounded-lg text-xs">
                            <span className={activeField === 'start' ? 'font-semibold text-brand-accent' : 'text-brand-textSecondary'}>
                                {startDisplay || '—'}
                            </span>
                            <ArrowRight size={12} className="text-brand-textSecondary" />
                            <span className={activeField === 'end' ? 'font-semibold text-brand-accent' : 'text-brand-textSecondary'}>
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
                            range_start: 'bg-brand-accent text-white rounded-l-xl',
                            range_end: 'bg-brand-accent text-white rounded-r-xl',
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
                            disabled: 'text-brand-textMuted opacity-20 cursor-not-allowed',
                            outside: 'text-brand-textMuted opacity-50',
                            chevron: 'fill-brand-textSecondary transition-colors hover:fill-brand-accent',
                        }}
                    />
                </div>,
                document.body
            )}
        </div>
    );
}

export default DateRangePicker;
