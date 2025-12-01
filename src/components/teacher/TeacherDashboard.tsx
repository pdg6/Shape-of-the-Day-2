import React, { useState } from 'react';
import { Activity, School, Menu, X, LogOut, Settings, Plus, BarChart2, ChevronLeft, ChevronRight, QrCode, Home, ListTodo, Presentation } from 'lucide-react';
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
// import { DummyDataControls } from '../shared/DummyDataControls';

interface MenuItem {
    id: 'tasks' | 'shape' | 'live' | 'data' | 'classrooms';
    label: string;
    icon: React.ElementType;
}

const TeacherDashboard: React.FC = () => {
    const { logout, user } = useAuth();
    const {
        classrooms,
        currentClassId,
        setCurrentClassId,
        isSidebarOpen,
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
        { id: 'tasks', label: 'Task Manager', icon: ListTodo },
        { id: 'shape', label: 'Shape of Day', icon: Presentation },
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

    const handleDeepNavigation = (tab: MenuItem['id'], subTab?: string) => {
        setActiveTab(tab);
        if (tab === 'live' && subTab) {
            setLiveViewSubTab(subTab as 'tasks' | 'students');
        } else if (tab === 'data' && subTab) {
            setClassroomSubTab(subTab as 'classes' | 'history' | 'analytics');
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'classrooms': return <ClassroomManager activeView="classes" onNavigate={handleDeepNavigation} />;
            case 'tasks': return <TaskManager />;
            case 'shape': return <ShapeOfDay />;
            case 'live': return <LiveView activeView={liveViewSubTab} />;
            case 'data': return <ClassroomManager activeView={classroomSubTab} onNavigate={handleDeepNavigation} />;
            default: return <TaskManager />;
        }
    };

    return (
        <div className="flex h-full bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkPrimary dark:text-brand-textPrimary overflow-hidden transition-colors duration-300">
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
                transform transition-all duration-300 ease-in-out flex-col h-full overflow-hidden
            `}>
                {/* Logo/Branding - Same height as header (h-16) */}
                <div className="h-16 flex-shrink-0 flex items-center px-4 border-b border-gray-200 dark:border-gray-800">
                    <div className={`flex items-center gap-2 transition-all duration-300 ${isCollapsed ? 'justify-center w-12' : ''}`}>
                        <img
                            src="/shape of the day logo.png"
                            alt="Shape of the Day"
                            className="w-8 h-8 flex-shrink-0 aspect-square object-contain"
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

                <div className="p-4 flex justify-end md:hidden flex-shrink-0">
                    <button onClick={() => setSidebarOpen(false)} className="text-gray-500">
                        <X />
                    </button>
                </div>

                <nav id="teacher-sidebar-nav" aria-label="Main navigation" className="flex-1 min-h-0 p-4 overflow-y-auto custom-scrollbar overflow-x-hidden">
                    <ul className="space-y-2 list-none m-0 p-0">
                        {menuItems.map(item => (
                            <li key={item.id}>
                                <button
                                    onClick={() => handleTabChange(item.id)}
                                    className={`
                                    group relative flex items-center rounded-xl transition-all duration-200 font-bold border-[3px] overflow-hidden
                                    bg-brand-lightSurface dark:bg-brand-darkSurface
                                    focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50
                                    ${activeTab === item.id
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-500 bg-blue-500/5 shadow-sm'
                                            : 'border-transparent text-gray-500 hover:border-gray-100 dark:hover:border-gray-500'
                                        }
                                    ${isCollapsed ? 'w-12 h-12 justify-center' : 'w-full h-12'}
                                `}
                                    title={isCollapsed ? item.label : undefined}
                                    aria-label={item.label}
                                    aria-expanded={
                                        item.id === 'classrooms' ? (isClassroomsMenuOpen && !isCollapsed) :
                                            (item.id === 'live' || item.id === 'data') ? (activeTab === item.id && !isCollapsed) :
                                                undefined
                                    }
                                    aria-controls={
                                        item.id === 'classrooms' ? 'submenu-classrooms' :
                                            item.id === 'live' ? 'submenu-live' :
                                                item.id === 'data' ? 'submenu-data' :
                                                    undefined
                                    }
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
                                <div
                                    id="submenu-live"
                                    className={`
                                    grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
                                    ${!isCollapsed && item.id === 'live' && activeTab === 'live' ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}
                                `}
                                >
                                    <ul className="min-h-0 overflow-hidden ml-9 space-y-1 list-none m-0 p-0">
                                        <li>
                                            <button
                                                onClick={() => setLiveViewSubTab('tasks')}
                                                className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors ${liveViewSubTab === 'tasks' ? 'text-blue-600 dark:text-blue-500 bg-blue-500/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                            >
                                                By Task
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                onClick={() => setLiveViewSubTab('students')}
                                                className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors ${liveViewSubTab === 'students' ? 'text-blue-600 dark:text-blue-500 bg-blue-500/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                            >
                                                By Student
                                            </button>
                                        </li>
                                    </ul>
                                </div>

                                {/* Sub-menu for Data (Classrooms) */}
                                <div
                                    id="submenu-data"
                                    className={`
                                    grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
                                    ${!isCollapsed && item.id === 'data' && activeTab === 'data' ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}
                                `}
                                >
                                    <ul className="min-h-0 overflow-hidden ml-9 space-y-1 list-none m-0 p-0">
                                        <li>
                                            <button
                                                onClick={() => setClassroomSubTab('history')}
                                                className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors ${classroomSubTab === 'history' ? 'text-blue-600 dark:text-blue-500 bg-blue-500/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                            >
                                                Calendar
                                            </button>
                                        </li>
                                        <li>
                                            <button
                                                onClick={() => setClassroomSubTab('analytics')}
                                                className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors ${classroomSubTab === 'analytics' ? 'text-blue-600 dark:text-blue-500 bg-blue-500/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                            >
                                                Analytics
                                            </button>
                                        </li>
                                    </ul>
                                </div>

                                {/* Sub-menu for Classrooms Selector */}
                                <div
                                    id="submenu-classrooms"
                                    className={`
                                    grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
                                    ${!isCollapsed && item.id === 'classrooms' && isClassroomsMenuOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}
                                `}
                                >
                                    <ul className="min-h-0 overflow-hidden ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-1 list-none m-0 p-0">
                                        {classrooms.map(cls => (
                                            <li key={cls.id}>
                                                <button
                                                    onClick={() => handleClassSelect(cls.id)}
                                                    className={`
                                                    w-full text-left p-2 text-sm rounded-lg font-medium transition-colors
                                                    ${currentClassId === cls.id ? 'text-blue-600 dark:text-blue-500 bg-blue-500/10' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}
                                                `}
                                                >
                                                    <span className="truncate">{cls.name}</span>
                                                </button>
                                            </li>
                                        ))}
                                        <li>
                                            <button
                                                onClick={() => setIsClassModalOpen(true)}
                                                className="w-full text-left p-2 text-sm rounded-lg font-bold text-blue-600 dark:text-blue-500 hover:bg-blue-500/10 transition-colors flex items-center gap-2 mt-2"
                                            >
                                                <Plus size={14} />
                                                Add Class
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </li>
                        ))}
                    </ul>

                    {/* Sidebar Toggle */}

                </nav>

                <div className="p-4 space-y-2 flex-shrink-0">
                    <button
                        onClick={() => {
                            setIsCollapsed(!isCollapsed);
                            setIsClassroomsMenuOpen(false);
                        }}
                        aria-expanded={!isCollapsed}
                        aria-controls="teacher-sidebar-nav"
                        aria-label={isCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
                        className={`hidden md:flex group relative items-center h-12 rounded-xl transition-all duration-200 font-bold overflow-hidden border-[3px] border-transparent hover:border-gray-100 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 ${isCollapsed ? 'w-12 justify-center' : 'w-full'}`}
                        title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
                    >
                        <div className="flex items-center justify-center w-12 flex-shrink-0 text-blue-600 dark:text-blue-500 transition-colors">
                            {isCollapsed ? <ChevronRight size={24} /> : <Menu size={20} />}
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-200 ease-in-out flex-1 text-left
                            ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'opacity-100 ml-0 text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-500'}
                        `}>
                            Menu
                        </span>
                        {!isCollapsed && (
                            <div className="pr-3 text-blue-600 dark:text-blue-500">
                                <ChevronLeft size={20} />
                            </div>
                        )}
                    </button>
                    <div className={`hidden md:block h-px bg-gray-200 dark:bg-gray-700 my-2 mx-1 transition-all duration-300 ${isCollapsed ? 'w-10' : 'w-auto'}`} />
                    <button
                        onClick={() => setIsJoinCodeOpen(true)}
                        className={`group relative flex items-center h-12 rounded-xl transition-all duration-200 font-bold overflow-hidden border-[3px] border-transparent hover:border-gray-100 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 ${isCollapsed ? 'w-12 justify-center' : 'w-full'
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
                            whitespace-nowrap transition-all duration-200 ease-in-out
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
                        className={`group relative flex items-center h-12 rounded-xl transition-all duration-200 font-bold overflow-hidden border-[3px] border-transparent hover:border-gray-100 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 ${isCollapsed ? 'w-12' : 'w-full'
                            }`}
                        title={isCollapsed ? 'Settings' : undefined}
                    >
                        <div className="flex items-center justify-center w-12 flex-shrink-0 text-gray-600 dark:text-gray-100 transition-colors">
                            <Settings size={20} />
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-200 ease-in-out
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
                        className="group relative flex items-center h-12 rounded-xl transition-all duration-200 font-bold overflow-hidden w-full border-[3px] border-transparent hover:border-red-200 dark:hover:border-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/50"
                        title={isCollapsed ? 'Sign Out' : undefined}
                    >
                        <div className="flex items-center justify-center w-12 flex-shrink-0 text-red-500 transition-colors">
                            <LogOut size={20} />
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-200 ease-in-out text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-400
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
                <header className="h-16 bg-brand-lightSurface dark:bg-brand-darkSurface flex items-baseline justify-between px-4 md:px-6 z-dropdown border-b border-gray-200 dark:border-gray-800 pb-4">
                    {/* Left: Class Name */}
                    <h2 className="text-fluid-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary truncate">
                        {currentClass?.name || 'No Class Selected'}
                    </h2>
                    {/* Right: Current Tab/Sub-tab (blue) + Date (gray) */}
                    <div className="flex items-baseline gap-3 flex-shrink-0">
                        <span className="text-fluid-lg font-semibold text-blue-600 dark:text-blue-500">
                            {activeTab === 'live'
                                ? `Live View - ${liveViewSubTab === 'tasks' ? 'By Task' : 'By Student'}`
                                : activeTab === 'data'
                                    ? `Data - ${classroomSubTab === 'history' ? 'Calendar' : 'Analytics'}`
                                    : menuItems.find(i => i.id === activeTab)?.label}
                        </span>
                        <span className="text-fluid-sm font-medium text-gray-500 dark:text-gray-400">
                            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                </header>
                {/* Header fade gradient - content fades as it scrolls under */}
                <div
                    className="absolute left-0 right-0 top-16 h-8 pointer-events-none z-dropdown bg-gradient-to-b from-brand-lightSurface dark:from-brand-darkSurface to-transparent"
                    aria-hidden="true"
                />

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
                    title="Menu"
                >
                    <SettingsOverlay
                        isOpen={true}
                        onClose={() => setIsSettingsOpen(false)}
                        onLogout={logout}
                        onShowJoinCode={() => setIsJoinCodeOpen(true)}
                        onShowData={() => setActiveTab('data')}
                        teacherName={user?.displayName || user?.email || 'Teacher'}
                        className={currentClass?.name}
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
            {/* <DummyDataControls /> */}

            {/* Mobile footer fade gradient - content fades as it scrolls under */}
            <div
                className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.5rem)] left-0 right-0 h-8 pointer-events-none z-sidebar bg-gradient-to-t from-brand-lightSurface dark:from-brand-darkSurface to-transparent"
                aria-hidden="true"
            />

            {/* Mobile Bottom Navigation - iOS/Android Style */}
            <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 inset-x-0 bg-brand-lightSurface dark:bg-brand-darkSurface z-sidebar safe-area-pb pb-2">
                <ul className="flex justify-around items-center h-16 px-2 list-none m-0 p-0">
                    <li>
                        <button
                            onClick={() => setActiveTab('classrooms')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 ${activeTab === 'classrooms'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-500'
                                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400'
                                }`}
                            aria-label="Classrooms"
                        >
                            <School className="w-6 h-6" />
                            <span className="text-fluid-xs font-bold">Classes</span>
                        </button>
                    </li>

                    <li>
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 ${activeTab === 'tasks'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-500'
                                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400'
                                }`}
                            aria-label="Task Manager"
                        >
                            <ListTodo className="w-6 h-6" />
                            <span className="text-fluid-xs font-bold">Tasks</span>
                        </button>
                    </li>

                    <li>
                        <button
                            onClick={() => setActiveTab('shape')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 ${activeTab === 'shape'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-500'
                                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400'
                                }`}
                            aria-label="Shape of Day"
                        >
                            <Presentation className="w-6 h-6" />
                            <span className="text-fluid-xs font-bold">Shape</span>
                        </button>
                    </li>

                    <li>
                        <button
                            onClick={() => setActiveTab('live')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 ${activeTab === 'live'
                                ? 'border-blue-500 text-blue-600 dark:text-blue-500'
                                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400'
                                }`}
                            aria-label="Live View"
                        >
                            <Activity className="w-6 h-6" />
                            <span className="text-fluid-xs font-bold">Live</span>
                        </button>
                    </li>

                    <li>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50"
                            aria-label="Settings & More"
                        >
                            <Home className="w-6 h-6" />
                            <span className="text-fluid-xs font-bold">More</span>
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default TeacherDashboard;
