import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Interface defining the props (inputs) for the GoogleSignInButton component.
 * 
 * @property onClick - Function to call when the button is clicked.
 * @property isLoading - Optional boolean. If true, shows a loading spinner. Defaults to false.
 * @property disabled - Optional boolean. If true, the button is unclickable. Defaults to false.
 */
interface GoogleSignInButtonProps {
    onClick: () => void;
    isLoading?: boolean;
    disabled?: boolean;
}

/**
 * GoogleSignInButton Component
 * 
 * A reusable button component styled specifically for Google Sign-In.
 * It handles loading states and disabled states automatically based on props.
 * 
 * Usage:
 * <GoogleSignInButton onClick={handleLogin} isLoading={isLoggingIn} />
 */
const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
    onClick,
    isLoading = false,
    disabled = false
}) => {
    return (
        <button
            onClick={onClick}
            disabled={isLoading || disabled}
            // Tailwind classes for styling:
            // flex/items-center/justify-center: Centers content
            // w-full: Takes full width of container
            // bg-brand-darkSurface: Uses our custom theme color
            // transition-all: Smoothly animates hover/focus states
            className="flex items-center justify-center gap-3 w-full bg-brand-darkSurface dark:bg-brand-darkSurface text-gray-700 dark:text-gray-200 font-medium py-2.5 px-4 rounded-lg border-[3px] border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-brand-darkSurface transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
        >
            {/* Conditional rendering: Show spinner if loading, otherwise show Google logo */}
            {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                    />
                    <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                    />
                    <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                    />
                    <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                    />
                </svg>
            )}
            <span>{isLoading ? 'Signing in...' : 'Sign in with Google'}</span>
        </button>
    );
};

export default GoogleSignInButton;
