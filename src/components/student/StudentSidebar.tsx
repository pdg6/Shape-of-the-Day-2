import React from 'react';
import { Moon, Sun, LogOut, UserCircle, School, CalendarDays, ListChecks, ListTodo, ChevronLeft, ChevronRight } from 'lucide-react';
import { useClassStore } from '../../store/classStore';

interface StudentSidebarProps {
    studentName: string;
    className: string;
    tasksCompleted: number;
    totalTasks: number;
    onSignOut: () => void;
    onEditName: () => void;
    activeTab: 'tasks' | 'schedule';
    onTabChange: (tab: 'tasks' | 'schedule') => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

/**
 * StudentSidebar - Desktop sidebar for student view
 *
 * Contains navigation (Tasks, Schedule) and student info:
 * 1. Student Name (personalization)
 * 2. Class Name (context)
 * 3. Current Date (temporal context)
 * 4. Tasks Progress (status)
 * 5. Dark/Light Mode Toggle (preference)
 * 6. Sign Out Button (exit action)
 */
const StudentSidebar: React.FC<StudentSidebarProps> = ({
    studentName,
    className,
    tasksCompleted,
    totalTasks,
    onSignOut,
    onEditName,
    activeTab,
    onTabChange,
    isCollapsed,
    onToggleCollapse
}) => {
    const { darkMode, toggleDarkMode } = useClassStore();

    const tasksLeft = totalTasks - tasksCompleted;
    const progressPercent = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    const navItems = [
        { id: 'tasks' as const, label: 'Tasks', icon: ListTodo },
        { id: 'schedule' as const, label: 'Schedule', icon: CalendarDays },
    ];

    return (
        <aside className={`
            hidden md:flex flex-col h-full overflow-hidden
            ${isCollapsed ? 'w-20' : 'w-72'}
            bg-brand-lightSurface dark:bg-brand-darkSurface
            border-r-[3px] border-gray-200 dark:border-gray-700
            transition-all duration-300 ease-in-out
        `}>
            {/* Student Profile Section */}
            <div className={`flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 ${isCollapsed ? 'px-2' : ''}`}>
                <button
                    onClick={onEditName}
                    className={`
                        w-full flex items-center gap-3 p-2
                        bg-emerald-50 dark:bg-emerald-900/20
                        rounded-xl border-[2px] border-emerald-200 dark:border-emerald-800
                        hover:border-emerald-300 dark:hover:border-emerald-700
                        transition-all duration-200
                        ${isCollapsed ? 'justify-center' : ''}
                    `}
                    title={isCollapsed ? studentName : undefined}
                >
                    <div className="flex items-center justify-center w-10 h-10 flex-shrink-0 text-emerald-500">
                        <UserCircle className="w-8 h-8" />
                    </div>
                    <div className={`flex-1 text-left transition-all duration-200 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'opacity-100'}`}>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Student</p>
                        <p className="text-sm font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary truncate">
                            {studentName}
                        </p>
                    </div>
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-shrink-0 p-4 space-y-2">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={`
                            relative flex items-center rounded-xl transition-all duration-200 font-bold border-[3px]
                            bg-brand-lightSurface dark:bg-brand-darkSurface
                            focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/50
                            ${activeTab === item.id
                                ? 'border-emerald-500 text-emerald-500'
                                : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:border-emerald-400'
                            }
                            ${isCollapsed ? 'w-12 h-12 justify-center' : 'w-full h-12'}
                        `}
                        title={isCollapsed ? item.label : undefined}
                        aria-label={item.label}
                    >
                        <div className="flex items-center justify-center w-12 flex-shrink-0">
                            <item.icon className="w-5 h-5" />
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-200
                            ${isCollapsed ? 'w-0 opacity-0' : 'opacity-100'}
                        `}>
                            {item.label}
                        </span>
                    </button>
                ))}
            </nav>

            {/* Info Cards - Scrollable middle section */}
            <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-3 ${isCollapsed ? 'hidden' : ''}`}>
                {/* Class Name */}
                <div className="flex items-center gap-3 p-3 bg-brand-light dark:bg-brand-dark rounded-xl border-[2px] border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center w-8 h-8 flex-shrink-0 text-blue-500">
                        <School className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Class</p>
                        <p className="text-sm font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary truncate">
                            {className}
                        </p>
                    </div>
                </div>

                {/* Current Date */}
                <div className="flex items-center gap-3 p-3 bg-brand-light dark:bg-brand-dark rounded-xl border-[2px] border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center w-8 h-8 flex-shrink-0 text-purple-500">
                        <CalendarDays className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Today</p>
                        <p className="text-sm font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            {currentDate}
                        </p>
                    </div>
                </div>

                {/* Tasks Progress */}
                <div className="p-3 bg-brand-light dark:bg-brand-dark rounded-xl border-[2px] border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 flex-shrink-0 text-amber-500">
                            <ListChecks className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Progress</p>
                            <p className="text-sm font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
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
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 text-center">
                        {tasksCompleted} of {totalTasks} completed
                    </p>
                </div>
            </div>

            {/* Bottom Actions - Always visible at bottom */}
            <div className="flex-shrink-0 mt-auto p-4 space-y-2 border-t border-gray-200 dark:border-gray-700 bg-brand-lightSurface dark:bg-brand-darkSurface">
                {/* Collapse Toggle */}
                <button
                    onClick={onToggleCollapse}
                    className={`
                        group flex items-center h-10 rounded-xl transition-all duration-200 font-bold
                        ${isCollapsed ? 'w-12 justify-center' : 'w-full'}
                    `}
                    title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
                >
                    <div className="flex items-center justify-center w-12 flex-shrink-0 text-emerald-500">
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </div>
                    <span className={`
                        whitespace-nowrap transition-all duration-200 flex-1 text-left
                        text-gray-500 group-hover:text-emerald-500
                        ${isCollapsed ? 'w-0 opacity-0' : 'opacity-100'}
                    `}>
                        Collapse
                    </span>
                </button>

                <div className={`h-px bg-gray-200 dark:bg-gray-700 ${isCollapsed ? 'mx-1' : ''}`} />

                {/* Dark/Light Mode Toggle */}
                <button
                    onClick={toggleDarkMode}
                    className={`
                        group flex items-center h-10 rounded-xl transition-all duration-200 font-bold
                        ${isCollapsed ? 'w-12 justify-center' : 'w-full'}
                    `}
                    title={isCollapsed ? (darkMode ? 'Dark Mode' : 'Light Mode') : undefined}
                >
                    <div className={`flex items-center justify-center w-12 flex-shrink-0 ${darkMode ? 'text-indigo-500' : 'text-amber-500'}`}>
                        {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </div>
                    <span className={`
                        whitespace-nowrap transition-all duration-200 flex-1 text-left
                        text-gray-500 group-hover:text-brand-textDarkPrimary dark:group-hover:text-brand-textPrimary
                        ${isCollapsed ? 'w-0 opacity-0' : 'opacity-100'}
                    `}>
                        {darkMode ? 'Dark Mode' : 'Light Mode'}
                    </span>
                    {!isCollapsed && (
                        <div className={`mr-2 w-10 h-6 rounded-full p-1 transition-colors ${darkMode ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                    )}
                </button>

                {/* Sign Out */}
                <button
                    onClick={onSignOut}
                    className={`
                        group flex items-center h-10 rounded-xl transition-all duration-200 font-bold
                        ${isCollapsed ? 'w-12 justify-center' : 'w-full'}
                    `}
                    title={isCollapsed ? 'Sign Out' : undefined}
                >
                    <div className="flex items-center justify-center w-12 flex-shrink-0 text-red-500">
                        <LogOut className="w-5 h-5" />
                    </div>
                    <span className={`
                        whitespace-nowrap transition-all duration-200
                        text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-400
                        ${isCollapsed ? 'w-0 opacity-0' : 'opacity-100'}
                    `}>
                        Sign Out
                    </span>
                </button>
            </div>
        </aside>
    );
};

export default StudentSidebar;
