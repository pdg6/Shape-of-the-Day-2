// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: "G-WJWMVT9Z0S"  // Optional: tracking ID, safe to keep hardcoded
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// Analytics is initialized for Firebase but not directly used in app code
void getAnalytics(app);

// ============================================================================
// FIREBASE APP CHECK - Protects against API abuse
// ============================================================================
// 
// SETUP INSTRUCTIONS:
// 1. Go to Firebase Console > Project Settings > App Check
// 2. Register your app with reCAPTCHA v3
// 3. Get your reCAPTCHA v3 site key from Google reCAPTCHA admin console
// 4. Replace 'YOUR_RECAPTCHA_V3_SITE_KEY' below with your actual key
// 5. Enable App Check enforcement in Firebase Console for Firestore & Auth
//
// IMPORTANT: Until you complete setup, App Check is disabled in development
// to prevent breaking the app. Enable it by replacing the site key.
// ============================================================================

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

// Only initialize App Check if we have a valid site key (not in dev without key)
if (RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY !== 'YOUR_RECAPTCHA_V3_SITE_KEY') {
    try {
        initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
            // Optional: Set to true to enable debug mode in development
            isTokenAutoRefreshEnabled: true
        });
        console.log('✅ Firebase App Check initialized');
    } catch (error) {
        console.warn('⚠️ Firebase App Check initialization failed:', error);
    }
} else if (import.meta.env.DEV) {
    // In development without a key, log instructions
    console.log('ℹ️ Firebase App Check is disabled. Set VITE_RECAPTCHA_SITE_KEY in .env to enable.');

    // Enable debug token for local development
    const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
    if (debugToken) {
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    }
}

// Initialize Firebase services for authentication and database
export const auth = getAuth(app);

// ============================================================================
// SESSION PERSISTENCE - Security: Credentials clear when browser tab closes
// ============================================================================
// This prevents auto-login on page reload and aligns with education app
// best practices for shared devices.
setPersistence(auth, browserSessionPersistence)
    .then(() => console.log('✅ Firebase Auth: Session-only persistence enabled'))
    .catch((error) => console.warn('⚠️ Failed to set auth persistence:', error));

export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export default app;
