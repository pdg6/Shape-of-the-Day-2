import React from 'react';
import { Download } from 'lucide-react';

const DayTaskPreview = ({ date, tasks, onImport }) => {
    if (tasks.length === 0) {
        return (
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center mb-6">
                <p className="text-gray-500">No tasks scheduled for this day.</p>
            </div>
        );
    }

    return (
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-blue-900">Tasks for {new Date(date).toLocaleDateString()}</h3>
                <button
                    onClick={onImport}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Download className="w-4 h-4" />
                    Import to My Day
                </button>
            </div>

            <div className="space-y-2">
                {tasks.map((task) => (
                    <div key={task.id} className="bg-white p-3 rounded-lg border border-blue-100 text-sm text-gray-700">
                        <span className="font-medium">{task.title}</span>
                        <span className="mx-2 text-gray-300">|</span>
                        <span className="text-gray-500">{task.description}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DayTaskPreview;
