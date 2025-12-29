import { createContext, useContext } from 'react';
import { User } from 'firebase/auth';

// ============================================================================
// Types
// ============================================================================

export type AuthErrorType = 'session_expired' | 'token_refresh_failed' | 'network_error';

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    authError: AuthErrorType | null;
    login: () => Promise<void>;
    loginWithEmail: (email: string, password: string) => Promise<void>;
    loginAnonymously: () => Promise<User | null>;
    logout: () => Promise<void>;
    clearAuthError: () => void;
    refreshToken: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Constants
// ============================================================================

export const MAX_REFRESH_RETRIES = 3;
export const RETRY_DELAY_BASE_MS = 1000; // Exponential backoff: 1s, 2s, 4s

// Session timeout: 6 hours (aligns with education app best practices)
export const SESSION_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
export const SESSION_START_KEY = 'sotd_session_start';

// ============================================================================
// Hook
// ============================================================================

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
