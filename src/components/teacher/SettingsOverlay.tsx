import React from 'react';
import { Moon, Sun, LogOut, QrCode, User, BookOpen, Check, Type, Activity, BarChart2, Layers } from 'lucide-react';
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
                <span className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary">
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
                    <span className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary">
                        {className}
                    </span>
                </div>
            )}

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
                <div className="grid grid-cols-5 gap-1.5">
                    {[
                        { color: '#050505', label: 'Void' },
                        { color: '#0a0a0a', label: 'Charcoal' },
                        { color: '#0f1115', label: 'Cyber' },
                        { color: '#64748b', label: 'Fog' },
                        { color: '#f1f5f9', label: 'Snow' }
                    ].map((c) => (
                        <button
                            key={c.color}
                            onClick={() => setBackgroundSettings({ bgColor: c.color })}
                            className={`flex flex-col items-center gap-1.5 p-1 rounded-lg border-2 transition-all duration-200
                                ${backgroundSettings.bgColor === c.color ? 'border-brand-accent shadow-sm bg-brand-accent/5' : 'border-white/5 bg-transparent hover:border-white/10'}`}
                            title={c.label}
                        >
                            <div
                                className={`w-full h-8 rounded-md flex items-center justify-center shadow-inner border border-white/5
                                    ${c.color === '#f1f5f9' || c.color === '#64748b' ? 'text-gray-800' : 'text-brand-accent'}`}
                                style={{ backgroundColor: c.color }}
                            >
                                {backgroundSettings.bgColor === c.color && <Check size={14} />}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-tighter text-center leading-none ${backgroundSettings.bgColor === c.color ? 'text-white' : 'text-brand-textDarkSecondary hover:text-brand-textDarkPrimary'}`}>
                                {c.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tile Appearance (Replaces Theme Toggle) */}
            <div className="bg-brand-light dark:bg-brand-dark rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-500">
                        <BookOpen size={20} />
                    </div>
                    <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        Tile Theme
                    </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                    {[
                        { id: 'onyx', label: 'Onyx', color: '#1a1d24' },
                        { id: 'slate', label: 'Slate', color: '#1e293b' },
                        { id: 'graphite', label: 'Graphite', color: '#334155' },
                        { id: 'cloud', label: 'Cloud', color: '#e2e8f0' },
                        { id: 'glacier', label: 'Glacier', color: '#ffffff' }
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setBackgroundSettings({ tileTheme: t.id })}
                            className={`flex flex-col items-center gap-1.5 p-1 rounded-lg border-2 transition-all duration-200
                                ${backgroundSettings.tileTheme === t.id ? 'border-brand-accent shadow-sm bg-brand-accent/5' : 'border-white/5 bg-transparent hover:border-white/10'}`}
                            title={t.label}
                        >
                            <div
                                className={`w-full h-8 rounded-md flex items-center justify-center shadow-inner border border-white/5`}
                                style={{ backgroundColor: t.color }}
                            >
                                {backgroundSettings.tileTheme === t.id && (
                                    <Check size={14} className={t.id === 'cloud' || t.id === 'glacier' ? 'text-gray-800' : 'text-white'} />
                                )}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-tighter text-center leading-none ${backgroundSettings.tileTheme === t.id ? 'text-white' : 'text-brand-textDarkSecondary hover:text-brand-textDarkPrimary'}`}>
                                {t.label}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Elevation Level */}
            <div className="bg-brand-light dark:bg-brand-dark rounded-xl p-3 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                        <Layers size={20} />
                    </div>
                    <span className="font-medium text-brand-textDarkPrimary dark:text-brand-textPrimary">
                        Elevation
                    </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                    {[
                        { id: 'whisper', label: 'Whisper', lift: '0px' },
                        { id: 'gentle', label: 'Gentle', lift: '-1px' },
                        { id: 'float', label: 'Float', lift: '-2px' },
                        { id: 'lift', label: 'Lift', lift: '-3px' },
                        { id: 'dramatic', label: 'Dramatic', lift: '-4px' }
                    ].map((e) => (
                        <button
                            key={e.id}
                            onClick={() => setBackgroundSettings({ elevationLevel: e.id as any })}
                            className={`flex flex-col items-center gap-1.5 p-1 rounded-lg border-2 transition-all duration-200
                                ${backgroundSettings.elevationLevel === e.id ? 'border-brand-accent shadow-sm bg-brand-accent/5' : 'border-white/5 bg-transparent hover:border-white/10'}`}
                            title={e.label}
                        >
                            <div
                                className={`w-full h-8 rounded-md flex items-center justify-center border border-white/10 transition-all duration-200`}
                                style={{
                                    backgroundColor: 'var(--color-bg-tile, #1a1d24)',
                                    transform: `translateY(${e.lift})`,
                                    boxShadow: backgroundSettings.elevationLevel === e.id
                                        ? '0 4px 12px rgba(0,0,0,0.3)'
                                        : '0 2px 6px rgba(0,0,0,0.15)'
                                }}
                            >
                                {backgroundSettings.elevationLevel === e.id && <Check size={14} className="text-white" />}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-tighter text-center leading-none ${backgroundSettings.elevationLevel === e.id ? 'text-white' : 'text-brand-textDarkSecondary hover:text-brand-textDarkPrimary'}`}>
                                {e.label}
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
                            <label className="text-[10px] font-bold uppercase tracking-wider text-brand-textDarkSecondary dark:text-brand-textSecondary px-1">Style</label>
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
                                                : 'bg-transparent border-white/5 text-brand-textSecondary hover:border-white/20 hover:text-brand-textPrimary'}`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Opacity Slider */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-brand-textDarkSecondary dark:text-brand-textSecondary">Opacity</label>
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
                            <label className="text-[10px] font-bold uppercase tracking-wider text-brand-textDarkSecondary dark:text-brand-textSecondary px-1">Appearance</label>
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
                                        <span className={`text-[9px] font-black uppercase tracking-tighter text-center leading-none ${backgroundSettings.particleColor === c.color ? 'text-brand-textPrimary' : 'text-brand-textSecondary'}`}>
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

                {/* Primary (Highlight) */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary px-1">Primary Text (Active/Headers)</label>
                    <div className="grid grid-cols-5 gap-1.5">
                        {[
                            { id: 'white', label: 'White', color: '#F8FAFC' },
                            { id: 'mist', label: 'Mist', color: '#CBD5E1' },
                            { id: 'silver', label: 'Silver', color: '#94a3b8' },
                            { id: 'iron', label: 'Iron', color: '#475569' },
                            { id: 'ink', label: 'Ink', color: '#1e293b' }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setBackgroundSettings({ primaryTheme: t.id })}
                                className={`relative p-1 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1
                                    ${backgroundSettings.primaryTheme === t.id ? 'border-brand-accent shadow-sm bg-brand-accent/5' : 'border-white/5 bg-transparent hover:border-white/10'}`}
                            >
                                <div className="relative w-full h-8 rounded-md shadow-inner mb-1 flex items-center justify-center font-black text-lg"
                                    style={{ backgroundColor: t.id === 'white' || t.id === 'mist' ? '#1a1d24' : 'transparent', color: t.color }}>
                                    Aa
                                    {backgroundSettings.primaryTheme === t.id && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-md">
                                            <Check size={12} className={t.id === 'white' || t.id === 'mist' ? 'text-white' : 'text-brand-accent'} />
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-tighter text-center leading-none ${backgroundSettings.primaryTheme === t.id ? 'text-white' : 'text-brand-textSecondary'}`}>
                                    {t.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Secondary (Base) */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-brand-textSecondary px-1">Secondary Text (Inactive/Context)</label>
                    <div className="grid grid-cols-5 gap-1.5">
                        {[
                            { id: 'slate', label: 'Slate', color: '#94A3B8' },
                            { id: 'ash', label: 'Ash', color: '#64748B' },
                            { id: 'pewter', label: 'Pewter', color: '#475569' },
                            { id: 'lead', label: 'Lead', color: '#334155' },
                            { id: 'graphite', label: 'Graphite', color: '#475569' }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setBackgroundSettings({ secondaryTheme: t.id })}
                                className={`relative p-1 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1
                                    ${backgroundSettings.secondaryTheme === t.id ? 'border-brand-accent shadow-sm bg-brand-accent/5' : 'border-white/5 bg-transparent hover:border-white/10'}`}
                            >
                                <div className="relative w-full h-8 rounded-md shadow-inner mb-1 flex items-center justify-center font-black text-lg"
                                    style={{ backgroundColor: t.id === 'slate' || t.id === 'ash' ? '#1a1d24' : 'transparent', color: t.color }}>
                                    Aa
                                    {backgroundSettings.secondaryTheme === t.id && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-md">
                                            <Check size={12} className={t.id === 'slate' || t.id === 'ash' ? 'text-white' : 'text-brand-accent'} />
                                        </div>
                                    )}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-tighter text-center leading-none ${backgroundSettings.secondaryTheme === t.id ? 'text-white' : 'text-brand-textSecondary'}`}>
                                    {t.label}
                                </span>
                            </button>
                        ))}
                    </div>
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
                    <span className="text-sm text-brand-textDarkSecondary dark:text-brand-textSecondary">
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
                    <span className="text-sm text-brand-textSecondary">
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
                    <span className="text-sm text-brand-textSecondary">
                        Leave dashboard
                    </span>
                </button>
            )}
        </div>
    );
};

export default SettingsOverlay;
