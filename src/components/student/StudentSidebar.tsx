import React from 'react';
import { ListTodo, CalendarDays, ChevronLeft, ChevronRight, Settings, FolderOpen, X } from 'lucide-react';
import { ProgressBar } from '../shared/ProgressIndicator';

interface StudentSidebarProps {
    tasksCompleted: number;
    totalTasks: number;
    activeTab: 'tasks' | 'schedule' | 'projects';
    onTabChange: (tab: 'tasks' | 'schedule' | 'projects') => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    onOpenSettings: () => void;
    // Mobile-specific props
    isMobileOpen?: boolean;
    onMobileClose?: () => void;
}

/**
 * StudentSidebar - Responsive sidebar for student view
 *
 * Desktop: Static sidebar that can be collapsed
 * Mobile: Slide-in panel from left, triggered by hamburger menu
 */
const StudentSidebar: React.FC<StudentSidebarProps> = ({
    tasksCompleted,
    totalTasks,
    activeTab,
    onTabChange,
    isCollapsed,
    onToggleCollapse,
    onOpenSettings,
    isMobileOpen = false,
    onMobileClose
}) => {
    const navItems = [
        { id: 'tasks' as const, label: 'Tasks', icon: ListTodo, priority: 'primary' },
        { id: 'projects' as const, label: 'Projects', icon: FolderOpen, priority: 'secondary' },
        { id: 'schedule' as const, label: 'Schedule', icon: CalendarDays, priority: 'primary' },
    ];

    const handleTabChange = (tab: 'tasks' | 'schedule' | 'projects') => {
        onTabChange(tab);
        // Close mobile sidebar when a tab is selected
        if (onMobileClose) {
            onMobileClose();
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onMobileClose}
                aria-hidden="true"
            />

            {/* Sidebar */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50
                ${isCollapsed ? 'md:w-20' : 'md:w-72'} w-72
                bg-brand-lightSurface dark:bg-brand-darkSurface
                transform transition-transform duration-300 ease-in-out
                flex flex-col h-full overflow-hidden
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                shadow-lg md:shadow-none
            `}
                aria-label="Student navigation"
            >
                {/* Sidebar Header - Logo/Branding with Close button on mobile */}
                <div className="h-16 shrink-0 flex items-center justify-between px-4">
                    <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center md:w-12' : ''}`}>
                        <img
                            src="/shape of the day logo.png"
                            alt="Shape of the Day"
                            className="w-10 h-10 shrink-0 aspect-square object-contain"
                        />
                        <div className={`
                            flex flex-col justify-center overflow-hidden
                            transition-all duration-300 ease-in-out
                            ${isCollapsed ? 'md:w-0 md:opacity-0' : 'opacity-100'}
                        `}>
                            <span className="font-bold text-base text-brand-textDarkPrimary dark:text-brand-textPrimary whitespace-nowrap leading-tight">
                                Shape of the Day
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap leading-tight">
                                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    </div>
                    {/* Mobile Close Button */}
                    <button
                        onClick={onMobileClose}
                        className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-gray-500 dark:text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-brand-textPrimary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                        aria-label="Close navigation menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav id="student-sidebar-nav" aria-label="Student navigation" className="shrink-0 p-4">
                    <ul className="space-y-2 list-none m-0 p-0">
                        {navItems.map((item) => (
                            <li key={item.id} className="flex">
                                <button
                                    onClick={() => handleTabChange(item.id)}
                                    className={`
                                        flex-1 relative flex items-center rounded-lg transition-all duration-200 font-bold border-2
                                        bg-brand-lightSurface dark:bg-brand-darkSurface
                                        focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-brand-darkSurface
                                        ${activeTab === item.id
                                            ? 'border-brand-accent text-brand-accent'
                                            : 'border-transparent hover:border-gray-600 dark:hover:border-gray-400 text-gray-500 dark:text-gray-400'
                                        }
                                        ${isCollapsed ? 'md:w-12 md:h-12 md:justify-center' : ''} w-full h-12
                                    `}
                                    title={isCollapsed ? item.label : undefined}
                                    aria-label={item.label}
                                >
                                    <div className="flex items-center justify-center w-12 shrink-0">
                                        <item.icon className="w-5 h-5" />
                                    </div>
                                    <span className={`
                                        whitespace-nowrap transition-all duration-200
                                        ${isCollapsed ? 'md:w-0 md:opacity-0' : 'opacity-100'}
                                    `}>
                                        {item.label}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Progress Card */}
                <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 space-y-3 ${isCollapsed ? 'md:hidden' : ''}`}>
                    {totalTasks > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border-2 border-gray-100 dark:border-gray-700">
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

                {/* Bottom Actions */}
                <div className="shrink-0 mt-auto p-4 space-y-2 bg-brand-lightSurface dark:bg-brand-darkSurface">
                    {/* Collapse Toggle - Desktop only */}
                    <button
                        onClick={onToggleCollapse}
                        aria-expanded={!isCollapsed}
                        aria-controls="student-sidebar-nav"
                        aria-label={isCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
                        className={`
                            hidden md:flex group items-center h-10 rounded-lg transition-all duration-200 font-bold
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30
                            ${isCollapsed ? 'w-12 justify-center' : 'w-full'}
                        `}
                        title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
                    >
                        <div className="flex items-center justify-center w-12 shrink-0 text-brand-accent">
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

                    <div className={`h-px bg-gray-200 dark:bg-gray-700 ${isCollapsed ? 'md:mx-1' : ''}`} />

                    {/* Settings Button */}
                    <button
                        onClick={onOpenSettings}
                        className={`
                            group flex items-center h-10 rounded-lg transition-all duration-200 font-bold
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30
                            ${isCollapsed ? 'md:w-12 md:justify-center' : ''} w-full
                        `}
                        title={isCollapsed ? 'Settings' : undefined}
                    >
                        <div className="flex items-center justify-center w-12 shrink-0 text-gray-500 group-hover:text-brand-accent">
                            <Settings className="w-5 h-5" />
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-200 flex-1 text-left
                            text-gray-500 group-hover:text-brand-textDarkPrimary dark:group-hover:text-brand-textPrimary
                            ${isCollapsed ? 'md:w-0 md:opacity-0' : 'opacity-100'}
                        `}>
                            Settings
                        </span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default StudentSidebar;
