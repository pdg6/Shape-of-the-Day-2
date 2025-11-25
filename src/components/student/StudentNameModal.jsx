import React, { useState } from 'react';
import { ArrowRight, GraduationCap, X } from 'lucide-react';

const StudentNameModal = ({ onSubmit, initialName = '', onClose }) => {
    const [name, setName] = useState(initialName);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }
        onSubmit(name);
    };

    const handleChange = (e) => {
        const value = e.target.value;
        if (value.length <= 12) {
            setName(value);
            if (error) setError('');
        }
    };

    return (
        <div
            className="fixed inset-0 bg-[#141211] flex items-center justify-center z-[100] p-4 transition-all duration-300 dark"
            onClick={onClose}
        >
            <div
                className="bg-brand-lightSurface dark:bg-brand-darkSurface rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-300 border border-gray-200 dark:border-gray-700 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}

                <div className="text-center mb-8">
                    <GraduationCap className="w-16 h-16 text-emerald-600 dark:text-emerald-400 mx-auto mb-6" />
                    <h2 className="text-3xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary tracking-tight">What is your name?</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative group">
                        <input
                            type="text"
                            value={name}
                            onChange={handleChange}
                            placeholder="Your Name"
                            className={`
                                w-full px-6 py-4 text-xl text-center rounded-xl transition-all duration-300
                                bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkPrimary dark:text-brand-textPrimary placeholder:text-brand-textDarkSecondary/50 dark:placeholder:text-brand-textSecondary/50
                                border-2 outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-brand-darkSurface shadow-[0_4px_10px_rgba(0,0,0,0.05)]
                                ${error
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-500/50'
                                    : 'border-gray-200 dark:border-gray-600 focus:border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-900/50'}
                            `}
                            autoFocus
                        />
                        <div className="flex justify-between mt-3 px-2">
                            <span className="text-sm text-red-500 min-h-[1.25rem] font-medium">{error}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full border-2 border-emerald-600 text-emerald-500 py-4 rounded-xl font-bold text-xl 
                        hover:bg-emerald-600/10 hover:border-emerald-500 hover:text-emerald-400 hover:scale-[1.02] active:scale-[0.98]
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                        transition-all duration-300 flex items-center justify-center gap-3 
                        shadow-[0_4px_10px_rgba(16,185,129,0.1)] hover:shadow-[0_8px_15px_rgba(16,185,129,0.2)]"
                    >
                        Enter Classroom
                        <ArrowRight className="w-6 h-6" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StudentNameModal;
