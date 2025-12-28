import React from 'react';
import { Moon, Sun, LogOut, QrCode, BarChart2, User, BookOpen, School, ListTodo, Presentation, Activity, Check, Type } from 'lucide-react';
import { useClassStore } from '../../store/classStore';

interface SettingsOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout?: () => void;
    onShowJoinCode?: () => void;
    onShowData?: () => void;
    teacherName?: string;
    className?: string;
    activeTab?: 'tasks' | 'shape' | 'live' | 'reports' | 'classrooms';
    onTabChange?: (tab: 'tasks' | 'shape' | 'live' | 'reports' | 'classrooms') => void;
}

const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
    isOpen,
    onClose,
    onLogout,
    onShowJoinCode,
    onShowData,
    teacherName = 'Teacher',
    className = '',
    activeTab,
    onTabChange
}) => {
    const { darkMode, toggleDarkMode, backgroundSettings, setBackgroundSettings } = useClassStore();


    if (!isOpen) return null;

    return (
        <div className="space-y-3">
            {/* Navigation Section - Only show if navigation props provided */}
            {activeTab && onTabChange && (
                <>
                    <div className="grid grid-cols-5 gap-1.5 mb-4">
                        <button
                            onClick={() => {
                                onTabChange('classrooms');
                                onClose();
                            }}
                            className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'classrooms'
                                ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                                : 'border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400 text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            <School size={20} />
                            <span className="text-[10px] font-bold">Classes</span>
                        </button>
                        <button
                            onClick={() => {
                                onTabChange('tasks');
                                onClose();
                            }}
                            className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'tasks'
                                ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                                : 'border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400 text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            <ListTodo size={20} />
                            <span className="text-[10px] font-bold">Tasks</span>
                        </button>
                        <button
                            onClick={() => {
                                onTabChange('shape');
                                onClose();
                            }}
                            className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'shape'
                                ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                                : 'border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400 text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            <Presentation size={20} />
                            <span className="text-[10px] font-bold">Shape</span>
                        </button>
                        <button
                            onClick={() => {
                                onTabChange('live');
                                onClose();
                            }}
                            className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'live'
                                ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                                : 'border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400 text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            <Activity size={20} />
                            <span className="text-[10px] font-bold">Live</span>
                        </button>
                        <button
                            onClick={() => {
                                onTabChange('reports');
                                onClose();
                            }}
                            className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'reports'
                                ? 'border-brand-accent text-brand-accent bg-brand-accent/5'
                                : 'border-gray-400 dark:border-gray-600 hover:border-gray-600 dark:hover:border-gray-400 text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            <BarChart2 size={20} />
                            <span className="text-[10px] font-bold">Reports</span>
                        </button>
                    </div>
                    {/* Divider */}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                </>
            )}

            {/* Teacher Name */}
            <div className="bg-brand-light dark:bg-brand-dark rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent">
                        <User size={20} />
                    </div>
                    <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        Teacher
                    </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {teacherName}
                </span>
            </div>

            {/* Class Name */}
            {className && (
                <div className="bg-brand-light dark:bg-brand-dark rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                            <BookOpen size={20} />
                        </div>
                        <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            Class
                        </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {className}
                    </span>
                </div>
            )}

            {/* Theme Toggle */}
            <div className="bg-brand-light dark:bg-brand-dark rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-500'}`}>
                        {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                    </div>
                    <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        Theme
                    </span>
                </div>
                <button
                    onClick={toggleDarkMode}
                    className={`
                        relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 dark:focus:ring-offset-gray-900
                        ${darkMode ? 'bg-brand-accent' : 'bg-gray-300 border border-gray-400'}
                    `}
                >
                    <span
                        className={`
                            inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out
                            ${darkMode ? 'translate-x-6' : 'translate-x-1'}
                        `}
                    />
                </button>
            </div>

            {/* Background Color Customization */}
            <div className="bg-brand-light dark:bg-brand-dark rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                        <Moon size={20} />
                    </div>
                    <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        Background Color
                    </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { color: '#050505', label: 'Onyx' },
                        { color: '#0a0a0a', label: 'Charcoal' },
                        { color: '#0f1115', label: 'Cyber' },
                        { color: '#cbd5e1', label: 'Slate' }
                    ].map((c) => (
                        <button
                            key={c.color}
                            onClick={() => setBackgroundSettings({ bgColor: c.color })}
                            className={`flex flex-col items-center gap-1.5 p-1 rounded-lg border-2 transition-all duration-200
                                ${backgroundSettings.bgColor === c.color ? 'border-brand-accent shadow-sm bg-brand-accent/5' : 'border-white/5 bg-transparent hover:border-white/10'}`}
                            title={c.label}
                        >
                            <div
                                className={`w-full h-8 rounded-md flex items-center justify-center shadow-inner
                                    ${c.color === '#cbd5e1' ? 'text-gray-800' : 'text-brand-accent'}`}
                                style={{ backgroundColor: c.color }}
                            >
                                {backgroundSettings.bgColor === c.color && <Check size={14} />}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-tighter text-center leading-none ${backgroundSettings.bgColor === c.color ? 'text-white' : 'text-gray-500 hover:text-gray-400'}`}>
                                {c.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Particle Effects Customization */}
            <div className="bg-brand-light dark:bg-brand-dark rounded-xl p-3 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-500/10 text-slate-500 dark:text-slate-400">
                            <Activity size={20} />
                        </div>
                        <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            Particles
                        </span>
                    </div>
                    <button
                        onClick={() => setBackgroundSettings({ particlesEnabled: !backgroundSettings.particlesEnabled })}
                        className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 dark:focus:ring-offset-gray-900
                            ${backgroundSettings.particlesEnabled ? 'bg-brand-accent' : 'bg-gray-300 border border-gray-400'}
                        `}
                    >
                        <span
                            className={`
                                inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out
                                ${backgroundSettings.particlesEnabled ? 'translate-x-6' : 'translate-x-1'}
                            `}
                        />
                    </button>
                </div>

                {backgroundSettings.particlesEnabled && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* Mode Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">Style</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'gravity', label: 'Gravity' },
                                    { id: 'grid', label: 'Grid' },
                                    { id: 'magnetic', label: 'Magnetic' },
                                    { id: 'orbit', label: 'Orbit' },
                                    { id: 'swarm_small', label: 'Swarm' },
                                    { id: 'swarm_large', label: 'Big Swarm' }
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={() => setBackgroundSettings({ particleEffect: m.id as any })}
                                        className={`px-1 py-2 rounded-lg text-[10px] font-bold transition-all duration-200 border
                                            ${backgroundSettings.particleEffect === m.id
                                                ? 'bg-brand-accent/10 border-brand-accent text-brand-accent shadow-sm'
                                                : 'bg-transparent border-white/5 text-gray-500 dark:text-gray-400 hover:border-white/20 hover:text-gray-300'}`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Opacity Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Opacity</label>
                                <span className="text-[10px] font-bold text-brand-accent">{Math.round(backgroundSettings.particleOpacity * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0.05"
                                max="1.0"
                                step="0.05"
                                value={backgroundSettings.particleOpacity}
                                onChange={(e) => setBackgroundSettings({ particleOpacity: parseFloat(e.target.value) })}
                                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-accent hover:bg-white/10 transition-colors"
                            />
                        </div>

                        {/* Color Presets */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 px-1">Appearance</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { color: '#262626', label: 'Onyx' },
                                    { color: '#3b82f6', label: 'Accent' },
                                    { color: '#cbd5e1', label: 'Slate' },
                                    { color: 'multi', label: 'Vibrant' }
                                ].map((c) => (
                                    <button
                                        key={c.color}
                                        onClick={() => setBackgroundSettings({ particleColor: c.color })}
                                        className={`p-2 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1
                                            ${backgroundSettings.particleColor === c.color ? 'border-brand-accent shadow-sm bg-brand-accent/5' : 'border-white/5 bg-transparent hover:border-white/10'}`}
                                    >
                                        <div className="w-full h-8 rounded-md shadow-inner mb-1 overflow-hidden"
                                            style={{
                                                background: c.color === 'multi'
                                                    ? 'linear-gradient(45deg, #ef4444, #10b981, #3b82f6)'
                                                    : c.color === '#cbd5e1' ? '#cbd5e1' : c.color
                                            }}>
                                            {backgroundSettings.particleColor === c.color && (
                                                <div className="w-full h-full flex items-center justify-center bg-black/10">
                                                    <Check size={14} className={c.color === '#cbd5e1' ? 'text-gray-800' : 'text-white'} />
                                                </div>
                                            )}
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-tighter text-center leading-none ${backgroundSettings.particleColor === c.color ? 'text-white' : 'text-gray-500'}`}>
                                            {c.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>

            {/* Typography Customization */}
            <div className="bg-brand-light dark:bg-brand-dark rounded-xl p-3 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                        <Type size={20} />
                    </div>
                    <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        Typography
                    </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    {[
                        { color: '#262626', label: 'Onyx' },
                        { color: '#3b82f6', label: 'Accent' },
                        { color: '#94a3b8', label: 'Muted' },
                        { color: '#F2EFEA', label: 'Default' }
                    ].map((t) => (
                        <button
                            key={t.color}
                            onClick={() => setBackgroundSettings({ textColor: t.color })}
                            className={`relative p-2 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1
                                ${backgroundSettings.textColor === t.color ? 'border-brand-accent shadow-sm bg-brand-accent/5' : 'border-white/5 bg-transparent hover:border-white/10'}`}
                        >
                            <div className="relative w-full h-8 rounded-md shadow-inner mb-1 flex items-center justify-center font-black text-lg"
                                style={{ backgroundColor: t.color === '#F2EFEA' ? '#334155' : 'transparent', color: t.color }}>
                                Aa
                                {backgroundSettings.textColor === t.color && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-md">
                                        <Check size={12} className="text-white drop-shadow-md" />
                                    </div>
                                )}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-tighter text-center leading-none ${backgroundSettings.textColor === t.color ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                {t.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Data & Analytics */}
            {onShowData && (
                <button
                    onClick={() => {
                        onShowData();
                        onClose();
                    }}
                    className="w-full bg-brand-light dark:bg-brand-dark rounded-xl p-3 flex items-center justify-between border-2 border-transparent transition-all duration-200 hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent">
                            <BarChart2 size={20} />
                        </div>
                        <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            Data & Analytics
                        </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        View insights
                    </span>
                </button>
            )}

            {/* Join Code */}
            {onShowJoinCode && (
                <button
                    onClick={() => {
                        onShowJoinCode();
                        onClose();
                    }}
                    className="w-full bg-brand-light dark:bg-brand-dark rounded-xl p-3 flex items-center justify-between border-2 border-transparent transition-all duration-200 hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                            <QrCode size={20} />
                        </div>
                        <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            Join Code
                        </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Show code
                    </span>
                </button>
            )}

            {/* Sign Out */}
            {onLogout && (
                <button
                    onClick={() => {
                        onLogout();
                        onClose();
                    }}
                    className="w-full bg-brand-light dark:bg-brand-dark rounded-xl p-3 flex items-center justify-between border-2 border-transparent transition-all duration-200 hover:border-gray-600 dark:hover:border-gray-400 focus:outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
                            <LogOut size={20} />
                        </div>
                        <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            Sign Out
                        </span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        Leave dashboard
                    </span>
                </button>
            )}
        </div>
    );
};

export default SettingsOverlay;
