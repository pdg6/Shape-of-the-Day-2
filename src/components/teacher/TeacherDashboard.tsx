import React, { useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Classroom } from '../../types';
import { useClassStore } from '../../store/classStore';
import {
    LayoutDashboard,
    Clock,
    Users,
    Activity,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    LucideIcon,
    Sun,
    Moon,
    ChevronDown,
    Plus,
    Check,
    History,
    BookOpen
} from 'lucide-react';
import TaskManager from './TaskManager';
import ShapeOfDay from './ShapeOfDay';
import LiveView from './LiveView';
import ClassroomManager from './ClassroomManager';
import ConnectionSidebar from './ConnectionSidebar';

/**
 * Definition for a navigation item in the sidebar.
 */
interface MenuItem {
    id: 'tasks' | 'shape' | 'live' | 'classrooms';
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
 * 4. The new ConnectionSidebar for managing student joins.
 */
const TeacherDashboard: React.FC = () => {
    // State to track the currently active view
    const [activeTab, setActiveTab] = useState<MenuItem['id']>('tasks');

    // Global state
    const { darkMode, toggleDarkMode, setCurrentClassId } = useClassStore();

    // State for sidebar visibility (Desktop: collapsed/expanded, Mobile: hidden/shown)
    // State for sidebar visibility (Desktop: collapsed/expanded, Mobile: hidden/shown)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // State for Class Selector and Sub-navigation
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false);
    const [classroomSubTab, setClassroomSubTab] = useState<'classes' | 'history'>('classes');

    // Hardcoded for Stage 1 Demo - In real app, this comes from the loaded Class object
    const DEMO_CLASS_CODE = "123456";
    const DEMO_CLASS_ID = "demo-class-123";

    const { currentClassId } = useClassStore(); // Get current class ID from store

    // Fetch Classrooms
    React.useEffect(() => {
        const fetchClassrooms = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(collection(db, 'classrooms'), where('teacherId', '==', auth.currentUser.uid));
                const snapshot = await getDocs(q);
                const data: Classroom[] = [];
                snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Classroom));
                setClassrooms(data);

