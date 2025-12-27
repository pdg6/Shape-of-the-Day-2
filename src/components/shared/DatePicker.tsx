import { useState, useRef, useEffect, useCallback } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import 'react-day-picker/style.css';

// --- Types ---

interface DatePickerProps {
    value: string; // ISO date string: YYYY-MM-DD
    onChange: (value: string) => void;
    onClose?: () => void; // Called when picker closes (for chaining)
    placeholder?: string;
    label?: string;
    minDate?: string;
    maxDate?: string;
    disabled?: boolean;
    className?: string;
    iconOnly?: boolean; // When true, shows just a calendar icon button
    iconColor?: string; // Color for the icon when iconOnly is true
}

// Detect touch device for native fallback
const isTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * DatePicker Component
 * 
 * A date picker using react-day-picker with:
 * - Portal-rendered calendar popup on desktop
 * - Native <input type="date"> on touch devices for better UX
 * - "Today" quick-select button
 * - Month navigation
 * - Escape to close, click-outside to close
 * - Keyboard accessible
 */
export function DatePicker({
    value,
    onChange,
    onClose,
    placeholder = 'Select date',
    label,
    minDate,
    maxDate,
    disabled = false,
    className = '',
    iconOnly = false,
    iconColor,
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const nativeInputRef = useRef<HTMLInputElement>(null);

    // Parse value to Date object
    const selectedDate = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
    const isValidDate = selectedDate && isValid(selectedDate);

    // Parse min/max dates
    const minDateObj = minDate ? parse(minDate, 'yyyy-MM-dd', new Date()) : undefined;
    const maxDateObj = maxDate ? parse(maxDate, 'yyyy-MM-dd', new Date()) : undefined;

    // Format for display
    const displayValue = isValidDate
        ? format(selectedDate, 'MMM d, yyyy')
        : '';

    // Update position when opening
    const updatePosition = useCallback(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const popoverHeight = 350;
            const popoverWidth = 300;

            // Check if there's room below
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceRight = window.innerWidth - rect.left;

            let top = rect.bottom + window.scrollY + 4;
            let left = rect.left + window.scrollX;

            // Position above if not enough space below
            if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
                top = rect.top + window.scrollY - popoverHeight - 4;
            }

            // Adjust left if would overflow right edge
            if (spaceRight < popoverWidth) {
                left = Math.max(8, rect.right + window.scrollX - popoverWidth);
            }

            setPosition({ top, left });
        }
    }, []);

    // Handle click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
                onClose?.();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    // Handle date selection
    const handleSelect = (date: Date | undefined) => {
        if (date) {
            onChange(format(date, 'yyyy-MM-dd'));
            setIsOpen(false);
            onClose?.();
        }
    };

    // Handle "Today" button
    const handleToday = () => {
        onChange(format(new Date(), 'yyyy-MM-dd'));
        setIsOpen(false);
        onClose?.();
    };

    // Handle clear
    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
    };

    // Toggle open state
    const toggleOpen = () => {
        if (disabled) return;

        // On touch devices, use native picker
        if (isTouchDevice() && nativeInputRef.current) {
            nativeInputRef.current.showPicker();
            return;
        }

        if (!isOpen) {
            updatePosition();
        }
        setIsOpen(!isOpen);
    };

    // Handle native input change
    const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        onClose?.();
    };

    return (
        <div className={`relative ${className}`}>
            {/* Hidden native input for touch devices */}
            <input
                ref={nativeInputRef}
                type="date"
                value={value}
                onChange={handleNativeChange}
                min={minDate}
                max={maxDate}
                className="sr-only"
                tabIndex={-1}
            />

            {/* Trigger Button */}
            {iconOnly ? (
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={toggleOpen}
                    disabled={disabled}
                    className={`
                        cursor-pointer p-1.5 rounded-xl transition-all duration-200
                        hover:bg-slate-100 dark:hover:bg-[#151921] border border-transparent hover:border-slate-200 dark:hover:border-white/5
                        focus:outline-none
                        disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                    style={{ color: iconColor }}
                >
                    <CalendarIcon size={20} />
                </button>
            ) : (
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={toggleOpen}
                    disabled={disabled}
                    className={`
                        relative w-full cursor-pointer
                        pl-9 pr-8 py-2.5 rounded-xl text-sm font-bold text-left
                        border transition-all duration-200 shadow-layered-sm
                        bg-brand-lightSurface dark:bg-[#1a1d24]
                        border-slate-200 dark:border-white/5
                        hover:bg-slate-50 dark:hover:bg-[#151921]
                        hover:border-slate-300 dark:hover:border-white/10
                        focus:outline-none focus:border-brand-accent/50 focus:ring-4 focus:ring-brand-accent/5
                        disabled:opacity-50 disabled:cursor-not-allowed tracking-tight
                        ${value ? 'text-brand-textDarkPrimary dark:text-brand-textPrimary' : 'text-gray-400 dark:text-gray-500'}
                    `}
                >
                    {/* Calendar Icon */}
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none">
                        <CalendarIcon size={14} />
                    </span>

                    {/* Display Value */}
                    <span className="block truncate">
                        {label && !value ? label : ''}
                        {displayValue || (!label ? placeholder : '')}
                    </span>

                    {/* Clear Button */}
                    {value && !disabled && (
                        <span
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                            onClick={handleClear}
                        >
                            <X size={14} />
                        </span>
                    )}
                </button>
            )}

            {/* Portal-rendered Calendar Popover */}
            {typeof document !== 'undefined' && isOpen && createPortal(
                <div
                    ref={popoverRef}
                    className="fixed z-[9999] bg-brand-lightSurface dark:bg-[#1a1d24] border border-slate-200 dark:border-white/10 rounded-2xl shadow-layered-lg p-3 animate-fade-in"
                    style={{
                        top: position.top,
                        left: position.left,
                    }}
                >
                    {/* Today Button */}
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-200 dark:border-white/5">
                        <button
                            type="button"
                            onClick={handleToday}
                            className="text-xs font-medium text-brand-accent hover:text-brand-accent/80 transition-colors"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                onClose?.();
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Calendar */}
                    <DayPicker
                        mode="single"
                        selected={isValidDate ? selectedDate : undefined}
                        onSelect={handleSelect}
                        defaultMonth={isValidDate ? selectedDate : new Date()}
                        disabled={[
                            ...(minDateObj ? [{ before: minDateObj }] : []),
                            ...(maxDateObj ? [{ after: maxDateObj }] : []),
                        ]}
                        components={{
                            Chevron: ({ orientation }) =>
                                orientation === 'left'
                                    ? <ChevronLeft size={16} />
                                    : <ChevronRight size={16} />,
                        }}
                        classNames={{
                            ...getDefaultClassNames(),
                            root: `${getDefaultClassNames().root} rdp-custom`,
                            disabled: 'text-gray-300 dark:text-white/10 cursor-not-allowed',
                            outside: 'text-gray-300 dark:text-white/10 opacity-50',
                            chevron: 'fill-gray-500 dark:fill-gray-400',
                        }}
                    />
                </div>,
                document.body
            )}
        </div>
    );
}

export default DatePicker;
