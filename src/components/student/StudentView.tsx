import React, { useState, useEffect, useRef } from 'react';
import MiniCalendar from './MiniCalendar';
import CurrentTaskList from './CurrentTaskList';
import DayTaskPreview from './DayTaskPreview';
import StudentNameModal from './StudentNameModal';
import StudentMenuModal from './StudentMenuModal';
import StudentSidebar from './StudentSidebar';
import StudentProjectsView from './StudentProjectsView';
import CircularProgress from '../shared/CircularProgress';
import toast from 'react-hot-toast';
import { Task, TaskStatus } from '../../types';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { studentDataService } from '../../services/studentDataService';
import { Menu } from 'lucide-react';
import { scrubAndSaveSession } from '../../utils/analyticsScrubber';
import { clearAllStudentData } from '../../services/storageService';
import OfflineIndicator from '../shared/OfflineIndicator';
import { SyncStatus } from '../../services/studentDataService';

/**
 * Props for the StudentView component.
 * @property studentName - The name of the currently logged-in student.
 * @property classId - The ID of the class the student is connected to.
 * @property onEditName - Callback to change the student's name (e.g., if they made a typo).
 * @property onNameSubmit - Callback when the student first enters their name.
 * @property onSignOut - Callback when the student signs out.
 * @property className - Optional name of the class (e.g., "Mrs. Smith's Class").
 * @property isLive - Optional boolean indicating if the classroom session is active.
 */
interface StudentViewProps {
    studentName: string;
    classId: string;
    onEditName: (name: string) => void;
    onNameSubmit: (name: string) => void;
    onSignOut: () => void;
    className?: string;
    isLive?: boolean;
}

/**
 * StudentView Component
 * 
 * The main dashboard for the student. It orchestrates:
 * 1. The calendar for selecting dates.
 * 2. The list of tasks for the selected day.
 * 3. The logic for updating task statuses and comments.
 * 4. The modal for entering the student's name.
 */
