import React, { useState } from 'react';
import {
    LayoutDashboard,
    Clock,
    Users,
    Calendar,
    Activity,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    LucideIcon
} from 'lucide-react';
import TaskManager from './TaskManager';
import ShapeOfDay from './ShapeOfDay';
import LiveView from './LiveView';
import StudentRoster from './StudentRoster';
import ClassPlanner from './ClassPlanner';

/**
 * Definition for a navigation item in the sidebar.
 */
interface MenuItem {
    id: 'tasks' | 'shape' | 'live' | 'roster' | 'planner';
    label: string;
    icon: LucideIcon;
}

/**
 * TeacherDashboard Component
 * 
 * The main layout for the teacher's view. It includes:
 * 1. A collapsible sidebar for navigation.
 * 2. A mobile-responsive menu.
 * 3. A content area that switches between different sub-components (TaskManager, LiveView, etc.).
 */
const TeacherDashboard: React.FC = () => {
    // State to track the currently active view
    const [activeTab, setActiveTab] = useState<MenuItem['id']>('tasks');

    // State for sidebar visibility (Desktop: collapsed/expanded, Mobile: hidden/shown)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems: MenuItem[] = [
        { id: 'tasks', label: 'Task Manager', icon: LayoutDashboard },
        { id: 'shape', label: 'Shape of Day', icon: Clock },
        { id: 'live', label: 'Live View', icon: Activity },
        { id: 'roster', label: 'Student Roster', icon: Users },
        { id: 'planner', label: 'Class Planner', icon: Calendar },
    ];

    /**
     * Renders the appropriate component based on the active tab.
     */
    const renderContent = () => {
        switch (activeTab) {
            case 'tasks': return <TaskManager />;
            case 'shape': return <ShapeOfDay />;
            case 'live': return <LiveView />;
            case 'roster': return <StudentRoster />;
            case 'planner': return <ClassPlanner />;
            default: return <TaskManager />;
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-brand-light dark:bg-brand-dark transition-colors duration-300">
            {/* Mobile Menu Overlay (Darkens background when menu is open on mobile) */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside
                className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-brand-lightSurface dark:bg-brand-darkSurface border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'w-64' : 'w-20'}
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                <div className="h-full flex flex-col">
                    {/* Mobile Header (Close button) */}
                    <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                        <span className="font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">Menu</span>
                        <button onClick={() => setIsMobileMenuOpen(false)}>
                            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id);
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 border-2
                    ${isActive
                                            ? 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent'
                                            : 'border-transparent text-brand-textDarkSecondary dark:text-brand-textSecondary hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-brand-textDarkPrimary dark:hover:text-brand-textPrimary'}
                  `}
                                    title={!isSidebarOpen ? item.label : ''}
                                >
                                    <Icon className={`w-6 h-6 shrink-0 ${isActive ? 'text-brand-accent' : 'text-gray-400 dark:text-gray-500'}`} />
                                    <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden lg:block'}`}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Sidebar Toggle Button (Desktop only) */}
                    <div className="hidden lg:flex p-4 border-t border-gray-200 dark:border-gray-800">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="w-full flex items-center justify-center p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                        >
                            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Menu Trigger Bar */}
                <div className="lg:hidden p-4 bg-brand-lightSurface dark:bg-brand-darkSurface border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-semibold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        {menuItems.find(i => i.id === activeTab)?.label}
                    </span>
                </div>

                {/* Actual Page Content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TeacherDashboard;
