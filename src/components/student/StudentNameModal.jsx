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
                className="bg-brand-darkSurface dark:bg-brand-darkSurface rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-300 border border-gray-200 dark:border-gray-700 relative"
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
                                w-full px-4 py-2.5 text-lg text-center tracking-[0.5em] font-mono rounded-lg border-2 focus:outline-none transition-all hover:border-emerald-400 
                                bg-brand-lightSurface dark:bg-brand-darkSurface dark:text-brand-textPrimary placeholder:tracking-normal placeholder:font-sans
                                ${error
                                    ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-500/50'
                                    : 'border-gray-200 dark:border-gray-600 focus:border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-900/50'}
                            `}
                            autoFocus
                            enterKeyHint="go"
                        />
                        <div className="flex justify-between mt-3 px-2">
                            <span className="text-sm text-red-500 min-h-[1.25rem] font-medium">{error}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full pl-4 pr-4 py-2.5 text-lg rounded-lg border-2 focus:outline-none transition-all hover:border-emerald-400 
                        bg-brand-lightSurface dark:bg-brand-darkSurface text-brand-textDarkPrimary dark:text-brand-textPrimary 
                        border-gray-200 dark:border-gray-600 focus:border-emerald-500 focus:ring-emerald-200 dark:focus:ring-emerald-900/50
                        relative text-center group"
                    >
                        Join Class
                        <ArrowRight className="w-6 h-6 absolute right-4 top-1/2 -translate-y-1/2 transition-all group-hover:translate-x-1 group-hover:text-emerald-500" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StudentNameModal;
