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
        <div className="h-[calc(100vh-64px)] flex flex-col items-center justify-center p-4 overflow-hidden">
            <div className="text-center mb-6 space-y-2">
                <img
                    src="/shape of the day logo.png"
                    alt="Shape of the Day"
                    className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-2"
                />
                <h1 className="text-2xl md:text-4xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary tracking-tight">
                    Shape of the Day
                </h1>
                <p className="text-base text-brand-textDarkSecondary dark:text-brand-textSecondary max-w-md mx-auto">
                    A digital organizer for teachers and students
                </p>
            </div>

            <div className="w-full max-w-sm bg-brand-lightSurface dark:bg-brand-darkSurface rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Tabs for switching modes */}
                <div className="flex">
                    <button
                        onClick={() => setActiveTab('student')}
                        className={`flex-1 py-3 text-center font-bold text-sm transition-colors ${activeTab === 'student'
                            ? 'bg-brand-lightSurface dark:bg-brand-darkSurface text-emerald-600 dark:text-emerald-400'
                            : 'bg-brand-light dark:bg-brand-dark text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        Student
                    </button>
                    <button
                        onClick={() => setActiveTab('teacher')}
                        className={`flex-1 py-3 text-center font-bold text-sm transition-colors ${activeTab === 'teacher'
                            ? 'bg-brand-lightSurface dark:bg-brand-darkSurface text-blue-600 dark:text-blue-400'
                            : 'bg-brand-light dark:bg-brand-dark text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                    >
                        Teacher
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'student' ? (
                        <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="text-emerald-600 dark:text-emerald-400">
                                <GraduationCap className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary">Join a room to see your daily tasks.</p>
                            </div>
                            <JoinRoom onJoin={onJoin} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-blue-600 dark:text-blue-400">
                                <LayoutDashboard className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary">Manage your classroom, tasks, and schedule.</p>
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
