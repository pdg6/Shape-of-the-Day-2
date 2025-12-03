import React, { useState, useRef, useEffect } from 'react';
import { Activity, School, Menu, X, LogOut, Settings, Plus, BarChart2, ChevronLeft, ChevronRight, QrCode, Home, ListTodo, Presentation, Archive } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useClassStore } from '../../store/classStore';
import TaskManager from './TaskManager';
import TaskInventory from './TaskInventory';
import ShapeOfDay from './ShapeOfDay';
import LiveView from './LiveView';
import ClassroomManager from './ClassroomManager';
import ConnectionSidebar from './ConnectionSidebar';
import { ClassFormModal } from './ClassFormModal';
import SettingsOverlay from './SettingsOverlay';
import JoinCodeOverlay from './JoinCodeOverlay';
import { Modal } from '../shared/Modal';
import { Task } from '../../types';
// import { DummyDataControls } from '../shared/DummyDataControls';

interface MenuItem {
    id: 'tasks' | 'shape' | 'live' | 'reports' | 'classrooms';
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
    const [tasksSubTab, setTasksSubTab] = useState<'create' | 'browse'>('create');
    const [liveViewSubTab, setLiveViewSubTab] = useState<'tasks' | 'students'>('tasks');
    const [reportsSubTab, setReportsSubTab] = useState<'calendar' | 'analytics'>('calendar');
    const [isClassroomsMenuOpen, setIsClassroomsMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isJoinCodeOpen, setIsJoinCodeOpen] = useState(false);
    
    // State for passing task data to TaskManager for duplication
    const [pendingDuplicateTask, setPendingDuplicateTask] = useState<Task | null>(null);

    const currentClass = classrooms.find(c => c.id === currentClassId);

    // Ref for sidebar to detect clicks outside
    const sidebarRef = useRef<HTMLElement>(null);

