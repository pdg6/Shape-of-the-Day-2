import React from 'react';
import { Moon, Sun, LogOut, User, BookOpen, Calendar, CheckCircle, ListTodo, FolderOpen, CalendarDays, Settings, Palette, Layers, Box, Zap, Trash2, Edit3, Monitor, Sparkles } from 'lucide-react';
import { useClassStore } from '../../store/appSettings';
import { Modal } from '../shared/Modal';

interface StudentMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    studentName: string;
    className: string;
    tasksCompleted: number;
    totalTasks: number;
    onSignOut: () => void;
    onEditName: () => void;
    activeTab: 'tasks' | 'projects' | 'schedule';
    onTabChange: (tab: 'tasks' | 'projects' | 'schedule') => void;
}

/**
 * StudentMenuModal - Mobile menu modal for student settings and info
 *
 * Displays in logical order:
 * 1. Student Name (personalization)
 * 2. Class Name (context)
 * 3. Dark/Light Mode Toggle (preference)
 * 4. Date (temporal context)
 * 5. Tasks Progress (status)
 * 6. Sign Out Button (exit action - at bottom)
 */
const StudentMenuModal: React.FC<StudentMenuModalProps> = ({
    isOpen,
    onClose,
    studentName,
    className,
    tasksCompleted,
    totalTasks,
    onSignOut,
    onEditName,
    activeTab,
    onTabChange
}) => {
    const { backgroundSettings, setBackgroundSettings, resetSettings } = useClassStore();
    const [activeSettingsTab, setActiveSettingsTab] = React.useState<'nav' | 'theme'>('nav');

    const tasksLeft = totalTasks - tasksCompleted;
    const progressPercent = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Menu">
            <div className="flex gap-2 mb-6 p-1 bg-[var(--color-bg-tile-alt)] rounded-xl border border-[var(--color-border-subtle)]">
                <button
                    onClick={() => setActiveSettingsTab('nav')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-widest transition-float ${activeSettingsTab === 'nav' ? 'bg-[var(--color-bg-tile)] text-brand-accent shadow-layered-sm border border-[var(--color-border-subtle)]' : 'text-brand-textMuted hover:text-brand-textSecondary'}`}
                >
                    Navigation
                </button>
                <button
                    onClick={() => setActiveSettingsTab('theme')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-widest transition-float ${activeSettingsTab === 'theme' ? 'bg-[var(--color-bg-tile)] text-brand-accent shadow-layered-sm border border-[var(--color-border-subtle)]' : 'text-brand-textMuted hover:text-brand-textSecondary'}`}
                >
                    Appearance
                </button>
            </div>

            <div className="space-y-4">
                {activeSettingsTab === 'nav' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Navigation Section */}
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => {
                                    onTabChange('tasks');
                                    onClose();
                                }}
                                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-float focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'tasks'
                                    ? 'bg-[var(--color-bg-tile)] border-brand-accent text-brand-accent shadow-layered-sm'
                                    : 'bg-[var(--color-bg-tile-alt)] text-brand-textSecondary border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-tile-hover)]'
                                    }`}
                            >
                                <ListTodo size={24} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Tasks</span>
                            </button>
                            <button
                                onClick={() => {
                                    onTabChange('projects');
                                    onClose();
                                }}
                                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-float focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'projects'
                                    ? 'bg-[var(--color-bg-tile)] border-brand-accent text-brand-accent shadow-layered-sm'
                                    : 'bg-[var(--color-bg-tile-alt)] text-brand-textSecondary border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-tile-hover)]'
                                    }`}
                            >
                                <FolderOpen size={24} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Projects</span>
                            </button>
                            <button
                                onClick={() => {
                                    onTabChange('schedule');
                                    onClose();
                                }}
                                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-float focus:outline-none focus:ring-2 focus:ring-brand-accent/20 ${activeTab === 'schedule'
                                    ? 'bg-[var(--color-bg-tile)] border-brand-accent text-brand-accent shadow-layered-sm'
                                    : 'bg-[var(--color-bg-tile-alt)] text-brand-textSecondary border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-tile-hover)]'
                                    }`}
                            >
                                <CalendarDays size={24} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Schedule</span>
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-[var(--color-border-subtle)] my-2" />

                        {/* Student Info Cards */}
                        <div className="space-y-2">
                            {/* Student Name */}
                            <button
                                onClick={() => {
                                    onEditName();
                                    onClose();
                                }}
                                className="w-full bg-[var(--color-bg-tile)] rounded-xl p-3 flex items-center justify-between border border-[var(--color-border-subtle)] transition-float button-lift-dynamic shadow-layered-sm group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-brand-accent/10 text-brand-accent group-hover:scale-110 transition-transform">
                                        <User size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-brand-textMuted">Student</p>
                                        <p className="font-bold text-brand-textPrimary">{studentName}</p>
                                    </div>
                                </div>
                                <Edit3 size={16} className="text-brand-textMuted group-hover:text-brand-accent transition-colors" />
                            </button>

                            {/* Class Name */}
                            <div className="bg-[var(--color-bg-tile)] rounded-xl p-3 flex items-center justify-between border border-[var(--color-border-subtle)] shadow-layered-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                        <BookOpen size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[10px] font-black uppercase tracking-wider text-brand-textMuted">Classroom</p>
                                        <p className="font-bold text-brand-textPrimary">{className}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Progress Section */}
                        <div className="bg-[var(--color-bg-tile)] rounded-xl p-4 border border-[var(--color-border-subtle)] shadow-layered-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                        <CheckCircle size={20} />
                                    </div>
                                    <span className="font-black uppercase tracking-widest text-xs text-brand-textPrimary">Progress</span>
                                </div>
                                <span className="text-sm font-black text-brand-accent">{progressPercent}%</span>
                            </div>
                            <div className="h-1.5 bg-[var(--color-bg-tile-alt)] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-brand-accent rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <p className="text-[10px] font-bold text-brand-textMuted text-center">
                                {tasksCompleted} / {totalTasks} tasks completed
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Theme Section */}
                        <div className="space-y-4">
                            {/* Visual Presets Info */}
                            <div className="bg-[var(--color-bg-tile-alt)] rounded-xl p-3 border border-[var(--color-border-subtle)]">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                        <Sparkles size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-bold text-brand-textPrimary">Visual Presets</h3>
                                        <p className="text-[10px] font-black uppercase tracking-wider text-brand-textMuted">Customize your background</p>
                                    </div>
                                </div>
                            </div>

                            {/* Canvas Style */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                    <Palette size={14} className="text-brand-textMuted" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-textMuted">Canvas Style</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'industrial', color: '#0f1115', particle: '#f2efea', label: 'Industrial' },
                                        { id: 'midnight', color: '#020617', particle: '#3b82f6', label: 'Midnight' },
                                        { id: 'ocean', color: '#082f49', particle: '#0ea5e9', label: 'Ocean' },
                                        { id: 'emerald', color: '#064e3b', particle: '#10b981', label: 'Emerald' }
                                    ].map(preset => (
                                        <button
                                            key={preset.id}
                                            onClick={() => setBackgroundSettings({
                                                bgColor: preset.color,
                                                particleColor: preset.particle
                                            })}
                                            className={`py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-float ${backgroundSettings.bgColor === preset.color ? 'bg-brand-accent/10 border-brand-accent text-brand-accent' : 'bg-[var(--color-bg-tile)] border-[var(--color-border-subtle)] text-brand-textSecondary hover:border-brand-accent/30'}`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tile Theme */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                    <Layers size={14} className="text-brand-textMuted" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-textMuted">Tile Aesthetics</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'onyx', label: 'Onyx' },
                                        { id: 'slate', label: 'Slate' },
                                        { id: 'glacier', label: 'Glacier' }
                                    ].map(theme => (
                                        <button
                                            key={theme.id}
                                            onClick={() => setBackgroundSettings({ tileTheme: theme.id as any })}
                                            className={`py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-float ${backgroundSettings.tileTheme === theme.id ? 'bg-brand-accent/10 border-brand-accent text-brand-accent' : 'bg-[var(--color-bg-tile)] border-[var(--color-border-subtle)] text-brand-textSecondary hover:border-brand-accent/30'}`}
                                        >
                                            {theme.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Elevation */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 px-1">
                                    <Box size={14} className="text-brand-textMuted" />
                                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-textMuted">Physics / Elevation</span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {['gentle', 'float', 'lift'].map(level => (
                                        <button
                                            key={level}
                                            onClick={() => setBackgroundSettings({ elevationLevel: level as any })}
                                            className={`py-2 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-float ${backgroundSettings.elevationLevel === level ? 'bg-brand-accent/10 border-brand-accent text-brand-accent' : 'bg-[var(--color-bg-tile)] border-[var(--color-border-subtle)] text-brand-textSecondary hover:border-brand-accent/30'}`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Particles Toggle */}
                            <button
                                onClick={() => setBackgroundSettings({ particlesEnabled: !backgroundSettings.particlesEnabled })}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-float ${backgroundSettings.particlesEnabled ? 'bg-brand-accent/10 border-brand-accent text-brand-accent shadow-layered-sm' : 'bg-[var(--color-bg-tile)] border-[var(--color-border-subtle)] text-brand-textSecondary'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <Zap size={18} className={backgroundSettings.particlesEnabled ? 'animate-pulse' : ''} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Dynamic Particles</span>
                                </div>
                                <div className={`w-10 h-5 rounded-full relative transition-colors ${backgroundSettings.particlesEnabled ? 'bg-brand-accent' : 'bg-slate-700'}`}>
                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm ${backgroundSettings.particlesEnabled ? 'right-1' : 'left-1'}`} />
                                </div>
                            </button>

                            {/* Reset Button */}
                            <button
                                onClick={resetSettings}
                                className="w-full py-3 px-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-tile-alt)] text-[10px] font-black uppercase tracking-widest text-brand-textMuted hover:text-red-500 hover:border-red-500/50 transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 size={14} />
                                Reset to Defaults
                            </button>
                        </div>
                    </div>
                )}

                {/* Shared Logout Action */}
                <div className="pt-4 mt-2 border-t border-[var(--color-border-subtle)]">
                    <button
                        onClick={() => {
                            if (window.confirm('Sign out of this class?')) {
                                sessionStorage.removeItem('studentName');
                                sessionStorage.removeItem('studentClassId');
                                onSignOut();
                                onClose();
                            }
                        }}
                        className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 rounded-xl p-4 flex items-center justify-center gap-3 transition-float button-lift-dynamic border border-red-500/20 shadow-layered-sm font-black uppercase tracking-widest text-xs"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};
};

export default StudentMenuModal;
