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
    onJoin: (code: string, name: string, classId: string) => void;
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
        <div className="h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
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

            <div className="w-full max-w-sm bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Tabs for switching modes */}
                <div className="relative flex p-1 bg-brand-light dark:bg-brand-dark rounded-md mx-6">
                    <div
                        className={`absolute inset-y-1 w-[calc(50%-4px)] bg-white dark:bg-brand-darkSurface rounded-lg shadow-sm transition-all duration-300 ease-out ${activeTab === 'student' ? 'left-1' : 'left-[calc(50%+4px)]'
                            }`}
                    />
                    <button
                        onClick={() => setActiveTab('student')}
                        className={`relative flex-1 py-2.5 text-center font-bold text-lg transition-all rounded-md z-10 ${activeTab === 'student'
                            ? 'text-student-accent'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                            }`}
                    >
                        Student
                    </button>
                    <button
                        onClick={() => setActiveTab('teacher')}
                        className={`relative flex-1 py-2.5 text-center font-bold text-lg transition-all rounded-md z-10 ${activeTab === 'teacher'
                            ? 'text-teacher-accent'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                            }`}
                    >
                        Teacher
                    </button>
                </div>

                {/* Tab Content */}
                <div className="pt-4 pb-6 px-6">
                    {activeTab === 'student' ? (
                        <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="text-student-accent">
                                <GraduationCap className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-base text-brand-textDarkSecondary dark:text-brand-textSecondary">Join a room to see your daily tasks.</p>
                            </div>
                            <JoinRoom onJoin={onJoin} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-teacher-accent">
                                <LayoutDashboard className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-base text-brand-textDarkSecondary dark:text-brand-textSecondary">Manage your classroom, tasks, and schedule.</p>
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
