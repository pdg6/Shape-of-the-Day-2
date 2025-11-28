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
        <div className="space-y-6">
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

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm text-center text-gray-400 dark:text-gray-500 italic">
                    More settings coming soon...
                </p>
            </div>
        </div>
    );
};

export default SettingsOverlay;
