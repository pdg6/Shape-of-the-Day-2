import React from 'react';

/**
 * TaskManager Component
 * 
 * Placeholder for the Task Manager view where teachers can create, edit, and organize tasks.
 * Currently displays a simple placeholder message.
 */
const TaskManager: React.FC = () => {
    return (
        <div className="bg-brand-lightSurface dark:bg-brand-darkSurface p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors duration-200">
            <h2 className="text-xl font-bold mb-4 text-brand-textDarkPrimary dark:text-brand-textPrimary">Task Manager</h2>
            <p className="text-gray-600 dark:text-brand-textSecondary">Drag and drop tasks here.</p>
        </div>
    );
};

export default TaskManager;
