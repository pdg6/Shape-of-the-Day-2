import React, { useState } from 'react';
import MiniCalendar from './MiniCalendar';
import CurrentTaskList from './CurrentTaskList';
import DayTaskPreview from './DayTaskPreview';
import StudentNameModal from './StudentNameModal';
import { Layout } from 'lucide-react';
import toast from 'react-hot-toast';

const StudentView = ({ studentName, onNameSubmit }) => {
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

    const handleUpdateStatus = (taskId, newStatus) => {
        // Optimistic update
        setCurrentTasks((prev) =>
            prev.map((task) =>
                task.id === taskId ? { ...task, status: newStatus } : task
            )
        );

        // Simulate live update to teacher
        console.log(`[LIVE UPDATE] Task ${taskId} status changed to ${newStatus}`);

        if (newStatus === 'stuck') {
            toast.error("Teacher notified that you're stuck!");
        } else if (newStatus === 'question') {
            toast('Teacher notified that you have a question.', { icon: '🙋' });
        } else if (newStatus === 'done') {
            toast.success("Great job! Task completed.");
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

    return (
        <div className="min-h-screen bg-brand-light dark:bg-brand-dark text-brand-textDarkPrimary dark:text-brand-textPrimary transition-colors duration-300">
            {/* Header */}
            <header className="bg-brand-lightSurface dark:bg-brand-darkSurface border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-accent/10 rounded-xl flex items-center justify-center text-brand-accent">
                            <Layout className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Shape of the Day</h1>
                            <p className="text-xs text-brand-textDarkSecondary dark:text-brand-textSecondary font-medium">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-light dark:bg-brand-dark rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-medium text-brand-textDarkSecondary dark:text-brand-textSecondary">Live</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-[85%] md:w-[70%] mx-auto px-4 py-6 pb-24">
                {/* Greeting */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-2">
                        Good Morning, <span className="text-brand-accent">{studentName}</span>! 👋
                    </h2>
                    <p className="text-brand-textDarkSecondary dark:text-brand-textSecondary">
                        You have <span className="text-brand-textDarkPrimary dark:text-brand-textPrimary font-bold">{currentTasks.filter(t => t.status !== 'done').length} tasks</span> to complete today.
                    </p>
                </div>

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
                />
            )}
        </div>
    );
};

export default StudentView;
