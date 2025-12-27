import React from 'react';

/**
 * StudentRoster Component
 * 
 * Placeholder for the student management view.
 * This will likely be used to add/remove students, check attendance, and view individual student details.
 */
const StudentRoster: React.FC = () => {
    return (
        <div className="bg-brand-lightSurface dark:bg-[#1a1d24] p-6 rounded-2xl shadow-layered border border-slate-200 dark:border-white/5 transition-colors duration-200">
            <h2 className="text-xl font-bold mb-4 text-brand-textDarkPrimary dark:text-brand-textPrimary">Student Roster</h2>
            <p className="text-gray-600 dark:text-brand-textSecondary">Manage students and attendance.</p>
        </div>
    );
};

export default StudentRoster;
