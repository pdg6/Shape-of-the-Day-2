import React from 'react';
import { Moon, Sun, LogOut, User, BookOpen, Calendar, CheckCircle } from 'lucide-react';
import { useClassStore } from '../../store/classStore';
import { Modal } from '../shared/Modal';

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
 * 3. Dark/Light Mode Toggle (preference)
 * 4. Date (temporal context)
 * 5. Tasks Progress (status)
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

    const tasksLeft = totalTasks - tasksCompleted;
    const progressPercent = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Menu">
            <div className="space-y-3">
                {/* Student Name */}
                <button
                    onClick={() => {
                        onEditName();
                        onClose();
                    }}
                    className="w-full bg-brand-light dark:bg-brand-dark rounded-lg p-3 flex items-center justify-between border-2 border-transparent transition-all duration-200 hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent">
                            <User size={20} />
                        </div>
                        <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            Student
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {studentName}
                        </span>
                        <span className="text-xs text-brand-accent font-medium">Edit</span>
                    </div>
                </button>

                {/* Class Name */}
                <div className="bg-brand-light dark:bg-brand-dark rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent">
                            <BookOpen size={20} />
                        </div>
                        <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            Class
                        </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {className}
                    </span>
                </div>

                {/* Dark/Light Mode Toggle - Near top */}
                <div className="bg-brand-light dark:bg-brand-dark rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
                            {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                        </div>
                        <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            Theme
                        </span>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        role="switch"
                        aria-checked={darkMode}
                        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                        className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 dark:focus:ring-offset-gray-900
                            ${darkMode ? 'bg-brand-accent' : 'bg-gray-300 border border-gray-400'}
                        `}
                    >
                        <span
                            className={`
                                inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out
                                ${darkMode ? 'translate-x-6' : 'translate-x-1'}
                            `}
                        />
                    </button>
                </div>

                {/* Date */}
                <div className="bg-brand-light dark:bg-brand-dark rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                            <Calendar size={20} />
                        </div>
                        <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            Date
                        </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {currentDate}
                    </span>
                </div>

                {/* Tasks Progress */}
                <div className="bg-brand-light dark:bg-brand-dark rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                <CheckCircle size={20} />
                            </div>
                            <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                Progress
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {tasksLeft} left
                            </span>
                            <span className="text-sm font-bold text-brand-accent">{progressPercent}%</span>
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-brand-accent rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                </div>

                {/* Sign Out Button */}
                <button
                    onClick={() => {
                        onSignOut();
                        onClose();
                    }}
                    className="w-full bg-brand-light dark:bg-brand-dark rounded-lg p-3 flex items-center justify-between border-2 border-transparent transition-all duration-200 hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                            <LogOut size={20} />
                        </div>
                        <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            Sign Out
                        </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Leave class
                    </span>
                </button>
            </div>
        </Modal>
    );
};

export default StudentMenuModal;
