import React from 'react';
import { LogOut, UserCircle, ListTodo, CalendarDays, ChevronLeft, ChevronRight, Settings, FolderOpen } from 'lucide-react';
import { ProgressBar } from '../shared/ProgressIndicator';

interface StudentSidebarProps {
    studentName: string;
    className: string;
    tasksCompleted: number;
    totalTasks: number;
    onSignOut: () => void;
    onEditName: () => void;
    activeTab: 'tasks' | 'schedule' | 'projects';
    onTabChange: (tab: 'tasks' | 'schedule' | 'projects') => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onOpenSettings: () => void;
}

/**
 * StudentSidebar - Desktop sidebar for student view
 *
 * Implements Serial Position Effect: Most important items (Tasks, Sign Out)
 * are placed at first and last positions for better recall.
 * 
 * Contains navigation (Tasks, Projects, Schedule) and student info:
 * 1. Student Name (personalization)
 * 2. Class Name (context)
 * 3. Tasks Progress (Goal-Gradient Effect)
 * 4. Dark/Light Mode Toggle (preference)
 * 5. Sign Out Button (exit action)
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
    onToggleCollapse,
    onOpenSettings
}) => {
    // Serial Position Effect: Primary action (Tasks) first, secondary items middle, important action (Schedule) last
    const navItems = [
        { id: 'tasks' as const, label: 'Tasks', icon: ListTodo, priority: 'primary' },
        { id: 'projects' as const, label: 'Projects', icon: FolderOpen, priority: 'secondary' },
        { id: 'schedule' as const, label: 'Schedule', icon: CalendarDays, priority: 'primary' },
    ];

    return (
        <aside className={`
            hidden md:flex flex-col h-full overflow-hidden
            ${isCollapsed ? 'w-20' : 'w-72'}
            bg-brand-lightSurface dark:bg-brand-darkSurface
            transition-all duration-300 ease-in-out
        `}>
            {/* Logo/Branding - Same height as header (h-16) */}
            <div className="h-16 flex-shrink-0 flex items-center px-4 border-b border-gray-200 dark:border-gray-800">
                <div className={`flex items-center gap-2 transition-all duration-300 ${isCollapsed ? 'justify-center w-12' : ''}`}>
                    <img
                        src="/shape of the day logo.png"
                        alt="Shape of the Day"
                        className="w-8 h-8 flex-shrink-0"
                    />
                    <span className={`
                        font-bold text-lg text-brand-textDarkPrimary dark:text-brand-textPrimary whitespace-nowrap
                        transition-all duration-300 ease-in-out
                        ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'opacity-100'}
                    `}>
                        Shape of the Day
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav id="student-sidebar-nav" aria-label="Student navigation" className="flex-shrink-0 p-4">
                <ul className="space-y-2 list-none m-0 p-0">
                    {navItems.map((item) => (
                        <li key={item.id} className="flex">
                            <button
                                onClick={() => onTabChange(item.id)}
                                className={`
                                    flex-1 relative flex items-center rounded-xl transition-all duration-200 font-bold border-[3px]
                                    bg-brand-lightSurface dark:bg-brand-darkSurface
                                    focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-brand-darkSurface
                                    ${activeTab === item.id
                                        ? 'border-brand-accent text-brand-accent'
                                        : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400'
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
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Info Cards - Removed as requested */}
            <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-3 ${isCollapsed ? 'hidden' : ''}`}>
                {/* Goal-Gradient Effect: Show progress to motivate completion */}
                {totalTasks > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border-2 border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Progress</span>
                            {tasksCompleted === totalTasks && (
                                <span className="text-xs font-bold text-green-500">🎉 Complete!</span>
                            )}
                        </div>
                        <ProgressBar 
                            current={tasksCompleted} 
                            total={totalTasks}
                            variant="success"
                            size="md"
                        />
                    </div>
                )}
            </div>

            {/* Bottom Actions - Always visible at bottom */}
            <div className="flex-shrink-0 mt-auto p-4 space-y-2 bg-brand-lightSurface dark:bg-brand-darkSurface">
                {/* Collapse Toggle */}
                <button
                    onClick={onToggleCollapse}
                    aria-expanded={!isCollapsed}
                    aria-controls="student-sidebar-nav"
                    aria-label={isCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
                    className={`
                        group flex items-center h-10 rounded-xl transition-all duration-200 font-bold
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30
                        ${isCollapsed ? 'w-12 justify-center' : 'w-full'}
                    `}
                    title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
                >
                    <div className="flex items-center justify-center w-12 flex-shrink-0 text-brand-accent">
                        {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </div>
                    <span className={`
                        whitespace-nowrap transition-all duration-200 flex-1 text-left
                        text-gray-500 group-hover:text-brand-accent
                        ${isCollapsed ? 'w-0 opacity-0' : 'opacity-100'}
                    `}>
                        Collapse
                    </span>
                </button>

                <div className={`h-px bg-gray-200 dark:bg-gray-700 ${isCollapsed ? 'mx-1' : ''}`} />

                {/* Settings Button */}
                <button
                    onClick={onOpenSettings}
                    className={`
                        group flex items-center h-10 rounded-xl transition-all duration-200 font-bold
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30
                        ${isCollapsed ? 'w-12 justify-center' : 'w-full'}
                    `}
                    title={isCollapsed ? 'Settings' : undefined}
                >
                    <div className="flex items-center justify-center w-12 flex-shrink-0 text-gray-500 group-hover:text-brand-accent">
                        <Settings className="w-5 h-5" />
                    </div>
                    <span className={`
                        whitespace-nowrap transition-all duration-200 flex-1 text-left
                        text-gray-500 group-hover:text-brand-textDarkPrimary dark:group-hover:text-brand-textPrimary
                        ${isCollapsed ? 'w-0 opacity-0' : 'opacity-100'}
                    `}>
                        Settings
                    </span>
                </button>

                {/* Sign Out */}
                <button
                    onClick={onSignOut}
                    className={`
                        group flex items-center h-10 rounded-xl transition-all duration-200 font-bold
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30
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
