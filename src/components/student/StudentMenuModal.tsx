import React from 'react';
import { X, Moon, Sun, LogOut, User, BookOpen, Calendar, CheckCircle } from 'lucide-react';
import { useClassStore } from '../../store/classStore';

interface StudentMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentName: string;
    className: string;
    tasksCompleted: number;
    totalTasks: number;
    onSignOut: () => void;
    onEditName: () => void;
}

/**
 * StudentMenuModal - Mobile menu modal for student settings and info
 *
 * Displays in logical order:
 * 1. Student Name (personalization)
 * 2. Class Name (context)
 * 3. Current Date (temporal context)
 * 4. Tasks Progress (status)
 * 5. Dark/Light Mode Toggle (preference)
 * 6. Sign Out Button (exit action - at bottom)
 */
const StudentMenuModal: React.FC<StudentMenuModalProps> = ({
    isOpen,
    onClose,
    studentName,
    className,
    tasksCompleted,
    totalTasks,
    onSignOut,
    onEditName
}) => {
    const { darkMode, toggleDarkMode } = useClassStore();

    if (!isOpen) return null;

    const tasksLeft = totalTasks - tasksCompleted;
    const progressPercent = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <div
            className="fixed inset-0 z-overlay bg-black/60 backdrop-blur-sm flex items-end justify-center md:hidden animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-brand-lightSurface dark:bg-brand-darkSurface rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 border-t-[3px] border-x-[3px] border-gray-200 dark:border-gray-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        Menu
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Close menu"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Student Name */}
                    <button
                        onClick={onEditName}
                        className="w-full flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border-[2px] border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                    >
                        <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Student</p>
                            <p className="text-base font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                {studentName}
                            </p>
                        </div>
                        <span className="text-xs text-emerald-500 font-medium">Edit</span>
                    </button>

                    {/* Class Name */}
                    <div className="flex items-center gap-3 p-3 bg-brand-light dark:bg-brand-dark rounded-xl border-[2px] border-gray-200 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Class</p>
                            <p className="text-base font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                {className}
                            </p>
                        </div>
                    </div>

                    {/* Current Date */}
                    <div className="flex items-center gap-3 p-3 bg-brand-light dark:bg-brand-dark rounded-xl border-[2px] border-gray-200 dark:border-gray-700">
                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Today</p>
                            <p className="text-base font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                {currentDate}
                            </p>
                        </div>
                    </div>

                    {/* Tasks Progress */}
                    <div className="p-3 bg-brand-light dark:bg-brand-dark rounded-xl border-[2px] border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Progress</p>
                                <p className="text-base font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    {tasksLeft} task{tasksLeft !== 1 ? 's' : ''} left
                                </p>
                            </div>
                            <span className="text-lg font-bold text-emerald-500">{progressPercent}%</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                            {tasksCompleted} of {totalTasks} completed
                        </p>
                    </div>

                    {/* Dark/Light Mode Toggle */}
                    <button
                        onClick={toggleDarkMode}
                        className="w-full flex items-center gap-3 p-3 bg-brand-light dark:bg-brand-dark rounded-xl border-[2px] border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-indigo-500' : 'bg-amber-500'}`}>
                            {darkMode ? (
                                <Moon className="w-5 h-5 text-white" />
                            ) : (
                                <Sun className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Appearance</p>
                            <p className="text-base font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                {darkMode ? 'Dark Mode' : 'Light Mode'}
                            </p>
                        </div>
                        <div className={`w-12 h-7 rounded-full p-1 transition-colors ${darkMode ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                    </button>

                    {/* Sign Out Button */}
                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl border-[2px] border-red-200 dark:border-red-800 transition-colors font-bold"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>

                {/* Safe area padding for iOS */}
                <div className="h-6 safe-area-pb" />
            </div>
        </div>
    );
};

export default StudentMenuModal;
