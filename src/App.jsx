import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { LayoutDashboard, GraduationCap, LogOut, Moon, Sun } from 'lucide-react';
import GoogleSignInButton from './components/shared/GoogleSignInButton';
import JoinRoom from './components/shared/JoinRoom';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import StudentView from './components/student/StudentView';
import StudentNameModal from './components/student/StudentNameModal';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

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
    // TODO: Implement actual Google Sign In
    console.log('Login clicked');
  };

  const handleLogout = async () => {
    await signOut(auth);
    setView('landing');
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

      <StudentNameModal
        isOpen={showNameModal}
        onSubmit={handleNameSubmit}
      />

      {/* Navigation Bar */}
      <nav className="bg-brand-lightSurface dark:bg-brand-darkSurface border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between transition-colors duration-200">
        <div className="flex items-center gap-2 font-bold text-xl text-brand-textDarkPrimary dark:text-brand-textPrimary">
          <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center text-white">
            S
          </div>
          Shape of the Day
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {user && (
            <div className="flex items-center gap-2 text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary">
              <img
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}`}
                alt="Profile"
                className="w-8 h-8 rounded-full"
              />
              <span className="hidden sm:inline">{user.email}</span>
            </div>
          )}

          {user && (
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {view === 'landing' && (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 -mt-16">
            <div className="text-center mb-12 space-y-4">
              <div className="w-20 h-20 bg-brand-accent rounded-2xl flex items-center justify-center text-white text-4xl font-bold mx-auto shadow-xl mb-6">
                S
              </div>
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
        {view === 'student' && <StudentView studentName={studentName} />}
      </main>
    </div>
  );
}

export default App;
