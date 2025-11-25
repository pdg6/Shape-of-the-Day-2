import React, { useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

const JoinRoom = ({ onJoin, isLoading = false }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (code.length !== 6 || !/^\d+$/.test(code)) {
            setError('Please enter a valid 6-digit code');
            return;
        }
        setError('');
        onJoin(code);
    };

    const handleChange = (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setCode(value);
        if (error) setError('');
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={code}
                    onChange={handleChange}
                    placeholder="Class Code"
                    maxLength={6}
                    className={`w-full pl-4 pr-14 py-2.5 text-lg text-center tracking-[0.5em] font-mono rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all 
                        bg-brand-lightSurface dark:bg-brand-darkSurface dark:text-brand-textPrimary placeholder:tracking-normal placeholder:font-sans
                        ${error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200 dark:border-red-500/50'
                            : 'border-gray-200 dark:border-gray-600 focus:border-brand-accent focus:ring-blue-200 dark:focus:ring-blue-900'
                        }`}
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={code.length !== 6 || isLoading}
                    className="absolute right-1.5 p-1.5 bg-brand-accent text-white rounded-md hover:bg-brand-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    title="Join Room"
                >
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <ArrowRight className="w-5 h-5" />
                    )}
                </button>
            </div>
            {error && (
                <p className="mt-2 text-sm text-red-500 text-center animate-in fade-in slide-in-from-top-1">
                    {error}
                </p>
            )}
        </form>
    );
};

export default JoinRoom;
