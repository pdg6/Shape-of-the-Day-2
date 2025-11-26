import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { LogOut } from 'lucide-react';
import LandingPage from './components/shared/LandingPage';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentView from './components/student/StudentView';
import StudentNameModal from './components/student/StudentNameModal';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import toast from 'react-hot-toast';

/**
 * App Component
 * 
 * The root component of the application. It handles:
 * 1. Global state (authentication, current view, theme).
 * 2. Routing (switching between Landing, Teacher, and Student views).
 * 3. Global layout elements (Navigation bar, Toaster).
 */
function App() {
    // Authentication state
    const [user, setUser] = useState<User | null>(null);

    // View state: controls which main component is rendered
    const [view, setView] = useState<'landing' | 'teacher' | 'student'>('landing');

    // Loading state for initial auth check
    const [loading, setLoading] = useState(true);

    // Student specific state
    const [showNameModal, setShowNameModal] = useState(false);
    const [studentName, setStudentName] = useState('');

    // Theme state: persists dark mode preference to localStorage
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedMode = localStorage.getItem('darkMode');
            if (savedMode !== null) {
                return savedMode === 'true';
            }
            return true; // Default to dark mode
        }
        return true;
    });

    // Effect to apply dark mode class to the HTML element
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('darkMode', 'true');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('darkMode', 'false');
        }
    }, [darkMode]);

    // Effect to listen for Firebase authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                // Automatically redirect authenticated users to Teacher Dashboard
                setView('teacher');
            } else {
                // If not authenticated, show Landing page
                setView('landing');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    /**
     * Handles Google Sign-In for teachers.
     */
    const handleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // View update is handled by the onAuthStateChanged listener
            toast.success('Successfully signed in!');
        } catch (error) {
            console.error('Login failed:', error);
            toast.error('Failed to sign in. Please try again.');
        }
    };

    /**
     * Handles Sign Out for both teachers and students.
     * Resets all application state to default.
     */
    const handleLogout = async () => {
        // Sign out from Firebase if user is authenticated
        if (user) {
            await signOut(auth);
        }

        // Reset all application state
        setUser(null);
        setStudentName('');
        setView('landing');
        setShowNameModal(false);
    };

    /**
     * Handles a student joining a room via code.
     */
    const handleJoinRoom = (code: string) => {
        console.log('Joining room:', code);
        // In a real app, we would validate the code against the backend here
        setShowNameModal(true);
    };

    /**
     * Handles the student submitting their name.
     */
    const handleNameSubmit = (name: string) => {
        setStudentName(name);
        setShowNameModal(false);
        setView('student');
        // In real app, we'd save this to session/local storage or context
    };

    // Show loading spinner while checking auth status
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-light dark:bg-brand-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-light dark:bg-brand-dark transition-colors duration-200">
            <Toaster position="top-right" />

            {/* Global Name Modal (can be triggered from anywhere) */}
            {showNameModal && (
                <StudentNameModal
                    onSubmit={handleNameSubmit}
                    onClose={() => setShowNameModal(false)}
                />
            )}

            {/* Navigation Bar */}
            <nav className="bg-brand-lightSurface dark:bg-brand-darkSurface border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between transition-colors duration-200">
                <div className="flex items-center gap-2 font-bold text-xl text-brand-textDarkPrimary dark:text-brand-textPrimary">
                    <img
                        src="/shape of the day logo.png"
                        alt="Shape of the Day"
                        className="w-8 h-8"
                    />
                    Shape of the Day
                </div>
                <div className="flex items-center gap-4">
                    {/* Theme Toggle Button */}
                    <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {darkMode ? "☀️" : "🌙"}
                    </button>

                    {view !== 'landing' && (
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="text-sm font-medium">Sign Out</span>
                        </button>
                    )}
                </div>
            </nav>

            {/* Main Content Area */}
            <main>
                {view === 'landing' && (
                    <LandingPage
                        onLogin={handleLogin}
                        onJoin={handleJoinRoom}
                    />
                )}

                {view === 'teacher' && <TeacherDashboard />}
                {view === 'student' && (
                    <StudentView
                        studentName={studentName}
                        onEditName={() => setShowNameModal(true)}
                        onNameSubmit={handleNameSubmit}
                    />
                )}
            </main>
        </div>
    );
}

export default App;
