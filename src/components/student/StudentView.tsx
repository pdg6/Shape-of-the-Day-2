import React, { useState } from 'react';
import MiniCalendar from './MiniCalendar';
import CurrentTaskList from './CurrentTaskList';
import DayTaskPreview from './DayTaskPreview';
import StudentNameModal from './StudentNameModal';
import StudentMenuModal from './StudentMenuModal';
import StudentSidebar from './StudentSidebar';
import toast from 'react-hot-toast';
import { Task, TaskStatus } from '../../types';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Calendar, ListTodo, Menu } from 'lucide-react';
import { scrubAndSaveSession } from '../../utils/analyticsScrubber';

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

    // Mobile tab navigation state (tasks and schedule only, home replaced with menu modal)
    const [mobileTab, setMobileTab] = useState<'tasks' | 'schedule'>('tasks');

    // Desktop tab navigation state for sidebar
    const [desktopTab, setDesktopTab] = useState<'tasks' | 'schedule'>('tasks');

    // Menu modal state (mobile)
    const [showMenuModal, setShowMenuModal] = useState<boolean>(false);

    // Sidebar collapse state (desktop)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

    // State for the tasks currently in the student's "My Day" view
    const [currentTasks, setCurrentTasks] = useState<Task[]>([
        { id: '1', title: 'Morning Check-in', description: 'Say hello to the class!', status: 'todo', dueDate: today },
        { id: '2', title: 'Math Worksheet', description: 'Complete pages 10-12', status: 'in_progress', dueDate: today },
    ]);

    // Mock database of tasks available for future dates
    // In a real app, this would come from an API/backend
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0] ?? '';
    const [availableTasks] = useState<Record<string, Task[]>>({
        [today]: [], // Already imported
        // Tomorrow's tasks
        [tomorrow]: [
            { id: '3', title: 'Reading Time', description: 'Read for 20 minutes', status: 'todo', dueDate: tomorrow },
            { id: '4', title: 'Art Project', description: 'Draw your favorite animal', status: 'todo', dueDate: tomorrow },
        ]
    });

    /**
     * Syncs the student's progress to the teacher's dashboard via Firestore.
     */
    const syncToTeacher = async (taskId: string, status: TaskStatus, comment: string = '') => {
        if (!auth.currentUser || !classId) return;

        // const task = currentTasks.find(t => t.id === taskId);
        const completedCount = currentTasks.filter(t => t.status === 'done').length;
        const activeTasks = currentTasks.filter(t => t.status === 'in_progress').map(t => t.id);

        try {
            const studentRef = doc(db, 'classrooms', classId, 'live_students', auth.currentUser.uid);

            await updateDoc(studentRef, {
                currentStatus: status,
                currentTaskId: taskId,
                'metrics.tasksCompleted': completedCount,
                'metrics.activeTasks': activeTasks,
                currentMessage: comment,
                lastActive: new Date() // Heartbeat
            });

            console.log('[SYNC] Updated Firestore for student:', auth.currentUser.uid);
        } catch (error) {
            console.error("Failed to sync student state:", error);
            // Don't show toast for background sync errors to avoid spamming the user
        }
    };

    /**
     * Updates the status of a specific task (e.g., todo -> in_progress).
     * Also triggers toast notifications and syncs to backend.
     */
    const handleUpdateStatus = (taskId: string, newStatus: TaskStatus) => {
        // Optimistic update: Update UI immediately before server confirms
        setCurrentTasks((prev) =>
            prev.map((task) =>
                task.id === taskId ? { ...task, status: newStatus } : task
            )
        );

        syncToTeacher(taskId, newStatus);

        // Show feedback to the student
        if (newStatus === 'stuck') {
            toast.error("Teacher notified that you're stuck!");
        } else if (newStatus === 'question') {
            toast('Teacher notified that you have a question.', { icon: '🙋' });
        } else if (newStatus === 'done') {
            toast.success("Great job! Task completed.");
        }
    };

    /**
     * Updates the comment for a specific task.
     */
    const handleUpdateComment = (taskId: string, comment: string) => {
        setCurrentTasks((prev) =>
            prev.map((task) =>
                task.id === taskId ? { ...task, comment } : task
            )
        );

        const task = currentTasks.find(t => t.id === taskId);
        if (task) {
            syncToTeacher(taskId, task.status, comment);
        }
    };

    /**
     * Imports tasks from a future date into the current day's view.
     * Filters out tasks that are already in the current list.
     */
    const handleImportTasks = () => {
        const tasksToImport = availableTasks[selectedDate] || [];
        if (tasksToImport.length === 0) return;

        // Filter out tasks that already exist in currentTasks
        const currentTaskIds = new Set(currentTasks.map(t => t.id));
        const newTasks = tasksToImport.filter(t => !currentTaskIds.has(t.id));

        if (newTasks.length === 0) {
            toast.error('All tasks are already in your list!');
            return;
        }

        setCurrentTasks(prev => [...prev, ...newTasks]);
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

        setCurrentTasks(prev => [...prev, task]);
        toast.success(`Added "${task.title}" to today's tasks`);
    };

    /**
     * Handles the submission of the student's name from the modal.
     */
    const handleNameSubmit = (name: string) => {
        onNameSubmit(name);
        setShowNameModal(false);
    };

    /**
     * Handles the student signing out.
     * Scrubs session data before logging out.
     */
    const handleSignOut = async () => {
        if (auth.currentUser && classId) {
            try {
                await scrubAndSaveSession(classId, auth.currentUser.uid);
                toast.success('Session saved. Goodbye!');
            } catch (error) {
                console.error("Error saving session:", error);
                toast.error('Error saving session data.');
            }
        }
        onSignOut();
    };

    // Determine what content to show based on the selected date
    const isToday = selectedDate === today;
    const previewTasks = availableTasks[selectedDate] || [];
    const showPreview = !isToday && previewTasks.length > 0;

    // Calculate task stats
    const tasksCompleted = currentTasks.filter(t => t.status === 'done').length;
    const tasksLeft = currentTasks.filter(t => t.status !== 'done').length;

    // Set of current task IDs for checking imported state
    const currentTaskIds = new Set(currentTasks.map(t => t.id));

    return (
        <div className="h-full flex overflow-hidden bg-brand-light dark:bg-brand-dark text-brand-textDarkPrimary dark:text-brand-textPrimary transition-colors duration-300">
            {/* Desktop Sidebar */}
            <StudentSidebar
                studentName={studentName}
                className={currentClassName}
                tasksCompleted={tasksCompleted}
                totalTasks={currentTasks.length}
                onSignOut={handleSignOut}
                onEditName={() => onEditName(studentName)}
                activeTab={desktopTab}
                onTabChange={setDesktopTab}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                onOpenSettings={() => setShowMenuModal(true)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Mobile Header - Class Name (left), Tasks & Progress + Date (right) */}
                <header className="md:hidden h-16 bg-brand-lightSurface dark:bg-brand-darkSurface px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
                    {/* Left: Class Name */}
                    <h1 className="text-fluid-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary truncate">
                        {currentClassName}
                    </h1>
                    {/* Right: Tasks & Progress (emerald) + Date (gray) */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-fluid-sm font-semibold text-emerald-600 dark:text-emerald-500">
                            {tasksLeft} Tasks · {Math.round((tasksCompleted / Math.max(currentTasks.length, 1)) * 100)}%
                        </span>
                        <span className="text-fluid-xs font-medium text-gray-500 dark:text-gray-400">
                            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                </header>
                {/* Mobile header fade gradient */}
                <div
                    className="md:hidden absolute left-0 right-0 top-16 h-8 pointer-events-none z-dropdown bg-gradient-to-b from-brand-lightSurface dark:from-brand-darkSurface to-transparent"
                    aria-hidden="true"
                />

                {/* Desktop Header - Class Name (left), Tasks & Progress + Date (right) */}
                <header className="hidden md:flex h-16 bg-brand-lightSurface dark:bg-brand-darkSurface px-6 items-center justify-between border-b border-gray-200 dark:border-gray-800">
                    {/* Left: Class Name */}
                    <h1 className="text-fluid-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary truncate">
                        {currentClassName}
                    </h1>
                    {/* Right: Tasks & Progress (emerald) + Date (gray) */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-fluid-lg font-semibold text-emerald-600 dark:text-emerald-500">
                            {tasksLeft} Tasks · {Math.round((tasksCompleted / Math.max(currentTasks.length, 1)) * 100)}%
                        </span>
                        <span className="text-fluid-sm font-medium text-gray-500 dark:text-gray-400">
                            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                </header>
                {/* Desktop header fade gradient */}
                <div
                    className="hidden md:block absolute left-0 right-0 top-16 h-8 pointer-events-none z-dropdown bg-gradient-to-b from-brand-lightSurface dark:from-brand-darkSurface to-transparent"
                    aria-hidden="true"
                />

                {/* Desktop Content - Split into Tasks and Schedule based on tab */}
                <main className="hidden md:flex flex-1 overflow-hidden">
                    {desktopTab === 'tasks' ? (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <div className="max-w-4xl mx-auto">
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
                                    />
                                ) : (
                                    <div className="text-center py-12 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-[3px] border-dashed border-gray-300 dark:border-gray-700">
                                        <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">
                                            {previewTasks.length > 0
                                                ? "Import these tasks to start working on them."
                                                : "No tasks scheduled for this day."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            <div className="max-w-4xl mx-auto">
                                <div className="mb-6">
                                    <MiniCalendar
                                        selectedDate={selectedDate}
                                        onSelectDate={setSelectedDate}
                                    />
                                </div>
                                <div className="mt-6">
                                    <h3 className="text-fluid-lg font-bold mb-4 text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                        Tasks for {isToday ? 'Today' : new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </h3>
                                    <DayTaskPreview
                                        date={selectedDate}
                                        tasks={isToday ? currentTasks : previewTasks}
                                        onImport={handleImportTasks}
                                        onImportTask={handleImportTask}
                                        importedTaskIds={currentTaskIds}
                                        hideImportButtons={isToday}
                                    />
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
                                />
                            ) : (
                                <div className="text-center py-12 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-[3px] border-dashed border-gray-300 dark:border-gray-700">
                                    <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">
                                        {previewTasks.length > 0
                                            ? "Import these tasks to start working on them."
                                            : "No tasks scheduled for this day."}
                                    </p>
                                </div>
                            )}
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
                                <h3 className="text-fluid-lg font-bold mb-3 text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                    {isToday ? "Today's Tasks" : `Tasks for ${new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
                                </h3>
                                <DayTaskPreview
                                    date={selectedDate}
                                    tasks={isToday ? currentTasks : previewTasks}
                                    onImport={handleImportTasks}
                                    onImportTask={handleImportTask}
                                    importedTaskIds={currentTaskIds}
                                    hideImportButtons={isToday}
                                />
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
            />

            {/* Mobile footer fade gradient - content fades as it scrolls under */}
            <div
                className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.5rem)] left-0 right-0 h-8 pointer-events-none z-sidebar bg-gradient-to-t from-brand-lightSurface dark:from-brand-darkSurface to-transparent"
                aria-hidden="true"
            />

            {/* Mobile Bottom Navigation - Menu, Tasks, Schedule */}
            <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 inset-x-0 bg-brand-lightSurface dark:bg-brand-darkSurface z-sidebar safe-area-pb pb-2">
                <ul className="flex justify-around items-center h-16 px-2 list-none m-0 p-0">
                    <li aria-hidden="true">
                        <img
                            src="/shape of the day logo.png"
                            alt=""
                            className="w-8 h-8 aspect-square object-contain"
                        />
                    </li>
                    <li>
                        <button
                            onClick={() => setShowMenuModal(true)}
                            className="flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/50"
                            aria-label="Menu"
                        >
                            <Menu className="w-6 h-6" />
                            <span className="text-fluid-xs font-bold">Menu</span>
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => setMobileTab('tasks')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/50 ${mobileTab === 'tasks'
                                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-500'
                                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400'
                                }`}
                            aria-label="Tasks"
                        >
                            <ListTodo className="w-6 h-6" />
                            <span className="text-fluid-xs font-bold">Tasks</span>
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => setMobileTab('schedule')}
                            className={`flex flex-col items-center justify-center gap-1 p-2 w-16 h-16 rounded-xl border-[3px] transition-all duration-200 bg-brand-lightSurface dark:bg-brand-darkSurface focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/50 ${mobileTab === 'schedule'
                                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-500'
                                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400'
                                }`}
                            aria-label="Schedule"
                        >
                            <Calendar className="w-6 h-6" />
                            <span className="text-fluid-xs font-bold">Schedule</span>
                        </button>
                    </li>
                </ul>
            </nav>
        </div>
    );
};

export default StudentView;
