import React, { useState } from 'react';
import MiniCalendar from './MiniCalendar';
import CurrentTaskList from './CurrentTaskList';
import DayTaskPreview from './DayTaskPreview';
import StudentNameModal from './StudentNameModal';
import toast from 'react-hot-toast';

const StudentView = ({ studentName, onEditName, className = "Mrs. Smith's Class", isLive = true }) => {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [showNameModal, setShowNameModal] = useState(!studentName);

    // "My Day" tasks
    const [currentTasks, setCurrentTasks] = useState([
        { id: '1', title: 'Morning Check-in', description: 'Say hello to the class!', status: 'todo', dueDate: '9:00 AM' },
        { id: '2', title: 'Math Worksheet', description: 'Complete pages 10-12', status: 'in_progress', dueDate: '10:30 AM' },
    ]);

    // Mock database of tasks by date
    const [availableTasks] = useState({
        [today]: [], // Already imported
        // Tomorrow
        [new Date(Date.now() + 86400000).toISOString().split('T')[0]]: [
            { id: '3', title: 'Reading Time', description: 'Read for 20 minutes', status: 'todo', dueDate: '1:00 PM' },
            { id: '4', title: 'Art Project', description: 'Draw your favorite animal', status: 'todo', dueDate: '2:30 PM' },
        ]
    });

    const syncToTeacher = (taskId, status, comment = '') => {
        const task = currentTasks.find(t => t.id === taskId);
        const completedCount = currentTasks.filter(t => t.status === 'done').length;

        const studentState = {
            studentName,
            currentTask: task ? task.title : taskId,
            status,
            progress: completedCount,
            studentComment: comment
        };

        // Simulate sync to backend
        console.log('[SYNC] Student State:', studentState);
    };

    const handleUpdateStatus = (taskId, newStatus) => {
        // Optimistic update
        setCurrentTasks((prev) =>
            prev.map((task) =>
                task.id === taskId ? { ...task, status: newStatus } : task
            )
        );

        syncToTeacher(taskId, newStatus);

        if (newStatus === 'stuck') {
            toast.error("Teacher notified that you're stuck!");
        } else if (newStatus === 'question') {
            toast('Teacher notified that you have a question.', { icon: '🙋' });
        } else if (newStatus === 'done') {
            toast.success("Great job! Task completed.");
        }
    };

    const handleUpdateComment = (taskId, comment) => {
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

    const handleImportTasks = () => {
        const tasksToImport = availableTasks[selectedDate] || [];
        if (tasksToImport.length === 0) return;

        setCurrentTasks(prev => [...prev, ...tasksToImport]);
        toast.success(`Imported ${tasksToImport.length} tasks to your day`);
    };

    const handleNameSubmit = (name) => {
        onNameSubmit(name);
        setShowNameModal(false);
    };

    // Determine what to show
    const isToday = selectedDate === today;
    const previewTasks = availableTasks[selectedDate] || [];
    const showPreview = !isToday && previewTasks.length > 0;

    //Greeting Header
    return (
        <div className="min-h-screen bg-brand-light dark:bg-brand-dark text-brand-textDarkPrimary dark:text-brand-textPrimary transition-colors duration-300">
            {/* Header */}
            <header className="bg-brand-lightSurface dark:bg-brand-darkSurface border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 py-3 md:py-0 md:h-16 flex items-center">
                    {/* Desktop: Horizontal layout */}
                    <div className="hidden md:flex items-center justify-between w-full">
                        {/* Left: Greeting and Name */}
                        {/* Left: Greeting and Name */}
                        <button
                            onClick={onEditName}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-transparent hover:border-brand-accent/30 hover:bg-brand-accent/5 active:scale-95 active:border-brand-accent active:ring-2 active:ring-brand-accent/20 transition-all duration-300 cursor-pointer outline-none group"
                        >
                            <h2 className="text-lg font-bold whitespace-nowrap group-hover:text-brand-accent transition-colors">
                                Good Morning, <span className="text-brand-accent group-hover:underline decoration-wavy underline-offset-4">{studentName}</span>!
                            </h2>
                        </button>

                        {/* Center: Task Progress */}
                        <div className="flex-1 flex justify-center px-4">
                            <p className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary whitespace-nowrap">
                                You have <span className="text-brand-textDarkPrimary dark:text-brand-textPrimary font-bold">{currentTasks.filter(t => t.status !== 'done').length} tasks</span> to complete today
                            </p>
                        </div>

                        {/* Right: Class Name and Status */}
                        <div className="flex items-center gap-3">
                            <p className="text-sm font-medium text-brand-textDarkSecondary dark:text-brand-textSecondary whitespace-nowrap">
                                {className}
                            </p>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-light dark:bg-brand-dark rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                <span className="text-xs font-medium text-brand-textDarkSecondary dark:text-brand-textSecondary">
                                    {isLive ? 'Live' : 'Idle'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile: Stacked layout */}
                    <div className="flex md:hidden flex-col gap-2 w-full">
                        {/* Row 1: Greeting and Name */}
                        <div className="flex items-center justify-center">
                            <h2 className="text-base font-bold text-center">
                                Good Morning, <span className="text-brand-accent">{studentName}</span>!
                            </h2>
                        </div>

                        {/* Row 2: Task Progress */}
                        <div className="flex justify-center">
                            <p className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary text-center">
                                You have <span className="text-brand-textDarkPrimary dark:text-brand-textPrimary font-bold">{currentTasks.filter(t => t.status !== 'done').length} tasks</span> to complete today
                            </p>
                        </div>

                        {/* Row 3: Class Name and Status */}
                        <div className="flex items-center justify-center gap-3">
                            <p className="text-sm font-medium text-brand-textDarkSecondary dark:text-brand-textSecondary">
                                {className}
                            </p>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-light dark:bg-brand-dark rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                <span className="text-xs font-medium text-brand-textDarkSecondary dark:text-brand-textSecondary">
                                    {isLive ? 'Live' : 'Idle'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
                {/* Calendar Strip */}
                <MiniCalendar
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                />

                {/* Task List */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg">Your Tasks</h3>
                        <div className="text-xs font-medium px-2 py-1 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-md text-brand-textDarkSecondary dark:text-brand-textSecondary border border-gray-200 dark:border-gray-700">
                            {Math.round((currentTasks.filter(t => t.status === 'done').length / Math.max(currentTasks.length, 1)) * 100)}% Complete
                        </div>
                    </div>

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
                        <div className="text-center py-12 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">
                                {previewTasks.length > 0
                                    ? "Import these tasks to start working on them."
                                    : "No tasks scheduled for this day."}
                            </p>
                        </div>
                    )}
                </div>
            </main>

            {/* Name Modal */}
            {showNameModal && (
                <StudentNameModal
                    onSubmit={handleNameSubmit}
                    initialName={studentName}
                    onClose={() => setShowNameModal(false)}
                />
            )}
        </div>
    );
};

export default StudentView;
