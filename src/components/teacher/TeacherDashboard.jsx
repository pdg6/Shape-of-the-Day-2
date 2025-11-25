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
    ChevronRight
} from 'lucide-react';
import TaskManager from './TaskManager';
import ShapeOfDay from './ShapeOfDay';
import LiveView from './LiveView';
import StudentRoster from './StudentRoster';
import ClassPlanner from './ClassPlanner';

const TeacherDashboard = () => {
    const [activeTab, setActiveTab] = useState('tasks');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const menuItems = [
        { id: 'tasks', label: 'Task Manager', icon: LayoutDashboard },
        { id: 'shape', label: 'Shape of Day', icon: Clock },
        { id: 'live', label: 'Live View', icon: Activity },
        { id: 'roster', label: 'Student Roster', icon: Users },
        { id: 'planner', label: 'Class Planner', icon: Calendar },
    ];

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
        <div className="flex h-[calc(100vh-64px)] bg-gray-50">
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-white border-r border-gray-200 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'w-64' : 'w-20'}
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                <div className="h-full flex flex-col">
                    {/* Mobile Header */}
                    <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
                        <span className="font-bold text-gray-800">Menu</span>
                        <button onClick={() => setIsMobileMenuOpen(false)}>
                            <X className="w-6 h-6 text-gray-500" />
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
                    w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
                    ${isActive
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                                    title={!isSidebarOpen ? item.label : ''}
                                >
                                    <Icon className={`w-6 h-6 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                                    <span className={`font-medium whitespace-nowrap transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden lg:block'}`}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Sidebar Toggle (Desktop) */}
                    <div className="hidden lg:flex p-4 border-t border-gray-200">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="w-full flex items-center justify-center p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Menu Trigger */}
                <div className="lg:hidden p-4 bg-white border-b border-gray-200 flex items-center gap-3">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-semibold text-gray-800">
                        {menuItems.find(i => i.id === activeTab)?.label}
                    </span>
                </div>

                {/* Content Area */}
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