const StudentView: React.FC<StudentViewProps> = ({
    studentName,
    classId,
    onEditName,
    onNameSubmit,
    onSignOut,
    className = "Mrs. Smith's Class",
    isLive: _isLive = true  // Kept for potential future use
}) => {
    // Get today's date in YYYY-MM-DD format for initial state
    const today = new Date().toISOString().split('T')[0] ?? '';

    // State for the class name
    const [currentClassName, setCurrentClassName] = useState<string>(className);

    // Fetch class name on mount
    React.useEffect(() => {
        const fetchClassName = async () => {
            if (!classId) return;
            try {
                const classDoc = await getDoc(doc(db, 'classrooms', classId));
                if (classDoc.exists()) {
                    const name = classDoc.data().name;
                    setCurrentClassName(name);
                }
            } catch (error) {
                console.error("Error fetching class name:", error);
            }
        };
        fetchClassName();
    }, [classId]);

    // State for the currently selected date in the calendar
    const [selectedDate, setSelectedDate] = useState<string>(today);

    // State to control the visibility of the name entry modal
    // Show it automatically if no studentName is provided
    const [showNameModal, setShowNameModal] = useState<boolean>(!studentName);

    // Mobile tab navigation state (tasks, projects, and schedule)
    const [mobileTab, setMobileTab] = useState<'tasks' | 'projects' | 'schedule'>('tasks');

    // Desktop tab navigation state for sidebar
    const [desktopTab, setDesktopTab] = useState<'tasks' | 'projects' | 'schedule'>('tasks');

    // Menu modal state (mobile)
    const [showMenuModal, setShowMenuModal] = useState<boolean>(false);

    // Mobile sidebar open state
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

    // Sidebar collapse state (desktop)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

    // State for the tasks currently in the student's "My Day" view
    const [currentTasks, setCurrentTasks] = useState<Task[]>([]);

    // Track which task set we've already populated to avoid duplicate restoration calls
    // Uses a hash of task IDs to detect when the task set has changed
    const lastPopulatedTaskIdsRef = useRef<string>('');

    // Firestore-fetched tasks for the selected date (schedule view)
    const [scheduleTasks, setScheduleTasks] = useState<Task[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);

    // Network status for offline indicator
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        isOnline: navigator.onLine,
        lastSyncTime: null,
        pendingOperations: 0,
        isSyncing: false,
    });

    // Subscribe to sync status from service
    useEffect(() => {
        const unsubscribe = studentDataService.onSyncStatusChange((status) => {
            setSyncStatus(status);
        });
        return () => unsubscribe();
    }, []);

    // Initialize service on mount
    useEffect(() => {
        if (classId) {
            studentDataService.initialize(classId);
        }
    }, [classId]);



    // Subscribe to tasks via service
    useEffect(() => {
        if (!classId) return;

        setScheduleLoading(true);

        const unsubscribe = studentDataService.subscribeToTasks(async (taskData: Task[]) => {
            const fetchedTasks: Task[] = taskData.filter(task => {
                const startDate = task.startDate || '';
                const endDate = task.endDate || task.startDate || '';
                const inRange = selectedDate >= startDate && selectedDate <= endDate;
                return inRange && task.status !== 'draft';
            });

            setScheduleTasks(fetchedTasks);

            // AUTO-POPULATE: Restore saved statuses
            if (fetchedTasks.length > 0 && selectedDate === today) {
                const taskIdsHash = fetchedTasks.map(t => t.id).sort().join(',');

                if (lastPopulatedTaskIdsRef.current === taskIdsHash && currentTasks.length > 0) {
                    setScheduleLoading(false);
                    return;
                }
                lastPopulatedTaskIdsRef.current = taskIdsHash;

                const currentUser = auth.currentUser;

                let savedStatuses: Record<string, TaskStatus> = {};
                if (currentUser && classId) {
                    try {
                        const studentDoc = await getDoc(doc(db, 'classrooms', classId, 'live_students', currentUser.uid));
                        if (studentDoc.exists()) {
                            savedStatuses = studentDoc.data()?.taskStatuses || {};
                        }
                    } catch (error) {
                        console.warn('[StudentView] Could not restore saved statuses:', error);
                    }
                }

                setCurrentTasks(fetchedTasks.map(task => ({
                    ...task,
                    status: savedStatuses[task.id] || 'todo' as const
                })));
            }

            setScheduleLoading(false);
        });

        return () => unsubscribe();
    }, [classId, selectedDate, today]);

    /**
     * Syncs the student's progress to the teacher's dashboard via Firestore.
     * OFFLINE SUPPORT: Queues operations when offline, syncs when back online.
     */
    const syncToTeacher = async (
        taskId: string,
        status: TaskStatus,
        updatedTasks: Task[],
        comment: string = ''
    ) => {
        const completedCount = updatedTasks.filter(t => t.status === 'done').length;
        const activeTasks = updatedTasks.filter(t => t.status === 'in_progress').map(t => t.id);

        await studentDataService.syncProgress(
            taskId,
            status,
            { completedCount, activeTasks },
            comment
        );
    };



    /**
     * Updates the status of a specific task (e.g., todo -> in_progress).
     * Also triggers toast notifications and syncs to backend.
     */
    const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
        // Calculate updated tasks for sync (avoids stale closure)
        const updatedTasks = currentTasks.map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task
        );

        // Optimistic update: Update UI immediately before server confirms
        setCurrentTasks(updatedTasks);

        // Sync with the updated tasks array
        syncToTeacher(taskId, newStatus, updatedTasks);

        // Show feedback to the student
        if (newStatus === 'help') {
            toast('Teacher notified that you need help!', { icon: '🙋' });
        } else if (newStatus === 'done') {
            toast.success("Great job! Task completed.");
        }
    };


    /**
     * Updates the comment for a specific task.
     */
    const handleUpdateComment = (taskId: string, comment: string) => {
        const updatedTasks = currentTasks.map((task) =>
            task.id === taskId ? { ...task, comment } : task
        );

        setCurrentTasks(updatedTasks);

        const task = updatedTasks.find(t => t.id === taskId);
        if (task) {
            syncToTeacher(taskId, task.status, updatedTasks, comment);
        }
    };

    /**
     * Imports tasks from a future date into the current day's view.
     * Filters out tasks that are already in the current list.
     */
    const handleImportTasks = () => {
        if (scheduleTasks.length === 0) return;

        // Filter out tasks that already exist in currentTasks
        const existingIds = new Set(currentTasks.map(t => t.id));
        const newTasks = scheduleTasks.filter(t => !existingIds.has(t.id));

        if (newTasks.length === 0) {
            toast.error('All tasks are already in your list!');
            return;
        }

        // Combine and re-sort by presentationOrder to maintain correct ordering
        setCurrentTasks(prev => {
            const combined = [...prev, ...newTasks];
            return combined.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
        });
        toast.success(`Imported ${newTasks.length} task${newTasks.length !== 1 ? 's' : ''} to your day`);
    };

    /**
     * Imports a single task from schedule to current day's view.
     */
    const handleImportTask = (task: Task) => {
        // Check if task already exists
        if (currentTasks.some(t => t.id === task.id)) {
            toast.error('Task already in your list!');
            return;
        }

        // Add and re-sort by presentationOrder to maintain correct ordering
        setCurrentTasks(prev => {
            const combined = [...prev, task];
            return combined.sort((a, b) => (a.presentationOrder || 0) - (b.presentationOrder || 0));
        });
        toast.success(`Added "${task.title}" to today's tasks`);
    };

    /**
     * Handles the submission of the student's name from the modal.
     */
    const handleNameSubmit = (name: string) => {
        studentDataService.updateDisplayName(name); // Sync to live session
        onNameSubmit(name);
        setShowNameModal(false);
    };

    /**
     * Handles the student signing out.
     * Cleans up live_students document, scrubs session data, and clears local storage.
     * SECURITY: clearAllStudentData prevents data leakage on shared devices.
     */
    const handleSignOut = async () => {
        const currentUser = auth.currentUser;
        if (currentUser && classId) {
            try {
                // Remove from live_students so teacher sees student as disconnected
                const studentRef = doc(db, 'classrooms', classId, 'live_students', currentUser.uid);
                await deleteDoc(studentRef);

                await scrubAndSaveSession(classId, currentUser.uid);

                // SECURITY: Clear all local storage (IndexedDB, localStorage, sessionStorage)
                await clearAllStudentData();

                toast.success('Session saved. Goodbye!');
            } catch (error) {
                console.error("Error during sign-out cleanup:", error);
                toast.error('Error saving session data.');
            }
        }
        onSignOut();
    };

    // Determine what content to show based on the selected date
    const isToday = selectedDate === today;
    const previewTasks = scheduleTasks;
    const showPreview = !isToday && previewTasks.length > 0;

    // Calculate task stats
    const tasksCompleted = currentTasks.filter(t => t.status === 'done').length;
    const tasksInProgress = currentTasks.filter(t => t.status === 'in_progress').length;
    const hasStartedWork = currentTasks.some(t => t.status !== 'todo');

    // Set of current task IDs for checking imported state
    const currentTaskIds = new Set(currentTasks.map(t => t.id));

    // Handler for mobile tab change - resets date to today when switching to tasks
    const handleMobileTabChange = (tab: 'tasks' | 'projects' | 'schedule') => {
        if (tab === 'tasks') {
            setSelectedDate(today);
        }
        setMobileTab(tab);
    };

    // Unified handler for sidebar - updates both mobile and desktop tabs
    const handleSidebarTabChange = (tab: 'tasks' | 'projects' | 'schedule') => {
        if (tab === 'tasks') {
            setSelectedDate(today);
        }
        setDesktopTab(tab);
        setMobileTab(tab);
    };

    return (
        <div className="app-container">
            {/* Decorative Background Blobs removed for Gravity Background */}
            {/* Responsive Sidebar - Desktop static, Mobile slide-in */}
            <StudentSidebar
                tasksCompleted={tasksCompleted}
                totalTasks={currentTasks.length}
                activeTab={desktopTab}
                onTabChange={handleSidebarTabChange}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onOpenSettings={() => setShowMenuModal(true)}
                isMobileOpen={isMobileSidebarOpen}
                onMobileClose={() => setIsMobileSidebarOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Mobile Header */}
                <header className="md:hidden h-12 px-4 flex items-center justify-between z-10 shrink-0 border-b border-border-subtle shadow-layered-sm">
                    {/* Left: Hamburger Menu */}
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="flex items-center justify-center text-brand-textSecondary hover:text-brand-textPrimary transition-colors duration-200 focus:outline-none"
                        aria-label="Open navigation menu"
                        aria-expanded={isMobileSidebarOpen ? "true" : "false"}
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    {/* Center: Class Name */}
                    <h1 className="text-xl font-bold text-brand-textPrimary truncate underline decoration-2 underline-offset-2 decoration-brand-accent">
                        {currentClassName}
                    </h1>
                    {/* Right: Progress donut */}
                    <div className="flex items-center gap-2 whitespace-nowrap">
                        <CircularProgress
                            total={currentTasks.length}
                            inProgress={tasksInProgress}
                            completed={tasksCompleted}
                            hasStarted={hasStartedWork}
                            className="w-6 h-6"
                        />
                    </div>
                </header>

                {/* Desktop Content - Split into Tasks, Projects, and Schedule based on tab */}
                <main className="hidden md:flex flex-1 overflow-hidden">
                    {desktopTab === 'tasks' ? (
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
                            <div className="max-w-4xl mx-auto">
                                {/* Desktop Inline Content Header */}
                                <div className="h-16 shrink-0 flex items-center justify-between">
                                    <h1 className="text-fluid-xl font-bold text-brand-textPrimary truncate underline decoration-2 underline-offset-4 decoration-brand-accent">
                                        {currentClassName}
                                    </h1>
                                    <CircularProgress
                                        total={currentTasks.length}
                                        inProgress={tasksInProgress}
                                        completed={tasksCompleted}
                                        hasStarted={hasStartedWork}
                                        className="w-8 h-8"
                                    />
                                </div>
                                {showPreview ? (
                                    <DayTaskPreview
                                        date={selectedDate}
                                        tasks={previewTasks}
                                        onImport={handleImportTasks}
                                        onImportTask={handleImportTask}
                                        importedTaskIds={currentTaskIds}
                                    />
                                ) : isToday ? (
                                    <CurrentTaskList
                                        tasks={currentTasks}
                                        onUpdateStatus={handleUpdateStatus}
                                        onUpdateComment={handleUpdateComment}
                                        assignedDate={today}
                                        studentName={studentName}
                                        classroomId={classId}
                                    />
                                ) : (
                                    <div className="text-center py-12 italic bg-tile rounded-2xl border border-dashed border-border-subtle shadow-layered-sm">
                                        <p className="text-brand-textSecondary">
                                            {previewTasks.length > 0
                                                ? "Import these tasks to start working on them."
                                                : "No tasks scheduled for this day."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : desktopTab === 'projects' ? (
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
                            <div className="max-w-4xl mx-auto">
                                {/* Desktop Inline Content Header */}
                                <div className="h-16 shrink-0 flex items-center justify-between pr-[22px]">
                                    <h1 className="text-fluid-xl font-bold text-brand-textPrimary truncate underline decoration-2 underline-offset-4 decoration-brand-accent">
                                        {currentClassName}
                                    </h1>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-sm font-medium text-brand-textSecondary">
                                            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        <CircularProgress
                                            total={currentTasks.length}
                                            inProgress={tasksInProgress}
                                            completed={tasksCompleted}
                                            hasStarted={hasStartedWork}
                                            className="w-8 h-8"
                                        />
                                    </div>
                                </div>
                                <StudentProjectsView
                                    classId={classId}
                                    onImportTask={handleImportTask}
                                    currentTaskIds={currentTaskIds}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
                            <div className="max-w-4xl mx-auto">
                                {/* Desktop Inline Content Header */}
                                <div className="h-16 shrink-0 flex items-center justify-between pr-[22px]">
                                    <h1 className="text-fluid-xl font-bold text-brand-textPrimary truncate underline decoration-2 underline-offset-4 decoration-brand-accent">
                                        {currentClassName}
                                    </h1>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-sm font-medium text-brand-textSecondary">
                                            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                        </span>
                                        <CircularProgress
                                            total={currentTasks.length}
                                            inProgress={tasksInProgress}
                                            completed={tasksCompleted}
                                            hasStarted={hasStartedWork}
                                            className="w-8 h-8"
                                        />
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <MiniCalendar
                                        selectedDate={selectedDate}
                                        onSelectDate={setSelectedDate}
                                    />
                                </div>
                                <div className="mt-6">
                                    <h3 className="text-fluid-lg font-bold mb-4 text-brand-textPrimary">
                                        Tasks for {isToday ? 'Today' : new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </h3>
                                    {scheduleLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-accent"></div>
                                        </div>
                                    ) : (
                                        <DayTaskPreview
                                            date={selectedDate}
                                            tasks={isToday ? currentTasks : previewTasks}
                                            onImport={handleImportTasks}
                                            onImportTask={handleImportTask}
                                            importedTaskIds={currentTaskIds}
                                            hideImportButtons={isToday}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* Mobile Content */}
                <main className="md:hidden flex-1 overflow-y-auto custom-scrollbar px-4 pt-4 pb-24">
                    {mobileTab === 'tasks' ? (
                        <div>
                            {showPreview ? (
                                <DayTaskPreview
                                    date={selectedDate}
                                    tasks={previewTasks}
                                    onImport={handleImportTasks}
                                    onImportTask={handleImportTask}
                                    importedTaskIds={currentTaskIds}
                                />
                            ) : isToday ? (
                                <CurrentTaskList
                                    tasks={currentTasks}
                                    onUpdateStatus={handleUpdateStatus}
                                    onUpdateComment={handleUpdateComment}
                                    assignedDate={today}
                                    studentName={studentName}
                                    classroomId={classId}
                                />
                            ) : (
                                <div className="text-center py-12 bg-tile rounded-2xl border border-dashed border-border-subtle shadow-layered-sm">
                                    <p className="text-brand-textSecondary font-medium">
                                        {previewTasks.length > 0
                                            ? "Import these tasks to start working on them."
                                            : "No tasks scheduled for this day."}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : mobileTab === 'projects' ? (
                        <div>
                            <h2 className="text-fluid-lg font-bold mb-4 text-brand-textPrimary">
                                Projects & Assignments
                            </h2>
                            <StudentProjectsView
                                classId={classId}
                                onImportTask={handleImportTask}
                                currentTaskIds={currentTaskIds}
                            />
                        </div>
                    ) : (
                        <div>
                            <div className="mb-4">
                                <MiniCalendar
                                    selectedDate={selectedDate}
                                    onSelectDate={setSelectedDate}
                                />
                            </div>
                            <div className="mt-4">
                                <h3 className="text-fluid-lg font-bold mb-3 text-brand-textPrimary">
                                    {isToday ? "Today's Tasks" : `Tasks for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
                                </h3>
                                {scheduleLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-brand-accent"></div>
                                    </div>
                                ) : (
                                    <DayTaskPreview
                                        date={selectedDate}
                                        tasks={isToday ? currentTasks : previewTasks}
                                        onImport={handleImportTasks}
                                        onImportTask={handleImportTask}
                                        importedTaskIds={currentTaskIds}
                                        hideImportButtons={isToday}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Name Entry Modal */}
            {showNameModal && (
                <StudentNameModal
                    onSubmit={handleNameSubmit}
                    initialName={studentName}
                    onClose={() => setShowNameModal(false)}
                />
            )}

            {/* Mobile Menu Modal */}
            <StudentMenuModal
                isOpen={showMenuModal}
                onClose={() => setShowMenuModal(false)}
                studentName={studentName}
                className={currentClassName}
                tasksCompleted={tasksCompleted}
                totalTasks={currentTasks.length}
                onSignOut={handleSignOut}
                onEditName={() => {
                    setShowMenuModal(false);
                    onEditName(studentName);
                }}
                activeTab={mobileTab}
                onTabChange={handleMobileTabChange}
            />

            {/* Offline Indicator - shows when offline or pending operations */}
            <OfflineIndicator
                syncStatus={syncStatus}
                onRefresh={() => studentDataService.forceCacheReload()}
            />
        </div>
    );
};

export default StudentView;
