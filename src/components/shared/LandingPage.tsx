import React, { useState } from 'react';
import { LayoutDashboard, GraduationCap } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton';
import EmailLoginForm from './EmailLoginForm';
import JoinRoom from './JoinRoom';
import { LogoCycleLoop } from './Logo';

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
            <div className="text-center mb-8 space-y-4">
                <LogoCycleLoop size={288} className="mb-4" />
                <h1 className="text-4xl md:text-6xl font-black text-brand-textPrimary tracking-tighter uppercase leading-none">
                    Shape of the Day
                </h1>
                <p className="text-xs font-black text-brand-textMuted uppercase tracking-[0.3em] max-w-md mx-auto">
                    A digital organizer for teachers and students
                </p>
            </div>

            <div className="w-full max-w-sm rounded-2xl overflow-hidden levitated-tile">
                {/* Tabs for switching modes - Redesigned as nested floating tiles */}
                <div className="flex gap-2 p-4">
                    <button
                        onClick={() => setActiveTab('student')}
                        className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-float
                            ${activeTab === 'student'
                                ? 'bg-tile border border-emerald-500/50 text-emerald-500 shadow-layered border-t-[0.5px] border-t-emerald-400/30'
                                : 'bg-tile-alt border border-border-subtle text-brand-textMuted hover:text-brand-textSecondary hover:border-border-strong shadow-layered-sm button-lift-dynamic'
                            }`}
                    >
                        Student
                    </button>
                    <button
                        onClick={() => setActiveTab('teacher')}
                        className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-float
                            ${activeTab === 'teacher'
                                ? 'bg-tile border border-blue-500/50 text-blue-500 shadow-layered border-t-[0.5px] border-t-blue-400/30'
                                : 'bg-tile-alt border border-border-subtle text-brand-textMuted hover:text-brand-textSecondary hover:border-border-strong shadow-layered-sm button-lift-dynamic'
                            }`}
                    >
                        Teacher
                    </button>
                </div>

                {/* Tab Content */}
                <div className="pb-6 px-6">
                    {activeTab === 'student' ? (
                        <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="text-emerald-500">
                                <GraduationCap className="w-10 h-10" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-brand-textSecondary">Join a room to see your daily tasks.</p>
                            </div>
                            <JoinRoom onJoin={onJoin} accentColor="emerald" />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="text-blue-500">
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

                                <div className="relative py-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-border-subtle"></div>
                                    </div>
                                    <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                                        <span className="bg-tile px-3 text-brand-textMuted">Or continue with</span>
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
