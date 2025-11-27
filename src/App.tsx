import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { LogOut, QrCode, ChevronDown, Check, Plus } from 'lucide-react';
import LandingPage from './components/shared/LandingPage';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentView from './components/student/StudentView';
import StudentNameModal from './components/student/StudentNameModal';
import { db } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useClassStore } from './store/classStore';
import { Classroom } from './types';
import { useAuth } from './context/AuthContext';

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

    // Class Selector State
    const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);

    // Global Store
    const {
        darkMode,
        currentClassId,
        setCurrentClassId,
        classrooms,
        setClassrooms,
        setIsClassModalOpen
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

    // Fetch Classrooms for Teacher
    useEffect(() => {
        const fetchClassrooms = async () => {
            if (!user || view !== 'teacher') return;
            try {
                const q = query(collection(db, 'classrooms'), where('teacherId', '==', user.uid));
                const snapshot = await getDocs(q);
                const data: Classroom[] = [];
                snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Classroom));
                setClassrooms(data);

                // If no class is selected but we have classes, select the first one
                if (data.length > 0 && !currentClassId) {
                    setCurrentClassId(data[0].id);
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
            <nav className="bg-brand-lightSurface dark:bg-brand-darkSurface px-6 py-3 flex items-center justify-between transition-colors duration-200 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 font-bold text-xl text-brand-textDarkPrimary dark:text-brand-textPrimary">
                    <img
                        src="/shape of the day logo.png"
                        alt="Shape of the Day"
                        className="w-8 h-8"
                    />
                    Shape of the Day
                </div>

                {/* Class Selector (Teacher View Only) */}
                {view === 'teacher' && (
                    <div className="relative">
                        <button
                            onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                            className="flex items-center gap-3 px-4 py-2 bg-brand-accent/5 border border-brand-accent/20 rounded-xl text-brand-accent hover:bg-brand-accent/10 transition-colors min-w-[200px] justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentClass?.color || '#3B82F6' }} />
                                <span className="font-bold text-sm">
                                    {currentClass?.name || 'Select Class'}
                                </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isClassDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsClassDropdownOpen(false)}
                                />
                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl shadow-xl border-[3px] border-gray-200 dark:border-gray-700 z-20 overflow-hidden animate-in zoom-in-95 duration-100">
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                        {classrooms.map(cls => (
                                            <button
                                                key={cls.id}
                                                onClick={() => {
                                                    setCurrentClassId(cls.id);
                                                    setIsClassDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentClassId === cls.id
                                                    ? 'bg-brand-accent/10 text-brand-accent'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-textDarkPrimary dark:text-brand-textPrimary'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cls.color || '#3B82F6' }} />
                                                    <span className="truncate max-w-[140px]">{cls.name}</span>
                                                </div>
                                                {currentClassId === cls.id && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-2 border-t-[3px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                        <button
                                            onClick={() => {
                                                setIsClassModalOpen(true, null);
                                                setIsClassDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-accent text-white rounded-lg text-sm font-bold hover:bg-brand-accent/90 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Add New Class
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    {/* Teacher View: QR Code Sidebar Toggle */}
                    {view === 'teacher' && (
                        <button
                            onClick={() => useClassStore.getState().toggleSidebar()}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-accent/5 text-blue-500 hover:bg-blue-900/30 transition-colors border border-blue-500/20"
                            title="Class Connection Info"
                        >
                            <QrCode className="w-5 h-5" />
                            <span className="text-sm font-bold">Join Code</span>
                        </button>
                    )}


                </div>
            </nav>

            {/* Main Content Area */}
            <main>
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
