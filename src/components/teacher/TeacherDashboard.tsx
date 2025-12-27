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

    const [activeTab, setActiveTab] = useState<MenuItem['id']>('classrooms');
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
    const [tasksToAdd, setTasksToAdd] = useState<any[]>([]); // Tasks copied from inventory to add to task board

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
                        tasksToAdd={tasksToAdd}
                        onTasksAdded={() => setTasksToAdd([])} // Clear after consumed
                    // clear initial task after it's consumed so we don't re-open it blindly if we switch tabs back and forth?
                    // Actually, TaskManager will likely handle the "on load" effect. 
                    // Pass a key if we want to force re-mount, or just rely on prop change.
                    />
                    : <TaskInventory
                        onEditTask={(task) => {
                            setEditingTask(task);
                            setTasksSubTab('create');
                        }}
                        onCopyToBoard={(tasks) => {
                            setTasksToAdd(tasks);
                            setTasksSubTab('create');
                        }}
                    />;
            case 'shape': return <ShapeOfDay onNavigate={handleDeepNavigation} />;
            case 'live': return <LiveView activeView={liveViewSubTab} />;
            case 'classrooms': return <ClassroomManager activeView="classes" onNavigate={handleDeepNavigation} />;
            case 'reports': return <ClassroomManager activeView={reportsSubTab === 'calendar' ? 'history' : 'analytics'} onNavigate={handleDeepNavigation} />;
            default: return <TaskManager />;
        }
    };

    return (
        <div className="app-container bg-dots">
            {/* Background Blobs */}
            <div className="gradient-blob blob-accent top-[-10%] right-[-10%]" />
            <div className="gradient-blob blob-purple bottom-[10%] left-[20%]" />
            <div className="gradient-blob blob-blue top-[20%] left-[-5%]" />

            {/* Mobile Sidebar Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setSidebarOpen(false)}
                aria-hidden="true"
            />

            {/* Sidebar Navigation - Slides in on mobile, static on desktop */}
            <aside
                ref={sidebarRef}
                className={`
                    fixed lg:static inset-y-0 left-0 z-50
                    ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64
                    bg-brand-lightSurface dark:bg-[#1a1d24]
                    transform transition-transform duration-300 ease-in-out
                    flex flex-col h-full overflow-hidden
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    border-r border-slate-200 dark:border-white/5
                `}
                aria-label="Main navigation"
                aria-hidden={!isSidebarOpen && typeof window !== 'undefined' && window.innerWidth < 1024 ? 'true' : 'false'}
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
                            ${isCollapsed ? 'lg:w-0 lg:opacity-0' : 'opacity-100'}
                        `}>
                            <span className="font-bold text-base text-brand-textDarkPrimary dark:text-brand-textPrimary whitespace-nowrap leading-tight">
                                Shape of the Day
                            </span>
                            <span className="text-sm text-brand-textDarkSecondary dark:text-gray-400 whitespace-nowrap leading-tight">
                                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                        </div>
                    </div>
                    {/* Mobile Close Button */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden flex items-center justify-center w-8 h-8 rounded-full text-brand-textDarkSecondary dark:text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-brand-textPrimary hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 transition-float hover:-translate-y-0.5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 shadow-layered-sm"
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
                                    group relative flex items-center rounded-xl transition-all duration-300 font-bold overflow-hidden border
                                    ${activeTab === item.id
                                            ? 'nav-item-active shadow-layered-sm'
                                            : 'nav-item-hover text-brand-textDarkSecondary dark:text-gray-400 border-transparent'
                                        }
                                    ${isCollapsed ? 'lg:w-12 lg:h-12 lg:justify-center w-full h-12' : 'w-full h-12 px-2'}
                                `}
                                    title={isCollapsed ? item.label : undefined}
                                    aria-label={item.label}
                                >
                                    <div className="flex items-center justify-center w-12 shrink-0 transition-transform duration-300 group-hover:scale-110">
                                        <item.icon size={20} className={activeTab === item.id ? 'text-brand-accent' : ''} />
                                    </div>
                                    <span className={`whitespace-nowrap transition-all duration-300 ease-in-out tracking-tight ${isCollapsed ? 'lg:w-0 lg:opacity-0 opacity-100' : 'opacity-100 ml-1'}`}>
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
                                        <ul className="min-h-0 overflow-hidden ml-6 border-l border-slate-200 dark:border-white/10 pl-4 space-y-1 list-none m-0 p-0 py-2">
                                            {classrooms.map(cls => (
                                                <li key={cls.id}>
                                                    <button
                                                        onClick={() => handleClassSelect(cls.id)}
                                                        className={`
                                                        w-full text-left p-2.5 text-xs rounded-xl font-bold transition-all duration-300 border
                                                        ${currentClassId === cls.id
                                                                ? 'text-brand-accent bg-brand-accent/5 border-brand-accent/20 shadow-layered-sm glow-accent/10'
                                                                : 'text-brand-textDarkSecondary hover:text-brand-textDarkPrimary dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/5 shadow-none hover:shadow-layered-sm'}
                                                    `}
                                                    >
                                                        <span className="truncate block">{cls.name}</span>
                                                    </button>
                                                </li>
                                            ))}
                                            <li>
                                                <button
                                                    onClick={() => setIsClassModalOpen(true)}
                                                    className="w-full text-left p-2.5 text-xs rounded-xl font-bold text-gray-400 hover:text-brand-accent hover:bg-white dark:hover:bg-brand-accent/5 border border-transparent hover:border-brand-accent/20 hover:shadow-layered-sm transition-all duration-300 transition-float hover:-translate-y-0.5 flex items-center gap-2 mt-2 group/add"
                                                >
                                                    <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-white/10 flex items-center justify-center transition-all duration-300 group-hover/add:bg-brand-accent/10 group-hover/add:scale-110 shadow-layered-sm">
                                                        <Plus size={14} className="transition-transform group-hover/add:rotate-90" />
                                                    </div>
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
                                        <ul className="min-h-0 overflow-hidden ml-6 border-l border-slate-200 dark:border-white/10 pl-4 space-y-1 list-none m-0 p-0 py-2">
                                            <li>
                                                <button
                                                    onClick={() => setTasksSubTab('create')}
                                                    className={`w-full text-left p-2.5 text-xs rounded-xl font-bold transition-all duration-300 border ${tasksSubTab === 'create' ? 'text-brand-accent bg-brand-accent/5 border-brand-accent/20 shadow-layered-sm' : 'text-brand-textDarkSecondary dark:text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/5 shadow-none hover:shadow-layered-sm'}`}
                                                >
                                                    Create
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    onClick={() => setTasksSubTab('browse')}
                                                    className={`w-full text-left p-2.5 text-xs rounded-xl font-bold transition-all duration-300 border ${tasksSubTab === 'browse' ? 'text-brand-accent bg-brand-accent/5 border-brand-accent/20 shadow-layered-sm' : 'text-brand-textDarkSecondary dark:text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/5 shadow-none hover:shadow-layered-sm'}`}
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
                                        <ul className="min-h-0 overflow-hidden ml-6 border-l border-slate-200 dark:border-white/10 pl-4 space-y-1 list-none m-0 p-0 py-2">
                                            <li>
                                                <button
                                                    onClick={() => setLiveViewSubTab('tasks')}
                                                    className={`w-full text-left p-2.5 text-xs rounded-xl font-bold transition-all duration-300 border ${liveViewSubTab === 'tasks' ? 'text-brand-accent bg-brand-accent/5 border-brand-accent/20 shadow-layered-sm' : 'text-brand-textDarkSecondary dark:text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/5 shadow-none hover:shadow-layered-sm'}`}
                                                >
                                                    By Task
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    onClick={() => setLiveViewSubTab('students')}
                                                    className={`w-full text-left p-2.5 text-xs rounded-xl font-bold transition-all duration-300 border ${liveViewSubTab === 'students' ? 'text-brand-accent bg-brand-accent/5 border-brand-accent/20 shadow-layered-sm' : 'text-brand-textDarkSecondary dark:text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/5 shadow-none hover:shadow-layered-sm'}`}
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
                                        <ul className="min-h-0 overflow-hidden ml-6 border-l border-slate-200 dark:border-white/10 pl-4 space-y-1 list-none m-0 p-0 py-2">
                                            <li>
                                                <button
                                                    onClick={() => setReportsSubTab('calendar')}
                                                    className={`w-full text-left p-2.5 text-xs rounded-xl font-bold transition-all duration-300 border ${reportsSubTab === 'calendar' ? 'text-brand-accent bg-brand-accent/5 border-brand-accent/20 shadow-layered-sm' : 'text-brand-textDarkSecondary dark:text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/5 shadow-none hover:shadow-layered-sm'}`}
                                                >
                                                    Calendar
                                                </button>
                                            </li>
                                            <li>
                                                <button
                                                    onClick={() => setReportsSubTab('analytics')}
                                                    className={`w-full text-left p-2.5 text-xs rounded-xl font-bold transition-all duration-300 border ${reportsSubTab === 'analytics' ? 'text-brand-accent bg-brand-accent/5 border-brand-accent/20 shadow-layered-sm' : 'text-brand-textDarkSecondary dark:text-gray-400 hover:text-brand-textDarkPrimary dark:hover:text-gray-200 hover:bg-white dark:hover:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/5 shadow-none hover:shadow-layered-sm'}`}
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

                <div className="px-4 pb-6 pt-4 space-y-2 shrink-0">
                    <button
                        onClick={() => {
                            setIsCollapsed(!isCollapsed);
                            setIsClassroomsMenuOpen(false);
                        }}
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
                        className={`hidden md:flex group relative items-center h-12 rounded-xl transition-all duration-300 transition-float hover:-translate-y-0.5 font-bold overflow-hidden border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 shadow-layered-sm ${isCollapsed ? 'w-12 justify-center' : 'w-full'}`}
                        title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
                    >
                        <div className="flex items-center justify-center w-12 shrink-0 text-brand-textDarkSecondary dark:text-gray-400 transition-colors">
                            {isCollapsed ? <ChevronRight size={24} /> : <Menu size={20} />}
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-300 ease-in-out flex-1 text-left
                            ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'opacity-100 ml-0 text-brand-textDarkSecondary group-hover:text-brand-textDarkPrimary dark:group-hover:text-gray-200'}
                        `}>
                            Menu
                        </span>
                        {!isCollapsed && (
                            <div className="pr-3 text-gray-500 dark:text-gray-400">
                                <ChevronLeft size={20} />
                            </div>
                        )}
                    </button>
                    <div className={`hidden md:block h-px bg-slate-200 dark:bg-white/5 my-2 mx-1 transition-all duration-300 ${isCollapsed ? 'w-10' : 'w-auto'}`} />
                    <button
                        onClick={() => setIsJoinCodeOpen(true)}
                        className={`group relative flex items-center h-12 rounded-xl transition-all duration-300 transition-float hover:-translate-y-0.5 font-bold overflow-hidden border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 shadow-layered-sm ${isCollapsed ? 'w-12 justify-center' : 'w-full'
                            }`}
                        title={isCollapsed ? 'Join Code' : undefined}
                    >
                        <div className="flex items-center justify-center w-12 shrink-0 transition-colors text-gray-500 dark:text-gray-400">
                            <QrCode size={20} />
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-300 ease-in-out
                            ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'opacity-100 ml-0'}
                            text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200
                        `}>
                            Join Code
                        </span>
                    </button>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className={`group relative flex items-center h-12 rounded-xl transition-all duration-300 transition-float hover:-translate-y-0.5 font-bold overflow-hidden border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 shadow-layered-sm ${isCollapsed ? 'w-12 justify-center' : 'w-full'}`}
                        title={isCollapsed ? 'Settings' : undefined}
                    >
                        <div className="flex items-center justify-center w-12 shrink-0 text-brand-textDarkSecondary dark:text-gray-400 transition-colors">
                            <Settings size={20} />
                        </div>
                        <span className={`
                            whitespace-nowrap transition-all duration-300 ease-in-out
                            ${isCollapsed ? 'w-0 opacity-0 ml-0' : 'opacity-100 ml-0'}
                            text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200
                        `}>
                            Settings
                        </span>
                    </button>

                    {/* System Status Glass Panel */}
                    {!isCollapsed && (
                        <div className="mt-4 p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/20 dark:border-white/10 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10">System</span>
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-gray-500 dark:text-gray-400">Class State</span>
                                    <span className="text-emerald-500">Live</span>
                                </div>
                                <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    )}

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
                <div className="flex-1 min-h-0 min-w-0 relative overflow-visible">
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
