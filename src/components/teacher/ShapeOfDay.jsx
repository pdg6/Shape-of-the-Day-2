import React from 'react';

const ShapeOfDay = () => {
    return (
        <div className="bg-brand-lightSurface dark:bg-brand-darkSurface p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors duration-200">
            <h2 className="text-xl font-bold mb-4 text-brand-textDarkPrimary dark:text-brand-textPrimary">Shape of the Day</h2>
            <p className="text-gray-600 dark:text-brand-textSecondary">Timeline view of the day.</p>
        </div>
    );
};

export default ShapeOfDay;
