import React, { useState } from 'react';
import { LayoutDashboard, GraduationCap } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton';
import JoinRoom from './JoinRoom';

/**
 * Props for the LandingPage component.
 * @property onLogin - Callback triggered when the teacher clicks "Sign in with Google".
 * @property onJoin - Callback triggered when a student enters a code to join a room.
 */
interface LandingPageProps {
    onLogin: () => void;
    onJoin: (code: string) => void;
}

/**
 * LandingPage Component
 * 
 * The initial welcome screen of the application.
 * Allows users to choose between "Student" and "Teacher" modes.
 * - Students can join a room via code.
 * - Teachers can sign in with Google.
 */
const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onJoin }) => {
    // Local state to toggle between Student and Teacher tabs
    const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');

    return (
        <div className="min-h-screen flex flex-col items-center md:justify-center p-4 py-12">
            <div className="text-center mb-6 md:mb-12 space-y-4">
                <img
                    src="/shape of the day logo.png"
                    alt="Shape of the Day"
                    className="w-20 h-20 md:w-32 md:h-32 mx-auto mb-4 md:mb-6"
                />
                <h1 className="text-3xl md:text-6xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary tracking-tight">
                    Shape of the Day
                </h1>
                <p className="text-lg md:text-xl text-brand-textDarkSecondary dark:text-brand-textSecondary max-w-lg mx-auto">
                    A digital organizer for teachers and students
                </p>
            </div>

            <div className="w-full max-w-md bg-brand-lightSurface dark:bg-brand-darkSurface rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Tabs for switching modes */}
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('student')}
                        className={`flex-1 py-4 text-center font-bold transition-colors ${activeTab === 'student'
                            ? 'bg-brand-lightSurface dark:bg-brand-darkSurface text-emerald-600 dark:text-emerald-400'
                            : 'bg-brand-light dark:bg-brand-dark text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        Student
                    </button>
                    <button
                        onClick={() => setActiveTab('teacher')}
                        className={`flex-1 py-4 text-center font-bold transition-colors ${activeTab === 'teacher'
                            ? 'bg-brand-lightSurface dark:bg-brand-darkSurface text-blue-600 dark:text-blue-400'
                            : 'bg-brand-light dark:bg-brand-dark text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        Teacher
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-8">
                    {activeTab === 'student' ? (
                        <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="text-emerald-600 dark:text-emerald-400">
                                <GraduationCap className="w-12 h-12" />
                            </div>
                            <div>
                                <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">Join a room to see your daily tasks.</p>
                            </div>
                            <JoinRoom onJoin={onJoin} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-blue-600 dark:text-blue-400">
                                <LayoutDashboard className="w-12 h-12" />
                            </div>
                            <div>
                                <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">Manage your classroom, tasks, and schedule.</p>
                            </div>
                            <GoogleSignInButton onClick={onLogin} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
