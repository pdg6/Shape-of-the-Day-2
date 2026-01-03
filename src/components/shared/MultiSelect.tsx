import { Fragment, useState, useMemo, useRef, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { createPortal } from 'react-dom';

// --- Types ---

export interface MultiSelectOption<T = string> {
    value: T;
    label: string;
    color?: string; // Optional color for checkmark indicator
    disabled?: boolean;
}

interface MultiSelectProps<T = string> {
    value: T[];
    onChange: (values: T[]) => void;
    options: MultiSelectOption<T>[];
    placeholder?: string;
    primaryValue?: T; // The "current" value to show prominently in button
    icon?: React.ComponentType<{ size?: number; className?: string }>;
    searchable?: boolean;
    searchThreshold?: number;
    disabled?: boolean;
    className?: string;
    buttonClassName?: string;
}

/**
 * MultiSelect Component
 * 
 * A multi-selection dropdown using Headless UI Listbox.
 * Features:
 * - Portal rendering to avoid z-index issues
 * - Optional search/filter for long lists
 * - Colored checkmarks per option
 * - Keyboard navigation
 * - Smooth animations
 */
export function MultiSelect<T extends string | number = string>({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    primaryValue,
    icon: ButtonIcon,
    searchable = false,
    searchThreshold = 5,
    disabled = false,
    className = '',
    buttonClassName = '',
}: MultiSelectProps<T>) {
    const [search, setSearch] = useState('');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const [isOpen, setIsOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Determine if search should be shown
    const showSearch = searchable || options.length > searchThreshold;

    // Filter options based on search
    const filteredOptions = useMemo(() => {
        if (!search.trim()) return options;
        const lowerSearch = search.toLowerCase();
        return options.filter(opt =>
            opt.label.toLowerCase().includes(lowerSearch)
        );
    }, [options, search]);

    // Get the primary selected option (for display in button)
    const primaryOption = useMemo(() => {
        // If primaryValue is set and it's in the selection, use that
        if (primaryValue && value.includes(primaryValue)) {
            return options.find(o => o.value === primaryValue);
        }
        // Otherwise show the first selected item
        if (value.length > 0) {
            return options.find(o => o.value === value[0]);
        }
        return null;
    }, [value, primaryValue, options]);

    // Get display text for button
    const getDisplayText = () => {
        if (value.length === 0) return placeholder;
        if (primaryOption) return primaryOption.label;
        return placeholder;
    };

    // Update dropdown position when button is clicked (popup above)
    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Estimate dropdown height for positioning above
            const estimatedHeight = Math.min(options.length * 44 + 16, 300);
            setDropdownPosition({
                top: rect.top - estimatedHeight - 4, // Position above the button
                left: rect.left + window.scrollX,
                width: Math.max(rect.width, 200), // Minimum width for readability
            });
        }
    };

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && showSearch && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
        if (!isOpen) {
            setSearch('');
        }
    }, [isOpen, showSearch]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen]);

    // Handle click outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            // Check if click is outside button and dropdown
            if (buttonRef.current && !buttonRef.current.contains(target)) {
                // The dropdown is portaled, so we need to check by class or position
                const dropdown = document.querySelector('[data-multiselect-dropdown]');
                if (!dropdown?.contains(target)) {
                    setIsOpen(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleToggle = (optionValue: T) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue];
        onChange(newValue);
    };

    return (
        <div className={`relative ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => {
                    updatePosition();
                    setIsOpen(!isOpen);
                }}
                disabled={disabled}
                className={`
                    group relative w-full cursor-pointer
                    pl-10 pr-8 py-2.5 rounded-xl text-sm font-bold
                    border transition-float
                    bg-(--color-bg-tile) text-brand-textSecondary
                    shadow-layered
                    hover:shadow-layered-lg
                    button-lift-dynamic hover:text-brand-textPrimary hover:bg-(--color-bg-tile-hover) hover:border-brand-accent/50
                    focus:outline-none focus:border-brand-accent
                    disabled:opacity-50 disabled:cursor-not-allowed
                    border-border-subtle
                    min-h-[44px] flex items-center
                    ${value.length > 0 ? 'text-brand-textPrimary' : 'text-brand-textSecondary'}
                    ${buttonClassName}
                `}
            >
                {/* Left Icon or Checkmark */}
                {ButtonIcon ? (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-textSecondary transition-colors group-hover:text-brand-accent">
                        <ButtonIcon size={18} />
                    </span>
                ) : value.length > 0 && primaryOption ? (
                    <span
                        className="absolute left-3 top-1/2 -translate-y-1/2"
                        style={{ color: primaryOption.color || 'var(--color-brand-accent)' }}
                    >
                        <Check size={16} strokeWidth={3} />
                    </span>
                ) : (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-dashed border-border-subtle rounded" />
                )}

                {/* Display Text */}
                <span className="block truncate text-left">
                    {getDisplayText()}
                </span>

                {/* Chevron (points up since dropdown opens upward) */}
                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-textSecondary transition-colors group-hover:text-brand-accent">
                    <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${isOpen ? '' : 'rotate-180'}`}
                    />
                </span>
            </button>

            {/* Portal-rendered dropdown */}
            {typeof document !== 'undefined' && isOpen && createPortal(
                <Transition
                    show={isOpen}
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                >
                    <div
                        data-multiselect-dropdown
                        className="fixed z-9999 overflow-hidden rounded-lg border border-border-subtle bg-(--color-bg-tile) shadow-layered focus:outline-none multi-select-dropdown"
                        style={{
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            width: dropdownPosition.width,
                            maxHeight: '300px',
                        }}
                    >
                        {/* Search Input */}
                        {showSearch && (
                            <div className="p-2 border-b border-border-subtle sticky top-0 bg-(--color-bg-tile)">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-textSecondary" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search..."
                                        className="w-full pl-8 pr-8 py-1.5 text-sm rounded-xl border border-border-subtle bg-tile-alt text-brand-textPrimary placeholder-brand-textSecondary focus:outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all"
                                        onClick={e => e.stopPropagation()}
                                        onKeyDown={e => e.stopPropagation()}
                                    />
                                    {search && (
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                setSearch('');
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-textSecondary hover:text-brand-textPrimary"
                                            aria-label="Clear search"
                                            title="Clear search"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Options List */}
                        <div className="overflow-y-auto max-h-[240px]">
                            {filteredOptions.map(option => {
                                const isSelected = value.includes(option.value);
                                return (
                                    <button
                                        key={String(option.value)}
                                        type="button"
                                        disabled={option.disabled}
                                        onClick={() => handleToggle(option.value)}
                                        className={`
                                            relative w-full cursor-pointer select-none py-2.5 pl-10 pr-4 text-sm text-left
                                            hover:bg-(--color-bg-tile-hover)
                                            ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                                            text-brand-textPrimary
                                        `}
                                    >
                                        {/* Colored checkmark when selected */}
                                        <span
                                            className={`absolute left-3 top-1/2 -translate-y-1/2 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                                            style={{ color: option.color || 'var(--color-brand-accent)' }}
                                        >
                                            <Check size={16} strokeWidth={3} />
                                        </span>

                                        {/* Unselected indicator */}
                                        {!isSelected && (
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2">
                                                <span
                                                    className="block w-4 h-4 rounded border-2 border-border-subtle"
                                                    style={{ borderColor: option.color ? `${option.color}40` : undefined }}
                                                />
                                            </span>
                                        )}

                                        <span className={`block truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>
                                            {option.label}
                                        </span>
                                    </button>
                                );
                            })}

                            {/* No results message */}
                            {filteredOptions.length === 0 && (
                                <div className="py-4 px-4 text-sm text-brand-textSecondary text-center italic">
                                    No options found
                                </div>
                            )}
                        </div>
                    </div>
                </Transition>,
                document.body
            )}
        </div>
    );
}

export default MultiSelect;
