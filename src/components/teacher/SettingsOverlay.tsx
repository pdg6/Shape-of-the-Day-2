import React from 'react';
import { Moon, Sun, LogOut, QrCode, BarChart2, User, BookOpen, School, ListTodo, Presentation, Activity } from 'lucide-react';
import { useClassStore } from '../../store/classStore';

interface SettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout?: () => void;
    onShowJoinCode?: () => void;
    onShowData?: () => void;
    teacherName?: string;
    className?: string;
    activeTab?: 'tasks' | 'shape' | 'live' | 'reports' | 'classrooms';
    onTabChange?: (tab: 'tasks' | 'shape' | 'live' | 'reports' | 'classrooms') => void;
}

const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
    isOpen,
    onClose,
    onLogout,
    onShowJoinCode,
    onShowData,
    teacherName = 'Teacher',
    className = '',
    activeTab,
    onTabChange
}) => {
    const { darkMode, toggleDarkMode } = useClassStore();

    if (!isOpen) return null;

    return (
        <div className="space-y-3">
            {/* Navigation Section - Only show if navigation props provided */}
            {activeTab && onTabChange && (
                <>
                    <div className="grid grid-cols-5 gap-1.5 mb-4">
                        <button
                            onClick={() => {
                                onTabChange('classrooms');
                                onClose();
                            }}
                            className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'classrooms'
                                    ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                                    : 'border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400 text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            <School size={20} />
                            <span className="text-[10px] font-bold">Classes</span>
                        </button>
                        <button
                            onClick={() => {
                                onTabChange('tasks');
                                onClose();
                            }}
                            className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'tasks'
                                    ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                                    : 'border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400 text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            <ListTodo size={20} />
                            <span className="text-[10px] font-bold">Tasks</span>
                        </button>
                        <button
                            onClick={() => {
                                onTabChange('shape');
                                onClose();
                            }}
                            className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'shape'
                                    ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                                    : 'border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400 text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            <Presentation size={20} />
                            <span className="text-[10px] font-bold">Shape</span>
                        </button>
                        <button
                            onClick={() => {
                                onTabChange('live');
                                onClose();
                            }}
                            className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'live'
                                    ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                                    : 'border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400 text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            <Activity size={20} />
                            <span className="text-[10px] font-bold">Live</span>
                        </button>
                        <button
                            onClick={() => {
                                onTabChange('reports');
                                onClose();
                            }}
                            className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'reports'
                                    ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                                    : 'border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400 text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            <BarChart2 size={20} />
                            <span className="text-[10px] font-bold">Reports</span>
                        </button>
                    </div>
                    {/* Divider */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                </>
            )}

            {/* Teacher Name */}
            <div className="bg-brand-light dark:bg-brand-dark rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent">
                        <User size={20} />
                    </div>
                    <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        Teacher
                    </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {teacherName}
                </span>
            </div>

            {/* Class Name */}
            {className && (
                <div className="bg-brand-light dark:bg-brand-dark rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
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
            )}

            {/* Dark/Light Mode Toggle - Near top */}
            <div className="bg-brand-light dark:bg-brand-dark rounded-xl p-3 flex items-center justify-between">
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

            {/* Data & Analytics */}
            {onShowData && (
                <button
                    onClick={() => {
                        onShowData();
                        onClose();
                    }}
                    className="w-full bg-brand-light dark:bg-brand-dark rounded-xl p-3 flex items-center justify-between border-2 border-transparent transition-all duration-200 hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent">
                            <BarChart2 size={20} />
                        </div>
                        <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            Data & Analytics
                        </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        View insights
                    </span>
                </button>
            )}

            {/* Join Code */}
            {onShowJoinCode && (
                <button
                    onClick={() => {
                        onShowJoinCode();
                        onClose();
                    }}
                    className="w-full bg-brand-light dark:bg-brand-dark rounded-xl p-3 flex items-center justify-between border-2 border-transparent transition-all duration-200 hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                            <QrCode size={20} />
                        </div>
                        <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            Join Code
                        </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Show code
                    </span>
                </button>
            )}

            {/* Sign Out */}
            {onLogout && (
                <button
                    onClick={() => {
                        onLogout();
                        onClose();
                    }}
                    className="w-full bg-brand-light dark:bg-brand-dark rounded-xl p-3 flex items-center justify-between border-2 border-transparent transition-all duration-200 hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
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
                        Leave dashboard
                    </span>
                </button>
            )}
        </div>
    );
};

export default SettingsOverlay;
