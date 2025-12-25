import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

import LandingPage from './components/shared/LandingPage';
import StudentNameModal from './components/student/StudentNameModal';
import { db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useClassStore } from './store/classStore';
import { Classroom } from './types';
import { useAuth } from './context/AuthContext';
import { ThemeProvider, UserRole } from './context/ThemeContext';

import { clearAllStudentData } from './services/storageService';

// Lazy load heavy components for better initial load performance
const TeacherDashboard = lazy(() => import('./components/teacher/TeacherDashboard'));
const StudentView = lazy(() => import('./components/student/StudentView'));

// Loading fallback component
const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-screen bg-brand-light dark:bg-brand-dark">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary font-medium">Loading...</p>
        </div>
    </div>
);

/**
 * App Component
 * 
 * The root component of the application. It handles:
 * 1. Global state (authentication, current view, theme).
 * 2. Routing (switching between Landing, Teacher, and Student views).
 * 3. Global layout elements (Navigation bar, Toaster).
 */
function App() {
    // Auth Context
    const { user, loading, login, logout } = useAuth();

    // Global Store
    const {
        view, setView,
        studentName, setStudentName,
        studentClassId: classId, setStudentClassId: setClassId,
        studentClassroomColor, setStudentClassroomColor,
        darkMode,
        currentClassId,
        setCurrentClassId,
        setClassrooms,
        resetAppState
    } = useClassStore();

    // Student specific UI state (local to App)
    const [showNameModal, setShowNameModal] = useState(false);

    // Determine user role for theming
    const userRole: UserRole = view === 'student' ? 'student' : 'teacher';

    /**
     * Effect to apply dark mode class to the HTML element and sync browser theme-color.
     * Persistence is handled within the store's toggleDarkMode/setDarkMode actions.
     */
    useEffect(() => {
        const root = document.documentElement;
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');

        if (darkMode) {
            root.classList.add('dark');
            root.style.colorScheme = 'dark';
            if (themeColorMeta) {
                themeColorMeta.setAttribute('content', '#10100e'); // --color-brand-dark
            }
        } else {
            root.classList.remove('dark');
            root.style.colorScheme = 'light';
            if (themeColorMeta) {
                themeColorMeta.setAttribute('content', '#F1F5F9'); // --color-brand-light (slate-100)
            }
        }
        console.log('🌓 Theme synced:', darkMode ? 'dark' : 'light');
    }, [darkMode]);

    /**
     * Effect to handle view switching based on auth.
     * Priority: Active student session > Non-anonymous authenticated user > Landing.
     */
    useEffect(() => {
        if (!loading) {
            // Check for active student session FIRST
            if (classId && studentName && view !== 'teacher') {
                setView('student');
            } else if (user && !classId && !studentName) {
                // Teachers (non-anonymous) go to dashboard, anonymous with no session go to landing
                if (!user.isAnonymous) {
                    setView('teacher');
                } else {
                    setView('landing');
                }
            } else if (view === 'teacher' && !user) {
                setView('landing');
            }
        }
    }, [user, loading, view, classId, studentName, setView]);



    /**
     * Fetch Classrooms for Teacher Dashboard.
     */
    useEffect(() => {
        const fetchClassrooms = async () => {
            if (!user || view !== 'teacher') return;
            try {
                console.log('Fetching classrooms for teacher:', user.uid);
                const q = query(collection(db, 'classrooms'), where('teacherId', '==', user.uid));
                const snapshot = await getDocs(q);
                const data: Classroom[] = [];
                snapshot.forEach(doc => {
                    data.push({ id: doc.id, ...doc.data() } as Classroom);
                });

                console.log('Total classrooms found:', data.length);
                setClassrooms(data);

                const firstClass = data[0];
                const persistedClassExists = currentClassId && data.some(c => c.id === currentClassId);

                if (data.length > 0 && !persistedClassExists && firstClass) {
                    setCurrentClassId(firstClass.id);
                } else if (data.length === 0) {
                    setCurrentClassId(null);
                }
            } catch (error) {
                console.error("Error fetching classrooms:", error);
            }
        };
        fetchClassrooms();
    }, [user, view, setCurrentClassId, setClassrooms, currentClassId]);

    /**
     * Handles Sign Out for both teachers and students.
     * Centralized in store's resetAppState.
     */
    const handleLogout = async () => {
        // SECURITY: Clear all student local data
        await clearAllStudentData();

        // Sign out from Firebase
        await logout();

        // Reset all application state via store
        resetAppState();
    };

    /**
     * Handles a student joining a room via code.
     */
    const handleJoinRoom = async (_code: string, name: string, joinedClassId: string) => {
        console.log('Joining room as', name, 'ID:', joinedClassId);

        setStudentName(name);
        setClassId(joinedClassId);

        // Fetch classroom color for theme
        try {
            const classDoc = await getDoc(doc(db, 'classrooms', joinedClassId));
            if (classDoc.exists()) {
                const classroomData = classDoc.data();
                setStudentClassroomColor(classroomData?.color);
            }
        } catch (error) {
            console.error('Error fetching classroom color:', error);
            toast.error('Could not load classroom theme. Using default.');
        }

        setView('student');
    };

    /**
     * Handles the student submitting their name change.
     */
    const handleNameSubmit = (name: string) => {
        setStudentName(name);
        setShowNameModal(false);
        setView('student');
    };

    // currentClass is used by TeacherDashboard via the store

    // Show loading spinner while checking auth status
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-light dark:bg-brand-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
            </div>
        );
    }

    return (
        <ThemeProvider role={userRole} classroomColor={view === 'student' ? studentClassroomColor : undefined}>
            <div className="flex flex-col h-screen-safe bg-brand-lightSurface dark:bg-brand-darkSurface transition-colors duration-200">
                {/* Skip Link - Accessibility: allows keyboard users to bypass navigation */}
                <a href="#main-content" className="skip-link">
                    Skip to main content
                </a>

                <Toaster position="top-right" />

                {/* Global Name Modal (can be triggered from anywhere) */}
                {showNameModal && (
                    <StudentNameModal
                        onSubmit={handleNameSubmit}
                        onClose={() => setShowNameModal(false)}
                    />
                )}

                {/* Main Content Area - Each view manages its own header */}
                <main id="main-content" className="flex-1 min-h-0 overflow-hidden">
                    {view === 'landing' && (
                        <LandingPage
                            onLogin={login}
                            onJoin={handleJoinRoom}
                        />
                    )}

                    {view === 'teacher' && (
                        <Suspense fallback={<LoadingSpinner />}>
                            <TeacherDashboard />
                        </Suspense>
                    )}
                    {view === 'student' && (
                        <Suspense fallback={<LoadingSpinner />}>
                            <StudentView
                                studentName={studentName}
                                classId={classId}
                                onEditName={() => setShowNameModal(true)}
                                onNameSubmit={handleNameSubmit}
                                onSignOut={handleLogout}
                            />
                        </Suspense>
                    )}
                </main>
            </div>
        </ThemeProvider>
    );
}

export default App;
