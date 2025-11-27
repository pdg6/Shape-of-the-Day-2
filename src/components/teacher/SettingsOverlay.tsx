import React from 'react';
import { X, Moon, Sun } from 'lucide-react';
import { useClassStore } from '../../store/classStore';

interface SettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsOverlay: React.FC<SettingsOverlayProps> = ({ isOpen, onClose }) => {
    const { darkMode, toggleDarkMode } = useClassStore();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-md bg-brand-lightSurface dark:bg-brand-darkSurface rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Appearance Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Appearance
                        </h3>

                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-orange-500/10 text-orange-500'}`}>
                                    {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                                </div>
                                <div>
                                    <p className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                                        Theme
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {darkMode ? 'Dark Mode' : 'Light Mode'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={toggleDarkMode}
                                className={`
                                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 dark:focus:ring-offset-gray-900
                                    ${darkMode ? 'bg-brand-accent' : 'bg-gray-200'}
                                `}
                            >
                                <span
                                    className={`
                                        inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out
                                        ${darkMode ? 'translate-x-6' : 'translate-x-1'}
                                    `}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Future settings placeholder */}
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-sm text-center text-gray-400 dark:text-gray-500 italic">
                            More settings coming soon...
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsOverlay;
