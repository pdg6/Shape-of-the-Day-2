import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

import LandingPage from './components/shared/LandingPage';
import SettingsManager from './components/shared/SettingsManager';
import StudentNameModal from './components/student/StudentNameModal';
import { db } from './firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useClassStore } from './store/appSettings';
import { Classroom } from './types';
import { useAuth } from './context/auth-context';
import { ThemeProvider, UserRole } from './context/ThemeContext';
import TourProvider from './components/shared/OnboardingTour';

import { clearAllStudentData } from './services/storageService';

// Lazy load heavy components for better initial load performance
const TeacherDashboard = lazy(() => import('./components/teacher/TeacherDashboard'));
const StudentView = lazy(() => import('./components/student/StudentView'));

// Loading fallback component
const LoadingSpinner = () => (
    <div className="h-screen w-screen flex items-center justify-center bg-(--bg-page)">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
            <p className="text-sm font-medium text-brand-textSecondary animate-pulse">
                Initializing the day...
            </p>
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
const App = () => {
    // Auth Context
    const { user, loading, login, logout } = useAuth();

    // Global Store
    const {
        view,
        setView,
        setClassrooms,
        currentClassId,
        setCurrentClassId,
        resetAppState,
        studentName,
        setStudentName,
        studentClassId,
        setStudentClassId,
        studentClassroomColor,
        setStudentClassroomColor
    } = useClassStore();

    // Student specific UI state (local to App)
    const [isStudentNameModalOpen, setIsStudentNameModalOpen] = useState(false);

    // Initial data fetch
    useEffect(() => {
        if (!loading) {
            fetchClassrooms();
        }
    }, [user, loading]);

    // Cleanup and navigation based on auth
    useEffect(() => {
        // Redirect to landing if user is lost (unless they are a student)
        if (!loading && !user && view !== 'landing' && view !== 'student') {
            setView('landing');
        }
        // Redirect to teacher view if user is found and we are on landing
        if (!loading && user && !user.isAnonymous && view === 'landing') {
            setView('teacher');
        }
    }, [user, loading, view]);

    const fetchClassrooms = async () => {
        if (!user) {
            return;
        }

        try {
            const classroomsRef = collection(db, 'classrooms');
            const q = query(classroomsRef, where('teacherId', '==', user.uid));
            const querySnapshot = await getDocs(q);

            const classroomsData: Classroom[] = [];
            querySnapshot.forEach((doc) => {
                classroomsData.push({ id: doc.id, ...doc.data() } as Classroom);
            });

            setClassrooms(classroomsData);

            // AUTO-SELECT FIRST CLASS IF NONE SELECTED
            if (classroomsData.length > 0 && !currentClassId) {
                setCurrentClassId(classroomsData[0]!.id);
            }
        } catch (error) {
            console.error('Error fetching classrooms:', error);
            toast.error('Failed to load classrooms.');
        } finally {
            // Loading handled by global auth loading state for now
        }
    };

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
        setStudentClassId(joinedClassId);

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
        setIsStudentNameModalOpen(false);
        setView('student');
    };

    // currentClass is used by TeacherDashboard via the store

    // Show loading spinner while checking auth status
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
            </div>
        );
    }

    const userRole: UserRole = view === 'teacher' ? 'teacher' : 'student';

    return (
        <ThemeProvider role={userRole} classroomColor={view === 'student' ? studentClassroomColor : undefined}>
            <TourProvider>
                <SettingsManager />
                <div className="relative z-10 flex flex-col h-dvh bg-transparent">
                    {/* Skip Link - Accessibility: allows keyboard users to bypass navigation */}
                    <a href="#main-content" className="skip-link">
                        Skip to main content
                    </a>

                    <Toaster position="top-right" />

                    {/* Global Name Modal (can be triggered from anywhere) */}
                    {isStudentNameModalOpen && (
                        <StudentNameModal
                            onSubmit={handleNameSubmit}
                            onClose={() => setIsStudentNameModalOpen(false)}
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
                                    classId={studentClassId}
                                    onEditName={() => setIsStudentNameModalOpen(true)}
                                    onNameSubmit={handleNameSubmit}
                                    onSignOut={handleLogout}
                                />
                            </Suspense>
                        )}
                    </main>
                </div>
            </TourProvider>
        </ThemeProvider>
    );
}

export default App;
