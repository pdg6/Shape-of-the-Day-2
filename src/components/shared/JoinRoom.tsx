import React, { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

/**
 * Props for the JoinRoom component.
 * @property onJoin - Callback function triggered when the user submits a valid code. Receives the code string.
 * @property isLoading - Optional boolean to show loading state during submission.
 */
interface JoinRoomProps {
    onJoin: (code: string) => void;
    isLoading?: boolean;
}

/**
 * JoinRoom Component
 * 
 * A form component that allows students to enter a 6-digit class code.
 * It includes validation to ensure only numbers are entered and the length is correct.
 */
const JoinRoom: React.FC<JoinRoomProps> = ({ onJoin, isLoading = false }) => {
    // State to hold the current input value
    const [code, setCode] = useState<string>('');
    // State to hold any validation error messages
    const [error, setError] = useState<string>('');

    /**
     * Handles the form submission.
     * Prevents default browser refresh, validates the code, and calls onJoin.
     */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validation: Must be exactly 6 digits and numeric
        if (code.length !== 6 || !/^\d+$/.test(code)) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        // Clear errors and submit
        setError('');
        onJoin(code);
    };

    /**
     * Handles input changes.
     * Enforces numeric input only and limits length to 6 characters.
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove any non-digit characters
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(value);

        // Clear error message as soon as user starts typing again
        if (error) setError('');
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={code}
                    onChange={handleChange}
                    placeholder="Class Code"
                    maxLength={6}
                    // Styling:
                    // tracking-[0.5em]: Spreads out the numbers for better readability
                    // font-mono: Uses monospaced font for alignment
                    className={`w-full px-4 py-2.5 text-base text-center tracking-[0.5em] font-mono rounded-lg border-2 focus:outline-none transition-all hover:border-emerald-400 
                        bg-brand-lightSurface dark:bg-brand-darkSurface dark:text-brand-textPrimary placeholder:tracking-normal placeholder:font-sans
                        ${error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200 focus:ring-emerald-500 dark:border-red-500/50'
                            : 'border-gray-200 dark:border-gray-600 focus:border-emerald-500'
                        }`}
                    disabled={isLoading}
                    enterKeyHint="go"
                />
                <button
                    type="submit"
                    // Disable if code is incomplete or currently loading
                    disabled={code.length !== 6 || isLoading}
                    className="absolute right-1.5 p-1.5 bg-brand-dark text-white rounded-md hover:bg-brand-dark/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm group"
                    title="Join Room"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <ArrowRight className="w-5 h-5 transition-all group-hover:translate-x-1 group-hover:text-emerald-300" />
                    )}
                </button>
            </div>
            {/* Error Message Display */}
            {error && (
                <p className="mt-2 text-sm text-red-500 text-center animate-in fade-in slide-in-from-top-1">
                    {error}
                </p>
            )}
        </form>
    );
};

export default JoinRoom;
