// Firebase authentication services
import {
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User,
    UserCredential,
    Unsubscribe
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

/**
 * Sign in with Google
 * @returns Promise resolving to UserCredential
 */
export const signInWithGoogle = async (): Promise<UserCredential> => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result;
    } catch (error) {
        console.error('Error signing in with Google:', error);
        throw error;
    }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
};

/**
 * Listen to authentication state changes
 * @param callback - Called with the current user or null
 * @returns Unsubscribe function
 */
export const onAuthChange = (callback: (user: User | null) => void): Unsubscribe => {
    return onAuthStateChanged(auth, callback);
};

/**
 * Get the current authenticated user
 * @returns Current user or null if not authenticated
 */
export const getCurrentUser = (): User | null => {
    return auth.currentUser;
};
