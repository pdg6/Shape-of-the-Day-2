import React, { useState } from 'react';
import { LayoutDashboard, Clock, Activity, Users, Menu, X, LogOut, Settings, ChevronRight, Plus, ChevronDown, Moon, Sun, BarChart2, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useClassStore } from '../../store/classStore';
import TaskManager from './TaskManager';
import ShapeOfDay from './ShapeOfDay';
import LiveView from './LiveView';
import ClassroomManager from './ClassroomManager';
import ConnectionSidebar from './ConnectionSidebar';
import { ClassFormModal } from './ClassFormModal';

interface MenuItem {
    id: 'tasks' | 'shape' | 'live' | 'data' | 'classrooms';
    label: string;
    icon: React.ElementType;
}

const TeacherDashboard: React.FC = () => {
    const { logout } = useAuth();
    const {
        classrooms,
        currentClassId,
        setCurrentClassId,
        isSidebarOpen,
        toggleSidebar,
        setSidebarOpen,
        setIsClassModalOpen,
        darkMode,
        toggleDarkMode
    } = useClassStore();

    const [activeTab, setActiveTab] = useState<MenuItem['id']>('tasks');
    const [liveViewSubTab, setLiveViewSubTab] = useState<'tasks' | 'students'>('tasks');
    const [classroomSubTab, setClassroomSubTab] = useState<'classes' | 'history' | 'analytics'>('history');
    const [isClassroomsMenuOpen, setIsClassroomsMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const currentClass = classrooms.find(c => c.id === currentClassId);

    const menuItems: MenuItem[] = [
        { id: 'classrooms', label: currentClass ? currentClass.name : 'Classrooms', icon: Users },
        { id: 'tasks', label: 'Task Manager', icon: LayoutDashboard },
        { id: 'shape', label: 'Shape of Day', icon: Clock },
        { id: 'live', label: 'Live View', icon: Activity },
        { id: 'data', label: 'Data', icon: BarChart2 },
    ];

    const handleTabChange = (tabId: MenuItem['id']) => {
        if (tabId === 'classrooms') {
            setIsClassroomsMenuOpen(!isClassroomsMenuOpen);
            return;
        }

        // Close classrooms menu when clicking other tabs
        setIsClassroomsMenuOpen(false);

        setActiveTab(tabId);
        // Close mobile sidebar on selection
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    };

    const handleClassSelect = (classId: string) => {
        setCurrentClassId(classId);
        // Optional: Navigate to a specific view when class changes?
        // For now, just stay on current view but update context
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'tasks': return <TaskManager />;
            case 'shape': return <ShapeOfDay />;
            case 'live': return <LiveView activeView={liveViewSubTab} />;
            case 'data': return <ClassroomManager activeView={classroomSubTab} />;
            default: return <TaskManager />;
        }
    };

    return (
        <div className="flex h-[100dvh] bg-brand-bg dark:bg-brand-darkBg text-brand-textDarkPrimary dark:text-brand-textPrimary overflow-hidden transition-colors duration-300">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-30
                ${isCollapsed ? 'w-20' : 'w-64'} bg-brand-lightSurface dark:bg-brand-darkSurface
                transform transition-all duration-300 ease-in-out flex flex-col h-full border-r-[3px] border-transparent
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-4 flex justify-end md:hidden">
                    <button onClick={() => setSidebarOpen(false)} className="text-gray-500">
                        <X />
                    </button>
                </div>

                <nav className="flex-1 min-h-0 p-4 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
                    {menuItems.map(item => (
                        <div key={item.id}>
                            <button
                                onClick={() => handleTabChange(item.id)}
                                className={`
                                    w-full flex items-center p-3 rounded-xl transition-all duration-200 font-bold border-[3px]
                                    bg-brand-lightSurface dark:bg-brand-darkSurface relative overflow-hidden
                                    ${activeTab === item.id
                                        ? 'border-brand-accent text-brand-accent bg-brand-accent/5 shadow-sm'
                                        : 'border-transparent text-gray-500 hover:border-gray-200 dark:hover:border-gray-700'
                                    }
                                    ${isCollapsed ? 'justify-center' : ''}
                                `}
                                title={isCollapsed ? item.label : undefined}
                            >
                                <div className="flex items-center min-w-[20px]">
                                    <item.icon size={20} className="flex-shrink-0" />
                                </div>
                                
                                <span className={`
                                    whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out
                                    ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}
                                `}>
                                    {item.label}
                                </span>

                                {/* Chevrons for sub-menus (only visible when expanded) */}
                                <div className={`
                                    ml-auto transition-all duration-300 ease-in-out flex items-center
                                    ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
                                `}>
                                    {item.id === 'live' && activeTab === 'live' && (
                                        <ChevronRight size={16} className="text-brand-accent" />
                                    )}
                                    {item.id === 'data' && activeTab === 'data' && (
                                        <ChevronRight size={16} className="text-brand-accent" />
                                    )}
                                    {item.id === 'classrooms' && (
                                        <ChevronDown size={16} className={`transition-transform ${isClassroomsMenuOpen ? 'rotate-180' : ''}`} />
                                    )}
                                </div>
                            </button>

                            {/* Sub-menu for Live View */}
                            <div className={`
                                overflow-hidden transition-all duration-300 ease-in-out
                                ${!isCollapsed && item.id === 'live' && activeTab === 'live' ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}
                            `}>
                                <div className="ml-9 space-y-1">
                                    <button
                                        onClick={() => setLiveViewSubTab('tasks')}
                                        className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors ${liveViewSubTab === 'tasks' ? 'text-brand-accent bg-brand-accent/10' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        By Task
                                    </button>
                                    <button
                                        onClick={() => setLiveViewSubTab('students')}
                                        className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors ${liveViewSubTab === 'students' ? 'text-brand-accent bg-brand-accent/10' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        By Student
                                    </button>
                                </div>
                            </div>

                            {/* Sub-menu for Data (Classrooms) */}
                            <div className={`
                                overflow-hidden transition-all duration-300 ease-in-out
                                ${!isCollapsed && item.id === 'data' && activeTab === 'data' ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}
                            `}>
                                <div className="ml-9 space-y-1">
                                    <button
                                        onClick={() => setClassroomSubTab('history')}
                                        className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors ${classroomSubTab === 'history' ? 'text-brand-accent bg-brand-accent/10' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        History
                                    </button>
                                    <button
                                        onClick={() => setClassroomSubTab('analytics')}
                                        className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors ${classroomSubTab === 'analytics' ? 'text-brand-accent bg-brand-accent/10' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        Analytics
                                    </button>
                                </div>
                            </div>

                            {/* Sub-menu for Classrooms Selector */}
                            <div className={`
                                overflow-hidden transition-all duration-300 ease-in-out
                                ${!isCollapsed && item.id === 'classrooms' && isClassroomsMenuOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}
                            `}>
                                <div className="ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-1">
                                    {classrooms.map(cls => (
                                        <button
                                            key={cls.id}
                                            onClick={() => handleClassSelect(cls.id)}
                                            className={`
                                                w-full text-left p-2 text-sm rounded-lg font-medium transition-colors flex items-center gap-2
                                                ${currentClassId === cls.id ? 'text-brand-accent bg-brand-accent/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}
                                            `}
                                        >
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cls.color || '#3B82F6' }} />
                                            <span className="truncate">{cls.name}</span>
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setIsClassModalOpen(true)}
                                        className="w-full text-left p-2 text-sm rounded-lg font-bold text-brand-accent hover:bg-brand-accent/10 transition-colors flex items-center gap-2 mt-2"
                                    >
                                        <Plus size={14} />
                                        Add Class
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Sidebar Toggle */}
                    <div className={`hidden md:flex ${isCollapsed ? 'justify-center' : 'justify-start'} px-3 pt-2`}>
                        <button 
                            onClick={() => {
                                setIsCollapsed(!isCollapsed);
                                setIsClassroomsMenuOpen(false);
                            }} 
                            className="p-2 text-brand-accent hover:text-brand-accent/80 transition-colors rounded-lg hover:bg-brand-accent/10"
                        >
                            {isCollapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
                        </button>
                    </div>
                </nav>

                <div className="p-4 space-y-2 flex-shrink-0">
                    <button
                        onClick={toggleDarkMode}
                        className={`w-full flex items-center p-3 text-gray-500 hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-bold ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? (darkMode ? 'Dark Mode' : 'Light Mode') : undefined}
                    >
                        <div className="flex items-center min-w-[20px]">
                            {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                        </div>
                        <span className={`
                            whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out
                            ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}
                        `}>
                            {darkMode ? 'Dark Mode' : 'Light Mode'}
                        </span>
                    </button>
                    <button 
                        className={`w-full flex items-center p-3 text-gray-500 hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-bold ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? 'Settings' : undefined}
                    >
                        <div className="flex items-center min-w-[20px]">
                            <Settings size={20} />
                        </div>
                        <span className={`
                            whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out
                            ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}
                        `}>
                            Settings
                        </span>
                    </button>
                    <button
                        onClick={logout}
                        className={`w-full flex items-center p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-bold ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? 'Sign Out' : undefined}
                    >
                        <div className="flex items-center min-w-[20px]">
                            <LogOut size={20} />
                        </div>
                        <span className={`
                            whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out
                            ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100 ml-3'}
                        `}>
                            Sign Out
                        </span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative">
                {/* Header */}
                <header className="h-16 bg-brand-lightSurface dark:bg-brand-darkSurface flex items-center justify-between px-6 z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={toggleSidebar} className="md:hidden p-2 text-gray-500">
                            <Menu />
                        </button>
                        <h2 className="text-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            {menuItems.find(i => i.id === activeTab)?.label}
                        </h2>
                    </div>
                </header>

                {/* Content Body */}
                <div className="flex-1 overflow-hidden p-6 relative">
                    {renderContent()}
                </div>

                {/* Connection Sidebar (Right) */}
                {currentClass && (
                    <ConnectionSidebar
                        classCode={currentClass.joinCode}
                        classId={currentClass.id}
                    />
                )}

                {/* Global Modals */}
                <ClassFormModal />
            </main>
        </div>
    );
};

export default TeacherDashboard;
