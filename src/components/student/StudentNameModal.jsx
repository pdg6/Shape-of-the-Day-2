import React, { useState } from 'react';
import { User, ArrowRight } from 'lucide-react';

const StudentNameModal = ({ isOpen, onSubmit }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleChange = (e) => {
        const value = e.target.value;
        // Only allow letters and spaces, max 12 chars
        if (value.length <= 12 && /^[a-zA-Z\s]*$/.test(value)) {
            setName(value);
            setError('');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Name is required');
            return;
        }
        onSubmit(name);
    };

    return (
        <div className="fixed inset-0 bg-brand-dark/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
            <div className="bg-[#141211] rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-300 border border-gray-800">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-brand-accent/10 rounded-full flex items-center justify-center text-brand-accent mx-auto mb-6 ring-1 ring-brand-accent/20 shadow-[0_0_15px_rgba(16,91,166,0.1)]">
                        <User className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-brand-textPrimary tracking-tight">What's your name?</h2>
                    <p className="text-brand-textSecondary mt-3 text-lg">
                        Enter your name so your teacher knows who you are.
                    </p>
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
                                bg-brand-darkSurface text-brand-textPrimary placeholder:text-brand-textSecondary/50
                                border-2 outline-none
                                ${error
                                    ? 'border-red-900/50 focus:border-red-500/50 focus:shadow-[0_0_20px_rgba(220,38,38,0.1)]'
                                    : 'border-gray-800 focus:border-brand-accent focus:shadow-[0_0_20px_rgba(16,91,166,0.15)] group-hover:border-brand-accent/50'}
                            `}
                            autoFocus
                        />
                        <div className="flex justify-between mt-3 px-2">
                            <span className="text-sm text-red-400 min-h-[1.25rem] font-medium">{error}</span>
                            <span className={`text-sm font-medium transition-colors duration-300 ${name.length === 12 ? 'text-amber-500' : 'text-brand-textSecondary'}`}>
                                {name.length}/12
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={!name.trim()}
                        className="w-full bg-brand-accent text-white py-4 rounded-xl font-bold text-xl 
                        hover:bg-brand-accent/90 hover:scale-[1.02] active:scale-[0.98]
                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                        transition-all duration-300 flex items-center justify-center gap-3 
                        shadow-[0_4px_20px_rgba(16,91,166,0.25)] hover:shadow-[0_8px_25px_rgba(16,91,166,0.35)]"
                    >
                        Start Learning
                        <ArrowRight className="w-6 h-6" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default StudentNameModal;
