import React, { useState } from 'react';
import { LayoutDashboard, GraduationCap } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton';
import EmailLoginForm from './EmailLoginForm';
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
        <div className="h-screen flex flex-col items-center justify-center p-4 overflow-hidden bg-transparent">
            <div className="text-center mb-6 space-y-2">
                <img
                    src="/shape of the day logo.png"
                    alt="Shape of the Day"
                    className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-2"
                />
                <h1 className="text-3xl md:text-5xl font-black text-brand-textPrimary tracking-tighter uppercase">
                    Shape of the Day
                </h1>
                <p className="text-[10px] font-black text-brand-textMuted uppercase tracking-[0.2em] max-w-md mx-auto">
                    A digital organizer for teachers and students
                </p>
            </div>

            <div className="w-full max-w-sm bg-[var(--color-bg-tile)] rounded-2xl shadow-layered border border-[var(--color-border-subtle)] overflow-hidden">
                {/* Tabs for switching modes */}
                <div className="relative flex p-1.5 bg-[var(--color-bg-tile-alt)] rounded-xl mx-6 mt-6 mb-2 border border-[var(--color-border-subtle)]">
                    <div
                        className={`absolute inset-y-1.5 w-[calc(50%-6px)] bg-[var(--color-bg-tile)] rounded-lg shadow-layered-sm border border-[var(--color-border-subtle)] transition-float ${activeTab === 'student' ? 'left-1.5' : 'left-[calc(50%+4.5px)]'
                            }`}
                    />
                    <button
                        onClick={() => setActiveTab('student')}
                        className={`relative flex-1 py-2 text-center font-black text-xs uppercase tracking-widest transition-all rounded-lg z-10 ${activeTab === 'student'
                            ? 'text-brand-accent'
                            : 'text-brand-textMuted hover:text-brand-textSecondary'
                            }`}
                    >
                        Student
                    </button>
                    <button
                        onClick={() => setActiveTab('teacher')}
                        className={`relative flex-1 py-2 text-center font-black text-xs uppercase tracking-widest transition-all rounded-lg z-10 ${activeTab === 'teacher'
                            ? 'text-brand-accent'
                            : 'text-brand-textMuted hover:text-brand-textSecondary transition-float'
                            }`}
                    >
                        Teacher
                    </button>
                </div>

                {/* Tab Content */}
                <div className="pt-4 pb-6 px-6">
                    {activeTab === 'student' ? (
                        <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="text-brand-accent">
                                <GraduationCap className="w-10 h-10" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-textSecondary">Join a room to see your daily tasks.</p>
                            </div>
                            <JoinRoom onJoin={onJoin} />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-brand-accent">
                                <LayoutDashboard className="w-10 h-10" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-textSecondary">Manage your classroom, tasks, and schedule.</p>
                            </div>
                            <div>

                            </div>

                            {/* Auth Options */}
                            <div className="w-full max-w-[280px] space-y-4">
                                <GoogleSignInButton onClick={onLogin} />

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-[var(--color-border-subtle)]"></div>
                                    </div>
                                    <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="bg-[var(--color-bg-tile)] px-3 text-brand-textMuted">Or continue with</span>
                                    </div>
                                </div>

                                <EmailLoginForm />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
