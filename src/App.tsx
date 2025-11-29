import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';

import LandingPage from './components/shared/LandingPage';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentView from './components/student/StudentView';
import StudentNameModal from './components/student/StudentNameModal';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useClassStore } from './store/classStore';
import { Classroom } from './types';
import { useAuth } from './context/AuthContext';
import { loadDummyData, getDummyJoinCodes } from './services/dummyDataService';

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


    // Global Store
    const {
        darkMode,
        currentClassId,
        setCurrentClassId,
        classrooms,
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
    useEffect(() => {
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

                // If no class is selected but we have classes, select the first one
                const firstClass = data[0];
                if (data.length > 0 && !currentClassId && firstClass) {
                    console.log('Setting current class to:', firstClass.id);
                    setCurrentClassId(firstClass.id);
                } else if (data.length === 0) {
                    console.warn('No classrooms found for this teacher. Use Ctrl+Shift+D to load dummy data.');
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
        setView('landing');
        setShowNameModal(false);
        setCurrentClassId(null);
        setClassrooms([]);
    };

    /**
     * Handles a student joining a room via code.
     */
    const handleJoinRoom = (code: string, name: string, joinedClassId: string) => {
        console.log('Joining room:', code, 'as', name, 'ID:', joinedClassId);
        setStudentName(name);
        setClassId(joinedClassId);
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

    const currentClass = classrooms.find(c => c.id === currentClassId);

    // Show loading spinner while checking auth status
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-light dark:bg-brand-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-accent"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen-safe bg-brand-light dark:bg-brand-dark transition-colors duration-200">
            <Toaster position="top-right" />

            {/* Global Name Modal (can be triggered from anywhere) */}
            {showNameModal && (
                <StudentNameModal
                    onSubmit={handleNameSubmit}
                    onClose={() => setShowNameModal(false)}
                />
            )}

            {/* Navigation Bar - Hidden on landing page */}
            {view !== 'landing' && (
                <nav className={`flex-shrink-0 bg-brand-lightSurface dark:bg-brand-darkSurface px-6 py-3 items-center justify-between transition-colors duration-200 border-b border-gray-200 dark:border-gray-800 ${view === 'student' ? 'hidden md:flex' : 'flex'}`}>
                    {/* Left Section: Logo and Title */}
                    <div className="flex items-center gap-2 font-bold text-xl text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        <img
                            src="/shape of the day logo.png"
                            alt="Shape of the Day"
                            className="w-8 h-8"
                        />
                        Shape of the Day
                    </div>

                    {/* Center Section: Classroom Name */}
                    {view === 'teacher' && currentClass && (
                        <span className="absolute left-1/2 -translate-x-1/2 font-bold text-xl text-brand-accent">
                            {currentClass.name}
                        </span>
                    )}

                    {/* Right Section: Date */}
                    <div className="font-bold text-xl text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </div>

                </nav>
            )}

            {/* Main Content Area */}
            <main className="flex-1 min-h-0 overflow-hidden">
                {view === 'landing' && (
                    <LandingPage
                        onLogin={login}
                        onJoin={handleJoinRoom}
                    />
                )}

                {view === 'teacher' && <TeacherDashboard />}
                {view === 'student' && (
                    <StudentView
                        studentName={studentName}
                        classId={classId}
                        onEditName={() => setShowNameModal(true)}
                        onNameSubmit={handleNameSubmit}
                        onSignOut={handleLogout}
                    />
                )}
            </main>
        </div>
    );
}

export default App;
