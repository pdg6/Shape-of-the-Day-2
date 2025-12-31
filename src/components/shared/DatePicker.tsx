import { useState, useRef, useEffect, useCallback } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { format, parse, isValid } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import 'react-day-picker/style.css';

// --- Types ---

interface DatePickerProps {
    value?: string; // ISO date string: YYYY-MM-DD
    selected?: Date | null; // Compatibility with react-datepicker props
    onChange: (value: any) => void; // Handles both Date and string back
    onClose?: () => void; // Called when picker closes (for chaining)
    placeholder?: string;
    label?: string;
    minDate?: string;
    maxDate?: string;
    disabled?: boolean;
    className?: string;
    iconOnly?: boolean; // When true, shows just a calendar icon button
    iconColor?: string; // Color for the icon when iconOnly is true
    customInput?: React.ReactNode; // Custom trigger element
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
    selected,
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
    customInput,
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const nativeInputRef = useRef<HTMLInputElement>(null);

    // Support both value (string) and selected (Date)
    const effectiveDate = selected || (value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined);
    const isValidDate = effectiveDate && isValid(effectiveDate);

    // Parse min/max dates
    const minDateObj = minDate ? parse(minDate, 'yyyy-MM-dd', new Date()) : undefined;
    const maxDateObj = maxDate ? parse(maxDate, 'yyyy-MM-dd', new Date()) : undefined;

    // Format for display
    const displayValue = isValidDate
        ? format(effectiveDate, 'MMM d, yyyy')
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
            onChange(date);
            setIsOpen(false);
            onClose?.();
        }
    };

    // Handle "Today" button
    const handleToday = () => {
        onChange(new Date());
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
                value={value || (selected ? format(selected, 'yyyy-MM-dd') : '')}
                onChange={handleNativeChange}
                min={minDate}
                max={maxDate}
                className="sr-only"
                tabIndex={-1}
            />

            {/* Trigger Button */}
            {customInput ? (
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={toggleOpen}
                    disabled={disabled}
                    className="focus:outline-none"
                    aria-haspopup="grid"
                    aria-expanded={isOpen}
                >
                    {customInput}
                </button>
            ) : iconOnly ? (
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={toggleOpen}
                    disabled={disabled}
                    className={`
                        cursor-pointer p-1.5 rounded-xl transition-float button-lift-dynamic
                        hover:bg-[var(--color-bg-tile-hover)] border border-transparent 
                        hover:border-[var(--color-border-subtle)] focus:outline-none 
                        shadow-layered-sm hover:shadow-layered
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
                        pl-9 pr-8 py-2.5 rounded-xl text-sm font-bold text-left transition-float button-lift-dynamic
                        border shadow-layered
                        bg-[var(--color-bg-tile)] border-[var(--color-border-subtle)]
                        hover:bg-[var(--color-bg-tile-hover)]
                        hover:border-[var(--color-border-strong)]
                        focus:outline-none focus:border-brand-accent/50
                        disabled:opacity-50 disabled:cursor-not-allowed tracking-tight
                        ${isValidDate ? 'text-brand-textPrimary' : 'text-brand-textMuted'}
                    `}
                >
                    {/* Calendar Icon */}
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textMuted pointer-events-none">
                        <CalendarIcon size={14} />
                    </span>

                    {/* Display Value */}
                    <span className="block truncate">
                        {label && !isValidDate ? label : ''}
                        {displayValue || (!label ? placeholder : '')}
                    </span>

                    {/* Clear Button */}
                    {isValidDate && !disabled && (
                        <span
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-textMuted hover:text-brand-textPrimary cursor-pointer"
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
                    className="fixed z-[9999] bg-[var(--color-bg-tile)] border border-[var(--color-border-subtle)] rounded-2xl shadow-layered-lg p-3 animate-fade-in"
                    style={{
                        top: position.top,
                        left: position.left,
                        backdropFilter: 'blur(var(--tile-blur, 0px))',
                        WebkitBackdropFilter: 'blur(var(--tile-blur, 0px))',
                    }}
                >
                    {/* Today Button */}
                    <div className="flex justify-between items-center mb-2 pb-2 border-b border-[var(--color-border-subtle)]">
                        <button
                            type="button"
                            onClick={handleToday}
                            className="text-xs font-bold text-brand-accent hover:opacity-80 transition-opacity"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                onClose?.();
                            }}
                            className="text-brand-textMuted hover:text-brand-textPrimary transition-colors"
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
                            disabled: 'text-brand-textMuted opacity-20 cursor-not-allowed',
                            outside: 'text-brand-textMuted opacity-40',
                            chevron: 'fill-brand-textSecondary',
                        }}
                    />
                </div>,
                document.body
            )}
        </div>
    );
}

export default DatePicker;