    // Close classrooms submenu when clicking outside the sidebar
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                setIsClassroomsMenuOpen(false);
            }
        };

        if (isClassroomsMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isClassroomsMenuOpen]);

    const menuItems: MenuItem[] = [
        { id: 'classrooms', label: 'Classrooms', icon: School },
        { id: 'tasks', label: 'Tasks', icon: ListTodo },
        { id: 'shape', label: 'Shape of Day', icon: Presentation },
        { id: 'live', label: 'Live View', icon: Activity },
        { id: 'reports', label: 'Reports', icon: BarChart2 },
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
        // Close the classrooms submenu after selection
        setIsClassroomsMenuOpen(false);
        // Close mobile sidebar on selection
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    };

    const handleDeepNavigation = (tab: MenuItem['id'], subTab?: string) => {
        setActiveTab(tab);
        if (tab === 'tasks' && subTab) {
            setTasksSubTab(subTab as 'create' | 'browse');
        } else if (tab === 'live' && subTab) {
            setLiveViewSubTab(subTab as 'tasks' | 'students');
        } else if (tab === 'reports' && subTab) {
            setReportsSubTab(subTab as 'calendar' | 'analytics');
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'tasks': 
                return tasksSubTab === 'create' 
                    ? <TaskManager 
                        duplicateFromTask={pendingDuplicateTask}
                        onDuplicateConsumed={() => setPendingDuplicateTask(null)}
                      /> 
                    : <TaskInventory 
                        onEditTask={() => {
                            setTasksSubTab('create');
                        }}
                        onDuplicateTask={(task) => {
                            // Set the task to duplicate and switch to create mode
                            setPendingDuplicateTask(task);
                            setTasksSubTab('create');
                        }}
                      />;
            case 'shape': return <ShapeOfDay />;
            case 'live': return <LiveView activeView={liveViewSubTab} />;
            case 'classrooms': return <ClassroomManager activeView="classes" onNavigate={handleDeepNavigation} />;
            case 'reports': return <ClassroomManager activeView={reportsSubTab === 'calendar' ? 'history' : 'analytics'} onNavigate={handleDeepNavigation} />;
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
            <aside
                ref={sidebarRef}
                className={`
                hidden md:flex md:static inset-y-0 left-0 z-sidebar
                ${isCollapsed ? 'w-20' : 'w-64'} bg-brand-lightSurface dark:bg-brand-darkSurface
                transform transition-all duration-300 ease-in-out flex-col h-full overflow-hidden
            `}>
                {/* Logo/Branding - Same height as header (h-16) */}
                <div className="h-16 flex-shrink-0 flex items-center px-4">
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

                <nav id="teacher-sidebar-nav" aria-label="Main navigation" className="flex-1 min-h-0 px-4 pb-4 pt-4 overflow-y-auto custom-scrollbar overflow-x-hidden">
                    <ul className="space-y-1 list-none m-0 p-0">
                        {menuItems.map(item => (
                            <li key={item.id}>
                                <button
                                    onClick={() => handleTabChange(item.id)}
                                    className={`
                                    group relative flex items-center rounded-xl transition-all duration-200 font-bold border-[3px] overflow-hidden
                                    bg-brand-lightSurface dark:bg-brand-darkSurface
                                    focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-brand-darkSurface
                                    ${activeTab === item.id
                                            ? 'border-brand-accent text-brand-accent bg-brand-accent/5 shadow-sm'
                                            : 'border-transparent text-gray-500 hover:border-gray-100 dark:hover:border-gray-500'
                                        }
                                    ${isCollapsed ? 'w-12 h-12 justify-center' : 'w-full h-12'}
                                `}
                                    title={isCollapsed ? item.label : undefined}
                                    aria-label={item.label}
                                    aria-expanded={
                                        item.id === 'classrooms' ? (isClassroomsMenuOpen && !isCollapsed) :
                                        item.id === 'tasks' ? (activeTab === 'tasks' && !isCollapsed) :
                                        item.id === 'live' ? (activeTab === 'live' && !isCollapsed) :
                                        item.id === 'reports' ? (activeTab === 'reports' && !isCollapsed) :
                                        undefined
                                    }
                                    aria-controls={
                                        item.id === 'classrooms' ? 'submenu-classrooms' :
                                        item.id === 'tasks' ? 'submenu-tasks' :
                                        item.id === 'live' ? 'submenu-live' :
                                        item.id === 'reports' ? 'submenu-reports' :
                                        undefined
                                    }
                                >
                                    <div className={`flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'w-12' : 'w-12'}`}>
                                        <item.icon size={20} className="flex-shrink-0" />
                                    </div>
                                    <span className={`whitespace-nowrap transition-all duration-300 ease-in-out ${isCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}>
                                        {item.label}
                                    </span>
                                </button>

                                {/* Sub-menu for Classrooms Selector */}
                                {item.id === 'classrooms' && (
                                    <div
                                        id="submenu-classrooms"
                                        className={`
                                        grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
                                        ${!isCollapsed && isClassroomsMenuOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}
                                    `}
                                    >
                                        <ul className="min-h-0 overflow-hidden ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-1 list-none m-0 p-0">
                                            {classrooms.map(cls => (
                                                <li key={cls.id}>
                                                    <button
                                                        onClick={() => handleClassSelect(cls.id)}
                                                        className={`
                                                        w-full text-left p-2 text-sm rounded-lg font-medium transition-colors
                                                        ${currentClassId === cls.id ? 'text-brand-accent' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}
                                                    `}
                                                    >
                                                        <span className="truncate">{cls.name}</span>
                                                    </button>
                                                </li>
                                            ))}
                                            <li>
                                                <button
                                                    onClick={() => setIsClassModalOpen(true)}
                                                    className="w-full text-left p-2 text-sm rounded-lg font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:text-brand-accent transition-colors flex items-center gap-2 mt-2"
                                                >
                                                    <Plus size={14} />
                                                    Add Class
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                )}

                                {/* Sub-menu for Tasks */}
                                {item.id === 'tasks' && (
                                    <div
                                        id="submenu-tasks"
                                        className={`
                                        grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
                                        ${!isCollapsed && activeTab === 'tasks' ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}
                                    `}
                                    >
                                        <ul className="min-h-0 overflow-hidden ml-9 space-y-1 list-none m-0 p-0">
                                            <li>
                                                <button
                                                    onClick={() => setTasksSubTab('create')}
                                                    className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors focus:outline-none focus:text-brand-accent ${tasksSubTab === 'create' ? 'text-brand-accent' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                                >
                                                    Create
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    onClick={() => setTasksSubTab('browse')}
                                                    className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors focus:outline-none focus:text-brand-accent ${tasksSubTab === 'browse' ? 'text-brand-accent' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                                >
                                                    Browse
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                )}

                                {/* Sub-menu for Live View */}
                                {item.id === 'live' && (
                                    <div
                                        id="submenu-live"
                                        className={`
                                        grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
                                        ${!isCollapsed && activeTab === 'live' ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}
                                    `}
                                    >
                                        <ul className="min-h-0 overflow-hidden ml-9 space-y-1 list-none m-0 p-0">
                                            <li>
                                                <button
                                                    onClick={() => setLiveViewSubTab('tasks')}
                                                    className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors focus:outline-none focus:text-brand-accent ${liveViewSubTab === 'tasks' ? 'text-brand-accent' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                                >
                                                    By Task
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    onClick={() => setLiveViewSubTab('students')}
                                                    className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors focus:outline-none focus:text-brand-accent ${liveViewSubTab === 'students' ? 'text-brand-accent' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                                >
                                                    By Student
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                )}

                                {/* Sub-menu for Reports */}
                                {item.id === 'reports' && (
                                    <div
                                        id="submenu-reports"
                                        className={`
                                        grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
                                        ${!isCollapsed && activeTab === 'reports' ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}
                                    `}
                                    >
                                        <ul className="min-h-0 overflow-hidden ml-9 space-y-1 list-none m-0 p-0">
                                            <li>
                                                <button
                                                    onClick={() => setReportsSubTab('calendar')}
                                                    className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors focus:outline-none focus:text-brand-accent ${reportsSubTab === 'calendar' ? 'text-brand-accent' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                                >
                                                    Calendar
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    onClick={() => setReportsSubTab('analytics')}
                                                    className={`w-full text-left p-2 text-sm rounded-lg font-medium transition-colors focus:outline-none focus:text-brand-accent ${reportsSubTab === 'analytics' ? 'text-brand-accent' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                                >
                                                    Analytics
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>

                    {/* Sidebar Toggle */}

                </nav>

                <div className="px-4 pb-1 pt-4 space-y-2 flex-shrink-0">
                    <button
                        onClick={() => {
                            setIsCollapsed(!isCollapsed);
                            setIsClassroomsMenuOpen(false);
                        }}
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
                        className={`hidden md:flex group relative items-center h-12 rounded-xl transition-all duration-200 font-bold overflow-hidden border-[3px] border-transparent hover:border-gray-100 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${isCollapsed ? 'w-12 justify-center' : 'w-full'}`}
                        title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
                    >
                        <div className="flex items-center justify-center w-12 flex-shrink-0 text-gray-500 dark:text-gray-400 transition-colors">
                            {isCollapsed ? <ChevronRight size={24} /> : <Menu size={20} />}
                        </div>
                        <span className={`
                                                            whitespace-nowrap transition-all duration-200 ease-in-out flex-1 text-left
                                                            ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'opacity-100 ml-0 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200'}
                                                        `}>
                            Menu
                        </span>
                        {!isCollapsed && (
                            <div className="pr-3 text-gray-500 dark:text-gray-400">
                                <ChevronLeft size={20} />
                            </div>
                        )}
                    </button>
                    <div className={`hidden md:block h-px bg-gray-200 dark:bg-gray-700 my-2 mx-1 transition-all duration-300 ${isCollapsed ? 'w-10' : 'w-auto'}`} />
                    <button
                        onClick={() => setIsJoinCodeOpen(true)}
                        className={`group relative flex items-center h-12 rounded-xl transition-all duration-200 font-bold overflow-hidden border-[3px] border-transparent hover:border-gray-100 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${isCollapsed ? 'w-12 justify-center' : 'w-full'
                            }`}
                        title={isCollapsed ? 'Join Code' : undefined}
                    >
                        <div className="flex items-center justify-center w-12 flex-shrink-0 transition-colors text-gray-500 dark:text-gray-400">
                            <QrCode size={20} />
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-200 ease-in-out
                            ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'opacity-100 ml-0'}
                            text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200
                        `}>
                            Join Code
                        </span>
                    </button>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className={`group relative flex items-center h-12 rounded-xl transition-all duration-200 font-bold overflow-hidden border-[3px] border-transparent hover:border-gray-100 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${isCollapsed ? 'w-12' : 'w-full'
                            }`}
                        title={isCollapsed ? 'Settings' : undefined}
                    >
                        <div className="flex items-center justify-center w-12 flex-shrink-0 text-gray-500 dark:text-gray-400 transition-colors">
                            <Settings size={20} />
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-200 ease-in-out
                            ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'opacity-100 ml-0'}
                            text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200
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
            <main className="flex-1 grid grid-rows-[96px_1fr] row-gap-1 min-w-0 relative">
                {/* Header */}
                <header className="row-start-1 col-start-1 h-24 header-fade z-50 w-full pointer-events-none">
                    <div className="h-16 flex items-center justify-between px-4 md:px-6 pointer-events-auto">
                        {/* Left: Class Name */}
                        <h2 className="text-fluid-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary truncate">
                            {currentClass?.name || 'No Class Selected'}
                        </h2>
                        {/* Right: Current Tab/Sub-tab (blue) + Date (gray) */}
                        <div className="flex items-baseline gap-3 flex-shrink-0">
                            <span className="text-fluid-lg font-semibold text-brand-accent">
                                {activeTab === 'tasks'
                                    ? `Tasks - ${tasksSubTab === 'create' ? 'Create' : 'Browse'}`
                                    : activeTab === 'live'
                                        ? `Live View - ${liveViewSubTab === 'tasks' ? 'By Task' : 'By Student'}`
                                        : activeTab === 'reports'
                                            ? `Reports - ${reportsSubTab === 'calendar' ? 'Calendar' : 'Analytics'}`
                                            : menuItems.find(i => i.id === activeTab)?.label}
                            </span>
                            <span className="text-fluid-sm font-medium text-gray-500 dark:text-gray-400">
                                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </header>
                {/* Content Body with fade gradients */}
                <div className="row-start-2 min-h-0 min-w-0 relative overflow-hidden">
                    {/* Scrollable content */}
                    <div className="h-full w-full overflow-y-auto overflow-x-hidden px-6 pb-[84px] md:pb-6">
                        {renderContent()}
                    </div>




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
                        onShowData={() => setActiveTab('reports')}
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

            {/* Mobile Bottom Navigation - iOS/Android Style */}
            <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 inset-x-0 h-24 footer-fade z-sidebar safe-area-pb">
                <ul className="flex justify-around items-center h-16 px-2 list-none m-0 p-0 mt-4">
                    <li>
                        <button
                            onClick={() => setActiveTab('classrooms')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'classrooms'
                                ? 'border-brand-accent text-brand-accent'
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
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'tasks'
                                ? 'border-brand-accent text-brand-accent'
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
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'shape'
                                ? 'border-brand-accent text-brand-accent'
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
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'live'
                                ? 'border-brand-accent text-brand-accent'
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
                            className="flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
                            aria-label="Settings & More"
                        >
                            <Home className="w-6 h-6" />
                            <span className="text-fluid-xs font-bold">More</span>
                        </button>
                    </li>
                </ul>
            </nav>
        </div >
    );
};

export default TeacherDashboard;
