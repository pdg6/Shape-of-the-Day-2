import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, GraduationCap, LogOut } from 'lucide-react';
import GoogleSignInButton from './components/shared/GoogleSignInButton';
import JoinRoom from './components/shared/JoinRoom';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentView from './components/student/StudentView';
import StudentNameModal from './components/student/StudentNameModal';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import toast from 'react-hot-toast';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing'); // landing, teacher, student
  const [activeTab, setActiveTab] = useState('student'); // student, teacher
  const [loading, setLoading] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [studentName, setStudentName] = useState('');
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

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // For now, default to teacher view if authenticated
        // In real app, we'd check claims or let user choose
        setView('teacher');
      } else {
        setView('landing');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // User will be set automatically by onAuthChange listener
      setView('teacher');
      toast.success('Successfully signed in!');
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Failed to sign in. Please try again.');
    }
  };

  const handleLogout = async () => {
    // Sign out from Firebase if user is authenticated
    if (user) {
      await signOut(auth);
    }

    // Reset all application state
    setUser(null);
    setStudentName('');
    setView('landing');
    setActiveTab('student');
    setShowNameModal(false);
  };

  const handleJoinRoom = (code) => {
    console.log('Joining room:', code);
    setShowNameModal(true);
  };

  const handleNameSubmit = (name) => {
    setStudentName(name);
    setShowNameModal(false);
    setView('student');
    // In real app, we'd save this to session/local storage or context
  };

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

      {/* Main Content */}
      <main>
        {view === 'landing' && (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 -mt-16">
            <div className="text-center mb-12 space-y-4">
              <img
                src="/shape of the day logo.png"
                alt="Shape of the Day"
                className="w-32 h-32 mx-auto mb-6"
              />
              <h1 className="text-4xl md:text-6xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary tracking-tight">
                Shape of the Day
              </h1>
              <p className="text-xl text-brand-textDarkSecondary dark:text-brand-textSecondary max-w-lg mx-auto">
                Seamless classroom management for modern teachers and students.
              </p>
            </div>

            <div className="w-full max-w-md bg-brand-lightSurface dark:bg-brand-darkSurface rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Tabs */}
              <div className="flex">
                <button
                  onClick={() => setActiveTab('student')}
                  className={`flex-1 py-4 text-center font-bold transition-colors ${activeTab === 'student'
                    ? 'bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkPrimary dark:text-brand-textPrimary'
                    : 'bg-brand-light dark:bg-brand-dark text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  Student
                </button>
                <button
                  onClick={() => setActiveTab('teacher')}
                  className={`flex-1 py-4 text-center font-bold transition-colors ${activeTab === 'teacher'
                    ? 'bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkPrimary dark:text-brand-textPrimary'
                    : 'bg-brand-light dark:bg-brand-dark text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  Teacher
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                {activeTab === 'student' ? (
                  <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="text-green-600 dark:text-green-400">
                      <GraduationCap className="w-12 h-12" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">Student</h2>
                      <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">Join a room to see your daily tasks.</p>
                    </div>
                    <JoinRoom onJoin={handleJoinRoom} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="text-blue-600 dark:text-blue-400">
                      <LayoutDashboard className="w-12 h-12" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">Teacher</h2>
                      <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">Manage your classroom, tasks, and schedule.</p>
                    </div>
                    <GoogleSignInButton onClick={handleLogin} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'teacher' && <TeacherDashboard />}
        {view === 'student' && <StudentView studentName={studentName} onEditName={() => setShowNameModal(true)} />}
      </main>
    </div>
  );
}

export default App;
