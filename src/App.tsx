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
import { loadDummyData, getDummyJoinCodes } from './services/dummyDataService';

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

    // View state: controls which main component is rendered
    const [view, setView] = useState<'landing' | 'teacher' | 'student'>('landing');

    // Student specific state
    const [showNameModal, setShowNameModal] = useState(false);
    const [studentName, setStudentName] = useState('');
    const [classId, setClassId] = useState('');
    const [studentClassroomColor, setStudentClassroomColor] = useState<string | undefined>(undefined);

    // Determine user role for theming
    const userRole: UserRole = view === 'student' ? 'student' : 'teacher';


    // Global Store
    const {
        darkMode,
        currentClassId,
        setCurrentClassId,
        setClassrooms
    } = useClassStore();

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

    // Effect to handle view switching based on auth
    useEffect(() => {
        if (!loading) {
            if (user) {
                setView('teacher');
            } else if (view === 'teacher') {
                setView('landing');
            }
        }
    }, [user, loading]);

    // Developer Mode: Keyboard shortcut to load dummy data (Ctrl+Shift+D)
    // SECURITY: Only enabled in development mode to prevent production abuse
    useEffect(() => {
        // Skip in production builds
        if (!import.meta.env.DEV) return;
        
        const handleKeyPress = async (event: KeyboardEvent) => {
            // Check for Ctrl+Shift+D (or Cmd+Shift+D on Mac)
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'D') {
                event.preventDefault();

                if (!user) {
                    toast.error('Please sign in as a teacher first!');
                    return;
                }

                console.log('🚀 Loading dummy data...');
                toast.loading('Loading dummy data...', { id: 'dummy-data' });

                try {
                    await loadDummyData(user.uid);
                    toast.dismiss('dummy-data');

                    // Show join codes for easy access
                    const joinCodes = getDummyJoinCodes();
                    const codesMessage = joinCodes
                        .map((c: { name: string; code: string }) => `${c.name}: ${c.code}`)
                        .join('\n');

                    toast.success(
                        `Dummy data loaded!\n\nJoin Codes:\n${codesMessage}`,
                        {
                            duration: 8000,
                            style: {
                                maxWidth: '500px',
                                whiteSpace: 'pre-line',
                            },
                        }
                    );

                    // Refresh the page to load new data
                    window.location.reload();
                } catch (error) {
                    toast.dismiss('dummy-data');
                    console.error('Failed to load dummy data:', error);
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [user]);

    // Fetch Classrooms for Teacher
    useEffect(() => {
        const fetchClassrooms = async () => {
            if (!user || view !== 'teacher') return;
            try {
                console.log('Fetching classrooms for teacher:', user.uid);
                const q = query(collection(db, 'classrooms'), where('teacherId', '==', user.uid));
                const snapshot = await getDocs(q);
                const data: Classroom[] = [];
                snapshot.forEach(doc => {
                    console.log('Found classroom:', doc.id, doc.data());
                    data.push({ id: doc.id, ...doc.data() } as Classroom);
                });

                console.log('Total classrooms found:', data.length);
                setClassrooms(data);

                // Validate persisted class still exists, or select first class
                const firstClass = data[0];
                const persistedClassExists = currentClassId && data.some(c => c.id === currentClassId);

                if (data.length > 0 && !persistedClassExists && firstClass) {
                    console.log('Setting current class to:', firstClass.id);
                    setCurrentClassId(firstClass.id);
                } else if (data.length === 0) {
                    console.warn('No classrooms found for this teacher. Use Ctrl+Shift+D to load dummy data.');
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
     * Resets all application state to default.
     */
    const handleLogout = async () => {
        await logout();

        // Reset all application state
        setStudentName('');
        setClassId('');
        setStudentClassroomColor(undefined);
        setView('landing');
        setShowNameModal(false);
        setCurrentClassId(null);
        setClassrooms([]);
    };

    /**
     * Handles a student joining a room via code.
     */
    const handleJoinRoom = async (code: string, name: string, joinedClassId: string) => {
        console.log('Joining room:', code, 'as', name, 'ID:', joinedClassId);
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
        }
        
        setView('student');
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
