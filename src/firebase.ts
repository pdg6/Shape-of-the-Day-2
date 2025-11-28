// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCOcf7vTV7UxkfdMSEQVjllBq4JeWibyP8",
    authDomain: "shape-of-the-day.firebaseapp.com",
    projectId: "shape-of-the-day",
    storageBucket: "shape-of-the-day.firebasestorage.app",
    messagingSenderId: "628524163762",
    appId: "1:628524163762:web:cd32f4f05831075b259fab",
    measurementId: "G-WJWMVT9Z0S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Analytics is initialized for Firebase but not directly used in app code
void getAnalytics(app);

// Initialize Firebase services for authentication and database
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;
