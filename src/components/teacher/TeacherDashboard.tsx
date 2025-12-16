import React, { useState, useRef, useEffect } from 'react';
import { Activity, School, Menu, X, Settings, Plus, BarChart2, ChevronLeft, ChevronRight, QrCode, ListTodo, Presentation } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useClassStore } from '../../store/classStore';
import TaskManager from './TaskManager';
import TaskInventory from './TaskInventory';
import ShapeOfDay from './ShapeOfDay';
import LiveView from './LiveView';
import ClassroomManager from './ClassroomManager';
import { ClassFormModal } from './ClassFormModal';
import SettingsOverlay from './SettingsOverlay';
import JoinCodeOverlay from './JoinCodeOverlay';
import { Modal } from '../shared/Modal';
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

    // Import Task type locally or assume it's available via module augmentation or just use any if strictly needed to avoid circular deps, 
    // but better to import it efficiently. 
    // Since we don't have the import line in the view, I'll add it to the top.

    // Actually, I should check the imports at the top.
    // I can't see the top imports well enough to know if "Task" is already imported from '../../types'. 
    // I'll add it to the existing TaskManager import logic or similar.
    // Wait, the previous tool call showed the imports. Task is not imported.

    // Let's add the import.

    const [activeTab, setActiveTab] = useState<MenuItem['id']>('tasks');
    const [tasksSubTab, setTasksSubTab] = useState<'create' | 'browse'>('create');
    const [liveViewSubTab, setLiveViewSubTab] = useState<'tasks' | 'students'>('students');
    const [reportsSubTab, setReportsSubTab] = useState<'calendar' | 'analytics'>('analytics');
    const [isClassroomsMenuOpen, setIsClassroomsMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isJoinCodeOpen, setIsJoinCodeOpen] = useState(false);

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
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    };

    const handleClassSelect = (classId: string) => {
        setCurrentClassId(classId);
        // Close the classrooms submenu after selection
        setIsClassroomsMenuOpen(false);
        // Close mobile sidebar on selection
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    };

    const [editingTask, setEditingTask] = useState<any>(null); // Using any to avoid complex Task import for now, or update import

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
                        initialTask={editingTask}
                    // clear initial task after it's consumed so we don't re-open it blindly if we switch tabs back and forth?
                    // Actually, TaskManager will likely handle the "on load" effect. 
                    // Pass a key if we want to force re-mount, or just rely on prop change.
                    />
                    : <TaskInventory onEditTask={(task) => {
                        setEditingTask(task);
                        setTasksSubTab('create');
                    }} />;
            case 'shape': return <ShapeOfDay onNavigate={handleDeepNavigation} />;
            case 'live': return <LiveView activeView={liveViewSubTab} />;
            case 'classrooms': return <ClassroomManager activeView="classes" onNavigate={handleDeepNavigation} />;
            case 'reports': return <ClassroomManager activeView={reportsSubTab === 'calendar' ? 'history' : 'analytics'} onNavigate={handleDeepNavigation} />;
            default: return <TaskManager />;
        }
    };

    return (
        <div className="flex h-full bg-brand-light dark:bg-brand-dark text-brand-textDarkPrimary dark:text-brand-textPrimary overflow-hidden transition-colors duration-300">
            {/* Mobile Sidebar Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
            />

            {/* Sidebar Navigation - Slides in on mobile, static on desktop */}
            <aside
                ref={sidebarRef}
                className={`
                    fixed md:static inset-y-0 left-0 z-50
                    ${isCollapsed ? 'md:w-20' : 'md:w-64'} w-64
                    bg-brand-light dark:bg-brand-dark
                    transform transition-transform duration-300 ease-in-out
                    flex flex-col h-full overflow-hidden
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    shadow-lg md:shadow-none
                `}
                aria-label="Main navigation"
                aria-hidden={!isSidebarOpen && typeof window !== 'undefined' && window.innerWidth < 768 ? 'true' : 'false'}
            >
                {/* Sidebar Header - Logo/Branding with Close button on mobile */}
                <div className="h-16 shrink-0 flex items-center justify-between px-4">
                    <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center w-12 md:w-12' : ''}`}>
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
                        onClick={() => setSidebarOpen(false)}
                        className="md:hidden flex items-center justify-center w-8 h-8 rounded-md text-gray-500 dark:text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-brand-textPrimary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                        aria-label="Close navigation menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav id="teacher-sidebar-nav" aria-label="Main navigation" className="flex-1 min-h-0 px-4 pb-4 pt-4 overflow-y-auto custom-scrollbar overflow-x-hidden">
                    <ul className="space-y-1 list-none m-0 p-0">
                        {menuItems.map(item => (
                            <li key={item.id}>
                                <button
                                    onClick={() => handleTabChange(item.id)}
                                    className={`
                                    group relative flex items-center rounded-lg transition-all duration-200 font-bold border-2 overflow-hidden
                                    bg-brand-lightSurface dark:bg-brand-darkSurface
                                    focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-brand-darkSurface
                                    ${activeTab === item.id
                                            ? 'border-brand-accent text-brand-accent bg-brand-accent/5 shadow-sm'
                                            : 'border-transparent text-gray-500 hover:border-gray-600 dark:hover:border-gray-400'
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
                                        <item.icon size={20} className="shrink-0" />
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
                                                        w-full text-left p-2 text-sm rounded-md font-medium transition-colors
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
                                                    className="w-full text-left p-2 text-sm rounded-md font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none focus:text-brand-accent transition-colors flex items-center gap-2 mt-2"
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
                                                    Inventory
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

                <div className="px-4 pb-1 pt-4 space-y-2 shrink-0">
                    <button
                        onClick={() => {
                            setIsCollapsed(!isCollapsed);
                            setIsClassroomsMenuOpen(false);
                        }}
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
                        className={`hidden md:flex group relative items-center h-12 rounded-lg transition-all duration-200 font-bold overflow-hidden border-2 border-transparent hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${isCollapsed ? 'w-12 justify-center' : 'w-full'}`}
                        title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
                    >
                        <div className="flex items-center justify-center w-12 shrink-0 text-gray-500 dark:text-gray-400 transition-colors">
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
                        className={`group relative flex items-center h-12 rounded-lg transition-all duration-200 font-bold overflow-hidden border-2 border-transparent hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${isCollapsed ? 'w-12 justify-center' : 'w-full'
                            }`}
                        title={isCollapsed ? 'Join Code' : undefined}
                    >
                        <div className="flex items-center justify-center w-12 shrink-0 transition-colors text-gray-500 dark:text-gray-400">
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
                        className={`group relative flex items-center h-12 rounded-lg transition-all duration-200 font-bold overflow-hidden border-2 border-transparent hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${isCollapsed ? 'w-12' : 'w-full'
                            }`}
                        title={isCollapsed ? 'Settings' : undefined}
                    >
                        <div className="flex items-center justify-center w-12 shrink-0 text-gray-500 dark:text-gray-400 transition-colors">
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

                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative">
                {/* Mobile/Tablet Header - visible below lg breakpoint */}
                <header className="lg:hidden h-12 px-4 flex items-center justify-between z-10 shrink-0">
                    {/* Left: Hamburger Menu + Section Title (matches desktop format) */}
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-brand-textPrimary transition-colors duration-200 focus:outline-none"
                            aria-label="Open navigation menu"
                            aria-expanded={isSidebarOpen}
                            aria-controls="main-navigation"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="flex items-baseline gap-1.5 text-xl font-black truncate">
                            <span className="text-gray-400">
                                {activeTab === 'tasks' ? (tasksSubTab === 'create' ? 'Tasks:' : 'Inventory:')
                                    : activeTab === 'shape' ? 'Shape:'
                                        : activeTab === 'live' ? 'Live:'
                                            : activeTab === 'classrooms' ? 'Classrooms:'
                                                : activeTab === 'reports' ? 'Reports:'
                                                    : ''}
                            </span>
                            <span className="text-brand-textDarkPrimary dark:text-brand-textPrimary underline decoration-brand-accent decoration-2 underline-offset-4 truncate">
                                {currentClass?.name || 'All Classes'}
                            </span>
                        </h1>
                    </div>
                    {/* Right: CTA Button (for Tasks, Classrooms, Live) or Date */}
                    {activeTab === 'tasks' && tasksSubTab === 'create' ? (
                        <button
                            id="mobile-new-task-btn"
                            className="w-10 h-10 flex items-center justify-center rounded-md text-brand-accent hover:bg-brand-accent/10 transition-colors"
                            aria-label="New Task"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    ) : activeTab === 'classrooms' ? (
                        <button
                            onClick={() => setIsClassModalOpen(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-md text-brand-accent hover:bg-brand-accent/10 transition-colors"
                            aria-label="Add Class"
                        >
                            <Plus className="w-6 h-6" />
                        </button>
                    ) : activeTab === 'live' ? (
                        <button
                            onClick={() => setIsJoinCodeOpen(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-md text-brand-accent hover:bg-brand-accent/10 transition-colors"
                            aria-label="Show Join Code"
                        >
                            <QrCode className="w-5 h-5" />
                        </button>
                    ) : (
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                    )}
                </header>

                {/* Content Body */}
                <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden">
                    {/* Scrollable content */}
                    <div className="h-full w-full overflow-y-auto overflow-x-hidden px-6 pb-6">
                        {renderContent()}
                    </div>
                </div>

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
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />
                </Modal>

                {currentClass && (
                    <Modal
                        isOpen={isJoinCodeOpen}
                        onClose={() => setIsJoinCodeOpen(false)}
                        maxWidth="2xl"
                        hideHeader={true}
                    >
                        <JoinCodeOverlay
                            isOpen={true}
                            onClose={() => setIsJoinCodeOpen(false)}
                            classCode={currentClass.joinCode}
                            classId={currentClass.id}
                            className={currentClass.name}
                        />
                    </Modal>
                )}
            </main>

            {/* Development Tools - Remove in production */}
            {/* <DummyDataControls /> */}


        </div >
    );
};

export default TeacherDashboard;
