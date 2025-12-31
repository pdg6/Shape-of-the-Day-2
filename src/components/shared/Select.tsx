import { Fragment, useState, useMemo, useRef, useEffect } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { createPortal } from 'react-dom';

// --- Types ---

export interface SelectOption<T = string> {
    value: T;
    label: string;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
    iconColor?: string;
    disabled?: boolean;
}

interface SelectProps<T = string> {
    value: T | null;
    onChange: (value: T | null) => void;
    options: SelectOption<T>[];
    placeholder?: string;
    icon?: React.ComponentType<{ size?: number; className?: string }>;
    iconColor?: string;
    nullable?: boolean;
    searchable?: boolean;
    searchThreshold?: number; // Show search when options > this number
    disabled?: boolean;
    className?: string;
    buttonClassName?: string;
    // For colored borders/text based on selection
    colorClasses?: string;
    iconSize?: number;
    hideText?: boolean;
    hideChevron?: boolean;
    dropUp?: boolean; // Open dropdown above the button instead of below
}

/**
 * Select Component
 * 
 * A fully accessible dropdown using Headless UI Listbox.
 * Features:
 * - Portal rendering to avoid z-index issues
 * - Optional search/filter for long lists
 * - Custom icons per option with color support
 * - Keyboard navigation (arrows, escape, enter, type-to-search)
 * - Smooth animations via Transition
 * - Nullable support for optional fields
 */
export function Select<T extends string | number = string>({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    icon: ButtonIcon,
    iconColor,
    nullable = false,
    searchable = false,
    searchThreshold = 5,
    disabled = false,
    className = '',
    buttonClassName = '',
    colorClasses = '',
    iconSize = 18,
    hideText = false,
    hideChevron = false,
    dropUp = false,
}: SelectProps<T>) {
    const [search, setSearch] = useState('');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, bottom: 0 });
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

    // Get selected option
    const selectedOption = options.find(opt => opt.value === value);

    // Update dropdown position when button is clicked
    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width,
                bottom: window.innerHeight - rect.top + 4, // Distance from bottom of viewport to top of button
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

    const handleChange = (newValue: T | null) => {
        onChange(newValue);
        setIsOpen(false);
    };

    const SelectedIcon = selectedOption?.icon || ButtonIcon;
    const displayIconColor = selectedOption?.iconColor || iconColor;

    return (
        <Listbox value={value} onChange={handleChange} disabled={disabled}>
            {({ open }) => {
                // Sync internal state with Listbox open state
                if (open !== isOpen) {
                    setTimeout(() => {
                        setIsOpen(open);
                        if (open) updatePosition();
                    }, 0);
                }

                return (
                    <div className={`relative ${className}`}>
                        <Listbox.Button
                            ref={buttonRef}
                            onClick={updatePosition}
                            className={`
                                group relative w-full cursor-pointer
                                pl-10 pr-8 py-2.5 rounded-xl text-sm font-bold
                                border transition-float
                                bg-(--color-bg-tile) text-brand-textSecondary
                                shadow-layered
                                hover:shadow-layered-lg
                                button-lift-dynamic hover:text-brand-textPrimary hover:bg-(--color-bg-tile-hover) hover:border-brand-accent/50
                                focus:outline-none focus:border-brand-accent
                                min-h-[44px] flex items-center
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${colorClasses || 'border-border-subtle'}
                                ${value ? 'text-brand-textPrimary' : 'text-brand-textSecondary'}
                                ${buttonClassName}
                            `}
                        >
                            {/* Left Icon */}
                            {SelectedIcon && (
                                <span
                                    className={`absolute top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-hover:text-brand-accent ${hideText ? 'left-1/2 -translate-x-1/2' : 'left-3'}`}
                                    style={{ color: displayIconColor }}
                                >
                                    <SelectedIcon size={iconSize} />
                                </span>
                            )}

                            {/* Selected Value or Placeholder */}
                            {!hideText && (
                                <span className="block truncate text-left">
                                    {selectedOption?.label || placeholder}
                                </span>
                            )}

                            {/* Chevron */}
                            {!hideChevron && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-textSecondary transition-colors group-hover:text-brand-accent">
                                    <ChevronDown
                                        size={16}
                                        className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                                    />
                                </span>
                            )}
                        </Listbox.Button>

                        {/* Portal-rendered dropdown */}
                        {typeof document !== 'undefined' && createPortal(
                            <Transition
                                show={open}
                                as={Fragment}
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <Listbox.Options
                                    static
                                    className="fixed z-9999 overflow-hidden rounded-lg border border-border-subtle bg-(--color-bg-tile) shadow-layered focus:outline-none select-dropdown"
                                    style={{
                                        ...(dropUp
                                            ? { bottom: dropdownPosition.bottom }
                                            : { top: dropdownPosition.top }
                                        ),
                                        left: dropdownPosition.left,
                                        minWidth: Math.max(dropdownPosition.width, 200),
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
                                        {/* Nullable "None" option */}
                                        {nullable && (
                                            <Listbox.Option
                                                value={null}
                                                className={({ active }) => `
                                                    relative cursor-pointer select-none py-2.5 pl-10 pr-4 text-sm
                                                    ${active ? 'bg-(--color-bg-tile-hover)' : ''}
                                                    text-brand-textSecondary italic
                                                `}
                                            >
                                                {({ selected }) => (
                                                    <>
                                                        <span className="block truncate">None</span>
                                                        {selected && (
                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-accent">
                                                                <Check size={16} />
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </Listbox.Option>
                                        )}

                                        {/* Filtered Options */}
                                        {filteredOptions.map(option => {
                                            const OptionIcon = option.icon;
                                            return (
                                                <Listbox.Option
                                                    key={String(option.value)}
                                                    value={option.value}
                                                    disabled={option.disabled}
                                                    className={({ active, disabled: optDisabled }) => `
                                                        relative cursor-pointer select-none py-2.5 pl-10 pr-4 text-sm
                                                    ${active ? 'bg-(--color-bg-tile-hover)' : ''}
                                                    ${optDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                                                    text-brand-textPrimary
                                                `}
                                                >
                                                    {({ selected }) => (
                                                        <>
                                                            {/* Option Icon */}
                                                            {OptionIcon && (
                                                                <span
                                                                    className="absolute left-3 top-1/2 -translate-y-1/2"
                                                                    style={{ color: option.iconColor }}
                                                                >
                                                                    <OptionIcon size={16} />
                                                                </span>
                                                            )}

                                                            {/* Check mark for selected (when no icon) */}
                                                            {selected && !OptionIcon && (
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-accent">
                                                                    <Check size={16} />
                                                                </span>
                                                            )}

                                                            <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                                                                {option.label}
                                                            </span>

                                                            {/* Selected indicator on right when has icon */}
                                                            {selected && OptionIcon && (
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-accent">
                                                                    <Check size={14} />
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </Listbox.Option>
                                            );
                                        })}

                                        {/* No results message */}
                                        {filteredOptions.length === 0 && (
                                            <div className="py-4 px-4 text-sm text-brand-textSecondary text-center italic">
                                                No options found
                                            </div>
                                        )}
                                    </div>
                                </Listbox.Options>
                            </Transition>,
                            document.body
                        )}
                    </div>
                );
            }}
        </Listbox>
    );
}

export default Select;
