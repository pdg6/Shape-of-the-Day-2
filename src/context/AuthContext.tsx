import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import {
    User,
    GoogleAuthProvider,
    signInWithPopup,
    signInAnonymously,
    signOut,
    onAuthStateChanged,
    onIdTokenChanged
} from 'firebase/auth';
import { auth } from '../firebase';
import toast from 'react-hot-toast';

// ============================================================================
// Types
// ============================================================================

interface AuthContextType {
    user: User | null;
    loading: boolean;
    authError: AuthErrorType | null;
    login: () => Promise<void>;
    loginAnonymously: () => Promise<User | null>;
    logout: () => Promise<void>;
    clearAuthError: () => void;
    refreshToken: () => Promise<boolean>;
}

type AuthErrorType = 'session_expired' | 'token_refresh_failed' | 'network_error';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Constants
// ============================================================================

const MAX_REFRESH_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 1000; // Exponential backoff: 1s, 2s, 4s

// ============================================================================
// Utility Functions
// ============================================================================

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// AuthProvider Component
// ============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<AuthErrorType | null>(null);

    // Track refresh attempts to prevent infinite loops
    const refreshAttemptRef = useRef(0);
    const isRefreshingRef = useRef(false);

    // ========================================================================
    // Auth State Listeners
    // ========================================================================

    // Primary auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
            // Clear auth error when user signs in successfully
            if (currentUser) {
                setAuthError(null);
                refreshAttemptRef.current = 0;
            }
        });
        return () => unsubscribe();
    }, []);

    // Token refresh listener - handles token expiry
    useEffect(() => {
        const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
            if (!currentUser && user) {
                // Token expired or user signed out
                console.log('[Auth] Token changed - user is null but was previously set');

                // Don't trigger re-auth if we're in the middle of a refresh
                if (!isRefreshingRef.current) {
                    // Attempt silent refresh for anonymous users
                    if (user.isAnonymous) {
                        const success = await attemptSilentRefresh();
                        if (!success) {
                            setAuthError('session_expired');
                        }
                    }
                }
            }
        });
        return () => unsubscribe();
    }, [user]);

    // ========================================================================
    // Token Refresh Logic
    // ========================================================================

    /**
     * Attempts to silently refresh the auth token.
     * Returns true if successful, false otherwise.
     */
    const attemptSilentRefresh = async (): Promise<boolean> => {
        if (isRefreshingRef.current) {
            console.log('[Auth] Already refreshing, skipping');
            return false;
        }

        isRefreshingRef.current = true;

        for (let attempt = 1; attempt <= MAX_REFRESH_RETRIES; attempt++) {
            try {
                console.log(`[Auth] Silent refresh attempt ${attempt}/${MAX_REFRESH_RETRIES}`);

                // Try to get a fresh token
                const currentUser = auth.currentUser;
                if (currentUser) {
                    await currentUser.getIdToken(true); // Force refresh
                    console.log('[Auth] Token refreshed successfully');
                    refreshAttemptRef.current = 0;
                    isRefreshingRef.current = false;
                    return true;
                }

                // If no current user, try re-auth for anonymous users
                if (user?.isAnonymous) {
                    console.log('[Auth] Re-authenticating anonymous user');
                    const result = await signInAnonymously(auth);
                    if (result.user) {
                        console.log('[Auth] Anonymous re-auth successful');
                        refreshAttemptRef.current = 0;
                        isRefreshingRef.current = false;
                        return true;
                    }
                }
            } catch (error) {
                console.error(`[Auth] Refresh attempt ${attempt} failed:`, error);

                if (attempt < MAX_REFRESH_RETRIES) {
                    // Exponential backoff
                    const waitTime = RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
                    console.log(`[Auth] Waiting ${waitTime}ms before retry...`);
                    await delay(waitTime);
                }
            }
        }

        console.error('[Auth] All refresh attempts failed');
        isRefreshingRef.current = false;
        setAuthError('token_refresh_failed');
        return false;
    };

    /**
     * Public method to manually trigger token refresh.
     */
    const refreshToken = async (): Promise<boolean> => {
        return attemptSilentRefresh();
    };

    // ========================================================================
    // Auth Actions
    // ========================================================================

    const login = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            toast.success('Successfully signed in!');
            setAuthError(null);
        } catch (error) {
            console.error('Login failed:', error);
            toast.error('Failed to sign in. Please try again.');
        }
    };

    /**
     * Sign in anonymously (for students).
     * Returns the user if successful, null otherwise.
     */
    const loginAnonymously = async (): Promise<User | null> => {
        try {
            const result = await signInAnonymously(auth);
            console.log('[Auth] Anonymous sign-in successful');
            setAuthError(null);
            return result.user;
        } catch (error) {
            console.error('[Auth] Anonymous login failed:', error);
            if (!navigator.onLine) {
                setAuthError('network_error');
            } else {
                toast.error('Failed to sign in. Please try again.');
            }
            return null;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setAuthError(null);
            // Clear any persisted task form data on sign-out
            sessionStorage.removeItem('taskManager.openCards');
            sessionStorage.removeItem('taskManager.activeCardId');
            toast.success('Signed out successfully');
        } catch (error) {
            console.error('Logout failed:', error);
            toast.error('Failed to sign out.');
        }
    };

    const clearAuthError = () => {
        setAuthError(null);
    };

    // ========================================================================
    // Render
    // ========================================================================

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            authError,
            login,
            loginAnonymously,
            logout,
            clearAuthError,
            refreshToken
        }}>
            {children}
        </AuthContext.Provider>
    );
};

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
