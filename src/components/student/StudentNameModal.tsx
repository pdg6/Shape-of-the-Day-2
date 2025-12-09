import React, { useState } from 'react';
import { GraduationCap, X } from 'lucide-react';
import { sanitizeName, validateName } from '../../utils/security';

/**
 * Props for the StudentNameModal component.
 * @property onSubmit - Callback function called when the user submits a valid name.
 * @property initialName - Optional initial value for the name input.
 * @property onClose - Optional callback to close the modal (e.g., via the X button or background click).
 */
interface StudentNameModalProps {
    onSubmit: (name: string) => void;
    initialName?: string;
    onClose?: () => void;
}

/**
 * StudentNameModal Component
 * 
 * A modal dialog that prompts the student to enter their name before joining a class.
 * It includes validation to ensure the name is not empty and is within a reasonable length.
 */
const StudentNameModal: React.FC<StudentNameModalProps> = ({ onSubmit, initialName = '', onClose }) => {
    // State for the name input field
    const [name, setName] = useState<string>(initialName);
    // State for validation error messages
    const [error, setError] = useState<string>('');

    /**
     * Handles form submission.
     * Validates that the name is not empty, letters only, and within length limits.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Stop propagation to prevent clicks from bubbling up to the background (which might close the modal)
        e.stopPropagation();

        const sanitized = sanitizeName(name);
        const validation = validateName(sanitized);

        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        onSubmit(sanitized);
    };

    /**
     * Handles input changes.
     * Sanitizes input to letters only, enforces max 12 characters.
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Sanitize as user types - only letters and spaces allowed
        const sanitized = sanitizeName(e.target.value);
        setName(sanitized);
        // Clear error message when user starts typing
        if (error) setError('');
    };

    return (
        <div
            className="fixed inset-0 bg-[#141211] flex items-center justify-center z-overlay p-4 transition-all duration-300 dark"
            onClick={onClose}
        >
            <div
                className="bg-brand-darkSurface dark:bg-brand-darkSurface rounded-xl shadow-2xl w-full max-w-md p-8 transition-all duration-300 border-2 border-gray-200 dark:border-gray-700 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button (only shown if onClose prop is provided) */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}

                <div className="text-center mb-8">
                    <GraduationCap className="w-16 h-16 text-brand-accent mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary tracking-tight">What is your name?</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative group">
                        <input
                            type="text"
                            value={name}
                            onChange={handleChange}
                            placeholder="Your Name (letters only)"
                            maxLength={12}
                            autoComplete="off"
                            spellCheck={false}
                            className={`
                                input-base input-focus text-lg text-center tracking-[0.5em] rounded-lg
                                placeholder:tracking-normal placeholder:font-sans
                                ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-500/50' : ''}
                            `}
                            autoFocus
                            enterKeyHint="go"
                        />
                        <div className="flex justify-between mt-3 px-2">
                            <span className="text-sm text-red-500 min-h-[1.25rem] font-medium">{error}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!validateName(sanitizeName(name)).valid}
                        onClick={(e) => e.stopPropagation()}
                        className="btn-primary-green text-lg"
                    >
                        Join Class
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StudentNameModal;
