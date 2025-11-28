import React, { useState } from 'react';
import { LayoutDashboard, Clock, Activity, School, Menu, X, LogOut, Settings, Plus, BarChart2, ChevronLeft, ChevronRight, QrCode, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useClassStore } from '../../store/classStore';
import TaskManager from './TaskManager';
import ShapeOfDay from './ShapeOfDay';
import LiveView from './LiveView';
import ClassroomManager from './ClassroomManager';
import ConnectionSidebar from './ConnectionSidebar';
import { ClassFormModal } from './ClassFormModal';
import SettingsOverlay from './SettingsOverlay';
import JoinCodeOverlay from './JoinCodeOverlay';
import { Modal } from '../shared/Modal';
import { DummyDataControls } from '../shared/DummyDataControls';

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
        setIsClassModalOpen
    } = useClassStore();

    const [activeTab, setActiveTab] = useState<MenuItem['id']>('tasks');
    const [liveViewSubTab, setLiveViewSubTab] = useState<'tasks' | 'students'>('tasks');
    const [classroomSubTab, setClassroomSubTab] = useState<'classes' | 'history' | 'analytics'>('history');
    const [isClassroomsMenuOpen, setIsClassroomsMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isJoinCodeOpen, setIsJoinCodeOpen] = useState(false);

    const currentClass = classrooms.find(c => c.id === currentClassId);

    const menuItems: MenuItem[] = [
        { id: 'classrooms', label: 'Classrooms', icon: School },
        { id: 'tasks', label: 'Task Manager', icon: LayoutDashboard },
        { id: 'shape', label: 'Shape of Day', icon: Clock },
        { id: 'live', label: 'Live View', icon: Activity },
        { id: 'data', label: 'Data', icon: BarChart2 },
    ];

    const handleTabChange = (tabId: MenuItem['id']) => {
        // Set the active tab
        setActiveTab(tabId);

        // Toggle classrooms menu if clicking classrooms
        if (tabId === 'classrooms') {
            setIsClassroomsMenuOpen(!isClassroomsMenuOpen);
        } else {
            // Close classrooms menu when clicking other tabs
            setIsClassroomsMenuOpen(false);
        }

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
        <div className="flex h-full bg-brand-bg dark:bg-brand-darkBg text-brand-textDarkPrimary dark:text-brand-textPrimary overflow-hidden transition-colors duration-300">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-tooltip md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar Navigation - Desktop Only */}
            <aside className={`
                hidden md:flex md:static inset-y-0 left-0 z-sidebar
                ${isCollapsed ? 'w-20' : 'w-64'} bg-brand-lightSurface dark:bg-brand-darkSurface
                transform transition-all duration-300 ease-in-out flex-col h-full border-r-[3px] border-gray-200 dark:border-gray-700 overflow-hidden
            `}>
                <div className="p-4 flex justify-end md:hidden flex-shrink-0">
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
                                    relative flex items-center rounded-xl transition-all duration-300 font-bold border-[3px] overflow-hidden
                                    bg-brand-lightSurface dark:bg-brand-darkSurface
                                    focus:outline-none focus:ring-4 focus:ring-brand-accent/20
                                    ${activeTab === item.id
                                        ? 'border-brand-accent text-brand-accent bg-brand-accent/5 shadow-sm'
                                        : 'border-transparent text-gray-500 hover:border-gray-200 dark:hover:border-gray-700'
                                    }
                                    ${isCollapsed ? 'w-12 h-12 justify-center' : 'w-full h-12'}
                                `}
                                title={isCollapsed ? item.label : undefined}
                                aria-label={item.label}
                            >
                                <div className={`flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-12'
                                    }`}>
                                    <item.icon size={20} className="flex-shrink-0" />
                                </div>

                                <span className={`
                                    whitespace-nowrap transition-all duration-300 ease-in-out
                                    ${isCollapsed ? 'w-0 opacity-0' : 'opacity-100'}
                                `}>
                                    {item.label}
                                </span>

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
                                                w-full text-left p-2 text-sm rounded-lg font-medium transition-colors
                                                ${currentClassId === cls.id ? 'text-brand-accent bg-brand-accent/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}
                                            `}
                                        >
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

                </nav>

                <div className="p-4 space-y-2 flex-shrink-0">
                    <button
                        onClick={() => {
                            setIsCollapsed(!isCollapsed);
                            setIsClassroomsMenuOpen(false);
                        }}
                        className={`hidden md:flex group relative items-center h-12 rounded-xl transition-colors duration-300 font-bold overflow-hidden ${isCollapsed ? 'w-12 justify-center' : 'w-full'}`}
                        title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
                    >
                        <div className="flex items-center justify-center w-12 flex-shrink-0 text-brand-accent transition-colors">
                            {isCollapsed ? <ChevronRight size={24} /> : <Menu size={20} />}
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-300 ease-in-out flex-1 text-left
                            ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'opacity-100 ml-0 text-gray-500 group-hover:text-brand-accent'}
                        `}>
                            Menu
                        </span>
                        {!isCollapsed && (
                            <div className="pr-3 text-brand-accent">
                                <ChevronLeft size={20} />
                            </div>
                        )}
                    </button>
                    <div className={`hidden md:block h-px bg-gray-200 dark:bg-gray-700 my-2 mx-1 transition-all duration-300 ${isCollapsed ? 'w-10' : 'w-auto'}`} />
                    <button
                        onClick={() => setIsJoinCodeOpen(true)}
                        className={`group relative flex items-center h-12 rounded-xl transition-colors duration-300 font-bold overflow-hidden ${isCollapsed ? 'w-12 justify-center' : 'w-full'
                            }`}
                        title={isCollapsed ? 'Join Code' : undefined}
                    >
                        <div className={`flex items-center justify-center w-12 flex-shrink-0 transition-colors ${isJoinCodeOpen
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-green-600 dark:text-green-400'
                            }`}>
                            <QrCode size={20} />
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-300 ease-in-out
                            ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'opacity-100 ml-0'}
                            ${isJoinCodeOpen
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-400'
                            }
                        `}>
                            Join Code
                        </span>
                    </button>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className={`group relative flex items-center h-12 rounded-xl transition-colors duration-300 font-bold overflow-hidden ${isCollapsed ? 'w-12' : 'w-full'
                            }`}
                        title={isCollapsed ? 'Settings' : undefined}
                    >
                        <div className="flex items-center justify-center w-12 flex-shrink-0 text-gray-600 dark:text-gray-100 transition-colors">
                            <Settings size={20} />
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-300 ease-in-out
                            ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'opacity-100 ml-0'}
                            ${isSettingsOpen
                                ? 'text-gray-600 dark:text-gray-100'
                                : 'text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-100'
                            }
                        `}>
                            Settings
                        </span>
                    </button>
                    <button
                        onClick={logout}
                        className="group relative flex items-center h-12 rounded-xl transition-colors duration-300 font-bold overflow-hidden w-full"
                        title={isCollapsed ? 'Sign Out' : undefined}
                    >
                        <div className="flex items-center justify-center w-12 flex-shrink-0 text-red-500 transition-colors">
                            <LogOut size={20} />
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-300 ease-in-out text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-400
                            ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'opacity-100 ml-0'}
                        `}>
                            Sign Out
                        </span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative">
                {/* Header */}
                <header className="h-16 bg-brand-lightSurface dark:bg-brand-darkSurface flex items-center justify-between px-6 z-dropdown">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            {menuItems.find(i => i.id === activeTab)?.label}
                        </h2>
                    </div>
                </header>

                {/* Content Body */}
                <div className="flex-1 overflow-hidden p-6 pb-24 md:pb-6 relative">
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
                {/* Global Modals */}
                <ClassFormModal />

                <Modal
                    isOpen={isSettingsOpen}
                    onClose={() => setIsSettingsOpen(false)}
                    title="Settings"
                >
                    <SettingsOverlay
                        isOpen={true}
                        onClose={() => setIsSettingsOpen(false)}
                        onLogout={logout}
                        onShowJoinCode={() => setIsJoinCodeOpen(true)}
                        onShowData={() => setActiveTab('data')}
                    />
                </Modal>

                {currentClass && (
                    <Modal
                        isOpen={isJoinCodeOpen}
                        onClose={() => setIsJoinCodeOpen(false)}
                        title="Join Code"
                    >
                        <JoinCodeOverlay
                            isOpen={true}
                            onClose={() => setIsJoinCodeOpen(false)}
                            classCode={currentClass.joinCode}
                            classId={currentClass.id}
                        />
                    </Modal>
                )}
            </main>

            {/* Development Tools - Remove in production */}
            <DummyDataControls />

            {/* Mobile Bottom Navigation - iOS/Android Style */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-brand-lightSurface dark:bg-brand-darkSurface border-t-[3px] border-gray-200 dark:border-gray-700 z-sidebar safe-area-pb">
                <div className="flex justify-around items-center h-16 px-2">
                    <button
                        onClick={() => setActiveTab('classrooms')}
                        className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[44px] min-h-[44px] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent ${activeTab === 'classrooms'
                            ? 'text-brand-accent'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        aria-label="Classrooms"
                    >
                        <School className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Classes</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[44px] min-h-[44px] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent ${activeTab === 'tasks'
                            ? 'text-brand-accent'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        aria-label="Task Manager"
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Tasks</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('shape')}
                        className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[44px] min-h-[44px] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent ${activeTab === 'shape'
                            ? 'text-brand-accent'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        aria-label="Shape of Day"
                    >
                        <Clock className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Shape</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('live')}
                        className={`flex flex-col items-center justify-center gap-1 p-2 min-w-[44px] min-h-[44px] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent ${activeTab === 'live'
                            ? 'text-brand-accent'
                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        aria-label="Live View"
                    >
                        <Activity className="w-5 h-5" />
                        <span className="text-[10px] font-bold">Live</span>
                    </button>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex flex-col items-center justify-center gap-1 p-2 min-w-[44px] min-h-[44px] rounded-lg transition-colors text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        aria-label="Settings & More"
                    >
                        <Home className="w-5 h-5" />
                        <span className="text-[10px] font-bold">More</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default TeacherDashboard;
