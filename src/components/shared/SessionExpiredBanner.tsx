/**
 * SessionExpiredBanner Component
 * 
 * Non-intrusive banner that appears when auth token expires.
 * Provides a reconnect button for seamless re-authentication.
 */

import React from 'react';
import { RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SessionExpiredBanner: React.FC = () => {
    const { authError, refreshToken, clearAuthError, loginAnonymously } = useAuth();

    if (!authError) return null;

    const handleReconnect = async () => {
        // Try to refresh token first
        const success = await refreshToken();
        if (success) {
            clearAuthError();
            return;
        }

        // If refresh fails, try anonymous re-login
        const user = await loginAnonymously();
        if (user) {
            clearAuthError();
        }
    };

    const getErrorContent = () => {
        switch (authError) {
            case 'session_expired':
                return {
                    icon: <AlertTriangle size={16} />,
                    text: 'Session expired',
                    buttonText: 'Tap to reconnect',
                    color: 'bg-amber-500',
                };
            case 'token_refresh_failed':
                return {
                    icon: <RefreshCw size={16} />,
                    text: 'Connection lost',
                    buttonText: 'Try again',
                    color: 'bg-red-500',
                };
            case 'network_error':
                return {
                    icon: <WifiOff size={16} />,
                    text: 'No internet connection',
                    buttonText: 'Retry when online',
                    color: 'bg-gray-500',
                };
            default:
                return {
                    icon: <AlertTriangle size={16} />,
                    text: 'Authentication issue',
                    buttonText: 'Reconnect',
                    color: 'bg-amber-500',
                };
        }
    };

    const content = getErrorContent();

    return (
        <div
            className={`
                fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-50
                flex items-center gap-2 px-4 py-2 rounded-full
                text-sm font-medium shadow-lg
                transition-all duration-300 cursor-pointer
                ${content.color} text-white
                hover:scale-105 active:scale-95
            `}
            onClick={handleReconnect}
            role="button"
            aria-label={content.buttonText}
        >
            {content.icon}
            <span>{content.text}</span>
            <span className="mx-1">·</span>
            <span className="underline underline-offset-2">{content.buttonText}</span>
        </div>
    );
};

export default SessionExpiredBanner;
