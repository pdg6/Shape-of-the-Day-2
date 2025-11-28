import React, { useState } from 'react';
import MiniCalendar from './MiniCalendar';
import CurrentTaskList from './CurrentTaskList';
import DayTaskPreview from './DayTaskPreview';
import StudentNameModal from './StudentNameModal';
import toast from 'react-hot-toast';
import { Task, TaskStatus } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { LogOut, Calendar, ListTodo } from 'lucide-react';
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
    isLive = true
}) => {
    // Get today's date in YYYY-MM-DD format for initial state
    const today = new Date().toISOString().split('T')[0];

    // State for the currently selected date in the calendar
    const [selectedDate, setSelectedDate] = useState<string>(today);

    // State to control the visibility of the name entry modal
    // Show it automatically if no studentName is provided
    const [showNameModal, setShowNameModal] = useState<boolean>(!studentName);

    // State for the tasks currently in the student's "My Day" view
    const [currentTasks, setCurrentTasks] = useState<Task[]>([
        { id: '1', title: 'Morning Check-in', description: 'Say hello to the class!', status: 'todo', dueDate: '9:00 AM' },
        { id: '2', title: 'Math Worksheet', description: 'Complete pages 10-12', status: 'in_progress', dueDate: '10:30 AM' },
    ]);

    // Mock database of tasks available for future dates
    // In a real app, this would come from an API/backend
    const [availableTasks] = useState<Record<string, Task[]>>({
        [today]: [], // Already imported
        // Tomorrow's tasks
        [new Date(Date.now() + 86400000).toISOString().split('T')[0]]: [
            { id: '3', title: 'Reading Time', description: 'Read for 20 minutes', status: 'todo', dueDate: '1:00 PM' },
            { id: '4', title: 'Art Project', description: 'Draw your favorite animal', status: 'todo', dueDate: '2:30 PM' },
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
     */
    const handleImportTasks = () => {
        const tasksToImport = availableTasks[selectedDate] || [];
        if (tasksToImport.length === 0) return;

        setCurrentTasks(prev => [...prev, ...tasksToImport]);
        toast.success(`Imported ${tasksToImport.length} tasks to your day`);
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

    return (
        <div className="min-h-screen bg-brand-light dark:bg-brand-dark text-brand-textDarkPrimary dark:text-brand-textPrimary transition-colors duration-300">
            {/* Header Section */}
            <header className="bg-brand-lightSurface dark:bg-brand-darkSurface sticky top-0 z-sidebar backdrop-blur-md bg-opacity-80 dark:bg-opacity-80 border-b-[3px] border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 py-3 md:py-0 md:h-16 flex items-center">
                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-center justify-between w-full">
                        {/* Greeting */}
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold whitespace-nowrap text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                Good Morning,
                                <button
                                    onClick={() => onEditName(studentName)}
                                    className="ml-1 text-brand-accent hover:underline decoration-2 underline-offset-4 decoration-brand-accent/30 hover:decoration-brand-accent transition-all"
                                    title="Edit Name"
                                >
                                    {studentName}
                                </button>!
                            </h2>
                        </div>

                        {/* Progress Summary */}
                        <div className="flex-1 flex justify-center px-4">
                            <div className="px-4 py-1.5 bg-brand-light dark:bg-brand-dark rounded-full border-[3px] border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary whitespace-nowrap">
                                    You have <span className="text-brand-textDarkPrimary dark:text-brand-textPrimary font-bold">{currentTasks.filter(t => t.status !== 'done').length} tasks</span> to complete today
                                </p>
                            </div>
                        </div>

                        {/* Class Info & Sign Out */}
                        <div className="flex items-center gap-4">
                            <p className="text-sm font-medium text-brand-textDarkSecondary dark:text-brand-textSecondary whitespace-nowrap">
                                {className}
                            </p>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-[3px] transition-all duration-300 ${isLive ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-400'}`} />
                                <span className={`text-xs font-bold uppercase tracking-wider ${isLive ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {isLive ? 'Live' : 'Offline'}
                                </span>
                            </div>
                            <button
                                onClick={handleSignOut}
                                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                title="Leave Class"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Mobile Layout (Stacked) */}
                    <div className="flex md:hidden flex-col gap-3 w-full py-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                Hi, <span className="text-brand-accent">{studentName}</span>
                            </h2>
                            <div className="flex items-center gap-2">
                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border-[3px] ${isLive ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isLive ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {isLive ? 'Live' : 'Offline'}
                                    </span>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                    title="Leave Class"
                                >
                                    <LogOut className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-brand-light dark:bg-brand-dark p-3 rounded-xl border-[3px] border-gray-200 dark:border-gray-700">
                            <span className="text-xs text-brand-textDarkSecondary dark:text-brand-textSecondary">Tasks Left</span>
                            <span className="text-sm font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">{currentTasks.filter(t => t.status !== 'done').length}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 pt-6 pb-24 md:pb-8">
                {/* Calendar Widget */}
                <div data-calendar className="mb-6">
                    <MiniCalendar
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                    />
                </div>

                {/* Task List Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg">Your Tasks</h3>
                        <div className="text-xs font-medium px-2 py-1 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-md text-brand-textDarkSecondary dark:text-brand-textSecondary border-[3px] border-gray-200 dark:border-gray-700">
                            {/* Calculate completion percentage */}
                            {Math.round((currentTasks.filter(t => t.status === 'done').length / Math.max(currentTasks.length, 1)) * 100)}% Complete
                        </div>
                    </div>

                    {/* Conditional Rendering based on date selection */}
                    {showPreview ? (
                        <DayTaskPreview
                            date={selectedDate}
                            tasks={previewTasks}
                            onImport={handleImportTasks}
                        />
                    ) : isToday ? (
                        <CurrentTaskList
                            tasks={currentTasks}
                            onUpdateStatus={handleUpdateStatus}
                            onUpdateComment={handleUpdateComment}
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
            </main>

            {/* Name Entry Modal */}
            {showNameModal && (
                <StudentNameModal
                    onSubmit={handleNameSubmit}
                    initialName={studentName}
                    onClose={() => setShowNameModal(false)}
                />
            )}

            {/* Mobile Bottom Navigation - Following iOS/Android patterns */}
            <nav className="md:hidden fixed bottom-0 inset-x-0 bg-brand-lightSurface dark:bg-brand-darkSurface border-t-[3px] border-gray-200 dark:border-gray-700 z-sidebar safe-area-pb">
                <div className="flex justify-around items-center h-16 px-4">
                    <button
                        onClick={() => {
                            // Scroll to tasks section (already at top usually)
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="flex flex-col items-center justify-center gap-1 p-2 min-w-[44px] min-h-[44px] rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        aria-label="Tasks"
                    >
                        <ListTodo className="w-5 h-5 text-brand-accent" />
                        <span className="text-[10px] font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">Tasks</span>
                    </button>
                    <button
                        onClick={() => {
                            // Scroll to calendar section
                            const calendarEl = document.querySelector('[data-calendar]');
                            if (calendarEl) {
                                calendarEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }}
                        className="flex flex-col items-center justify-center gap-1 p-2 min-w-[44px] min-h-[44px] rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        aria-label="Schedule"
                    >
                        <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <span className="text-[10px] font-bold text-brand-textDarkSecondary dark:text-brand-textSecondary">Schedule</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default StudentView;
