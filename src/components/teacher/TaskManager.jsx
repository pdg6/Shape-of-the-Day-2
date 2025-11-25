import React from 'react';

const TaskManager = () => {
    return (
        <div className="bg-brand-lightSurface dark:bg-brand-darkSurface p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors duration-200">
            <h2 className="text-xl font-bold mb-4 text-brand-textDarkPrimary dark:text-brand-textPrimary">Task Manager</h2>
            <p className="text-gray-600 dark:text-brand-textSecondary">Drag and drop tasks here.</p>
        </div>
    );
};

export default TaskManager;
