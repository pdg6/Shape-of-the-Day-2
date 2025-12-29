import React, { useEffect, useState, useRef } from 'react';
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
import {
    AuthContext,
    AuthErrorType,
    MAX_REFRESH_RETRIES,
    RETRY_DELAY_BASE_MS,
    SESSION_TIMEOUT_MS,
    SESSION_START_KEY
} from './auth-context';

// ============================================================================
// Utility Functions
// ============================================================================

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================================
// AuthProvider Component
// ============================================================================

/**
 * AuthProvider Component
 * 
 * Handles Firebase authentication state, session management, and token refresh.
 * Core logic and hook are separated into auth-context.ts for Fast Refresh compatibility.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<AuthErrorType | null>(null);

    // Track refresh attempts to prevent infinite loops
    const refreshAttemptRef = useRef(0);
    const isRefreshingRef = useRef(false);
    const isLoggingOutRef = useRef(false);

    // ========================================================================
    // Auth State Listeners
    // ========================================================================

    // Primary auth state listener with session timeout check
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            // Check session timeout BEFORE allowing auth
            if (currentUser) {
                const sessionStart = sessionStorage.getItem(SESSION_START_KEY);

                if (sessionStart) {
                    const elapsed = Date.now() - parseInt(sessionStart, 10);
                    if (elapsed > SESSION_TIMEOUT_MS) {
                        // Session expired - force logout
                        console.log('[Auth] Session expired after 6 hours, forcing logout');
                        await signOut(auth);
                        sessionStorage.removeItem(SESSION_START_KEY);
                        toast('Session expired. Please sign in again.', { icon: '⏰' });
                        setUser(null);
                        setLoading(false);
                        return;
                    }
                } else {
                    // First login in this session - store start time
                    sessionStorage.setItem(SESSION_START_KEY, Date.now().toString());
                    console.log('[Auth] Session started at', new Date().toISOString());
                }

                setAuthError(null);
                refreshAttemptRef.current = 0;
            }

            setUser(currentUser);
            setLoading(false);
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
            // Force account selection to prevent auto-login loop
            provider.setCustomParameters({ prompt: 'select_account' });
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

    const loginWithEmail = async (email: string, password: string) => {
        try {
            await import('../services/authService').then(m => m.signInWithEmail(email, password));
            toast.success('Successfully signed in!');
            setAuthError(null);
        } catch (error) {
            console.error('Email login failed:', error);
            toast.error('Failed to sign in. Check your credentials.');
            throw error;
        }
    };

    const logout = async () => {
        // Set flag to prevent race conditions with auth state listeners
        isLoggingOutRef.current = true;

        try {
            // Revoke Google Token if available to prevent auto-login
            if (user) {
                try {
                    const token = await user.getIdToken();
                    // Revoke token via Google API
                    await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
                        method: 'POST',
                        headers: { 'Content-type': 'application/x-www-form-urlencoded' }
                    }).catch(err => console.warn('[Auth] Token revocation warning:', err));
                } catch (e) {
                    console.warn('[Auth] Failed to revoke token', e);
                }
            }

            await signOut(auth);
            setUser(null);
            setAuthError(null);
            // Clear session timestamp and persisted task form data
            sessionStorage.removeItem(SESSION_START_KEY);
            sessionStorage.removeItem('taskManager.openCards');
            sessionStorage.removeItem('taskManager.activeCardId');
            toast.success('Signed out successfully');

            // Allow time for cleanup before re-enabling auth events
            setTimeout(() => {
                isLoggingOutRef.current = false;
            }, 500);
        } catch (error) {
            console.error('Logout failed:', error);
            isLoggingOutRef.current = false;
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
            loginWithEmail,
            loginAnonymously,
            logout,
            clearAuthError,
            refreshToken
        }}>
            {children}
        </AuthContext.Provider>
    );
};
