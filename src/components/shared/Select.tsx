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
}: SelectProps<T>) {
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
                                relative w-full cursor-pointer
                                pl-10 pr-8 py-2.5 rounded-xl text-sm font-medium
                                border-2 transition-all duration-200
                                bg-brand-lightSurface dark:bg-brand-darkSurface
                                hover:border-gray-300 dark:hover:border-gray-600
                                focus:outline-none focus:ring-2 focus:ring-brand-accent/20
                                disabled:opacity-50 disabled:cursor-not-allowed
                                ${colorClasses || 'border-gray-200 dark:border-gray-700'}
                                ${value ? 'text-brand-textDarkPrimary dark:text-brand-textPrimary' : 'text-gray-400 dark:text-gray-500'}
                                ${buttonClassName}
                            `}
                        >
                            {/* Left Icon */}
                            {SelectedIcon && (
                                <span
                                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: displayIconColor }}
                                >
                                    <SelectedIcon size={18} />
                                </span>
                            )}

                            {/* Selected Value or Placeholder */}
                            <span className="block truncate text-left">
                                {selectedOption?.label || placeholder}
                            </span>

                            {/* Chevron */}
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <ChevronDown
                                    size={16}
                                    className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                                />
                            </span>
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
                                    className="fixed z-[9999] overflow-hidden rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-brand-lightSurface dark:bg-brand-darkSurface shadow-lg focus:outline-none"
                                    style={{
                                        top: dropdownPosition.top,
                                        left: dropdownPosition.left,
                                        width: dropdownPosition.width,
                                        maxHeight: '300px',
                                    }}
                                >
                                    {/* Search Input */}
                                    {showSearch && (
                                        <div className="p-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-brand-lightSurface dark:bg-brand-darkSurface">
                                            <div className="relative">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    value={search}
                                                    onChange={e => setSearch(e.target.value)}
                                                    placeholder="Search..."
                                                    className="w-full pl-8 pr-8 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-brand-textDarkPrimary dark:text-brand-textPrimary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-accent/30"
                                                    onClick={e => e.stopPropagation()}
                                                    onKeyDown={e => e.stopPropagation()}
                                                />
                                                {search && (
                                                    <button
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setSearch('');
                                                        }}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
                                                    ${active ? 'bg-gray-100 dark:bg-gray-800' : ''}
                                                    text-gray-400 dark:text-gray-500 italic
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
                                                        ${active ? 'bg-gray-100 dark:bg-gray-800' : ''}
                                                        ${optDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                                                        text-brand-textDarkPrimary dark:text-brand-textPrimary
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
                                            <div className="py-4 px-4 text-sm text-gray-400 dark:text-gray-500 text-center italic">
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