                // If no class is selected but we have classes, select the first one
                if (data.length > 0 && !currentClassId) {
                    setCurrentClassId(data[0].id);
                }
            } catch (error) {
                console.error("Error fetching classrooms:", error);
            }
        };
        fetchClassrooms();
    }, [auth.currentUser, setCurrentClassId, currentClassId]);

    // Set the current class ID in the global store on mount if not set (Demo Fallback)
    React.useEffect(() => {
        if (!currentClassId) {
            setCurrentClassId(DEMO_CLASS_ID);
        }
    }, [setCurrentClassId, currentClassId]);

    const currentClass = classrooms.find(c => c.id === currentClassId);

    const menuItems: MenuItem[] = [
        { id: 'tasks', label: 'Task Manager', icon: LayoutDashboard },
        { id: 'shape', label: 'Shape of Day', icon: Clock },
        { id: 'live', label: 'Live View', icon: Activity },
        { id: 'classrooms', label: 'Classrooms', icon: Users },
    ];

    /**
     * Renders the appropriate component based on the active tab.
     */
    const renderContent = () => {
        switch (activeTab) {
            case 'tasks': return <TaskManager />;
            case 'shape': return <ShapeOfDay />;
            case 'live': return <LiveView />;
            case 'classrooms': return <ClassroomManager activeView={classroomSubTab} />;
            default: return <TaskManager />;
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-brand-light dark:bg-brand-dark transition-colors duration-300 relative overflow-hidden">
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
          fixed lg:static inset-y-0 left-0 z-40
          bg-brand-lightSurface dark:bg-brand-darkSurface transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'w-64' : 'w-20'}
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
            >
                <div className="h-full flex flex-col">
                    {/* Mobile Header (Close button) */}
                    <div className="lg:hidden flex items-center justify-between p-4">
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
                            const isClassrooms = item.id === 'classrooms';

                            return (
                                <div key={item.id} className="space-y-1">
                                    <button
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            if (!isClassrooms) setIsMobileMenuOpen(false);
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

                                    {/* Sub-menu for Classrooms */}
                                    {isClassrooms && isActive && isSidebarOpen && (
                                        <div className="pl-11 space-y-1 animate-in slide-in-from-left-2 duration-200">
                                            <button
                                                onClick={() => {
                                                    setClassroomSubTab('classes');
                                                    setIsMobileMenuOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${classroomSubTab === 'classes' ? 'text-brand-accent bg-brand-accent/5' : 'text-gray-500 hover:text-brand-textDarkPrimary dark:hover:text-brand-textPrimary hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                            >
                                                My Classes
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setClassroomSubTab('history');
                                                    setIsMobileMenuOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${classroomSubTab === 'history' ? 'text-brand-accent bg-brand-accent/5' : 'text-gray-500 hover:text-brand-textDarkPrimary dark:hover:text-brand-textPrimary hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                            >
                                                History & Analytics
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>

                    {/* Sidebar Footer Actions */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className={`w-full flex items-center justify-center p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors ${isSidebarOpen ? 'gap-3' : ''}`}
                            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                        >
                            {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                            <span className={`font-medium whitespace-nowrap transition-all duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 hidden lg:block w-0 overflow-hidden'}`}>
                                {darkMode ? 'Dark Mode' : 'Light Mode'}
                            </span>
                        </button>

                        {/* Sidebar Toggle (Desktop only) */}
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="hidden lg:flex w-full items-center justify-center p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                        >
                            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Mobile Menu Trigger Bar */}
                <div className="lg:hidden p-4 bg-brand-lightSurface dark:bg-brand-darkSurface flex items-center gap-3">
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

                {/* Desktop Header with Class Dropdown */}
                <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-brand-lightSurface dark:bg-brand-darkSurface border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            {menuItems.find(i => i.id === activeTab)?.label}
                        </h1>
                    </div>

                    {/* Class Selector Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
                            className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-900 border-[3px] border-gray-200 dark:border-gray-700 rounded-xl hover:border-brand-accent transition-colors min-w-[200px] justify-between"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentClass?.color || '#3B82F6' }} />
                                <span className="font-bold text-sm text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    {currentClass?.name || 'Select Class'}
                                </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isClassDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isClassDropdownOpen && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsClassDropdownOpen(false)}
                                />
                                <div className="absolute right-0 top-full mt-2 w-64 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl shadow-xl border-[3px] border-gray-200 dark:border-gray-700 z-20 overflow-hidden animate-in zoom-in-95 duration-100">
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                                        {classrooms.map(cls => (
                                            <button
                                                key={cls.id}
                                                onClick={() => {
                                                    setCurrentClassId(cls.id);
                                                    setIsClassDropdownOpen(false);
                                                }}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentClassId === cls.id
                                                    ? 'bg-brand-accent/10 text-brand-accent'
                                                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-brand-textDarkPrimary dark:text-brand-textPrimary'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cls.color || '#3B82F6' }} />
                                                    <span className="truncate max-w-[140px]">{cls.name}</span>
                                                </div>
                                                {currentClassId === cls.id && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-2 border-t-[3px] border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                        <button
                                            onClick={() => {
                                                setActiveTab('classrooms');
                                                setClassroomSubTab('classes');
                                                setIsClassDropdownOpen(false);
                                            }}
                                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-accent text-white rounded-lg text-sm font-bold hover:bg-brand-accent/90 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Add New Class
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </header>

                {/* Actual Page Content */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {renderContent()}
                    </div>
                </main>
            </div>

            {/* Connection Sidebar (Right Side) */}
            <ConnectionSidebar
                classCode={DEMO_CLASS_CODE}
                classId={DEMO_CLASS_ID}
            />
        </div>
    );
};

export default TeacherDashboard;
