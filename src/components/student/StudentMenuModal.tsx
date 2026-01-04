import React from 'react';
import { LogOut, User, BookOpen, CheckCircle, ListTodo, FolderOpen, CalendarDays, Trash2, Edit3, Minus, Triangle, Grid3X3, Magnet, Orbit, Bug, Bird } from 'lucide-react';
import { useClassStore, THEME_PRESETS } from '../../store/appSettings';
import { Modal } from '../shared/Modal';

// Simple settings section label
const SettingsSection: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="space-y-1.5">
        <span className="text-[9px] font-black uppercase tracking-wider text-brand-textMuted px-0.5">
            {label}
        </span>
        {children}
    </div>
);

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
    const progressPercent = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0;


    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Menu">
            <div className="flex gap-2 mb-6 p-1 bg-tile-alt rounded-xl border border-border-subtle">
                <button
                    onClick={() => setActiveSettingsTab('nav')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-widest transition-float ${activeSettingsTab === 'nav' ? 'bg-tile text-brand-accent shadow-layered-sm border border-border-subtle' : 'text-brand-textMuted hover:text-brand-textSecondary'}`}
                >
                    Navigation
                </button>
                <button
                    onClick={() => setActiveSettingsTab('theme')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-widest transition-float ${activeSettingsTab === 'theme' ? 'bg-tile text-brand-accent shadow-layered-sm border border-border-subtle' : 'text-brand-textMuted hover:text-brand-textSecondary'}`}
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
                                    ? 'bg-tile border-brand-accent text-brand-accent shadow-layered-sm'
                                    : 'bg-tile-alt text-brand-textSecondary border-border-subtle hover:bg-tile-hover'
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
                                    ? 'bg-tile border-brand-accent text-brand-accent shadow-layered-sm'
                                    : 'bg-tile-alt text-brand-textSecondary border-border-subtle hover:bg-tile-hover'
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
                                    ? 'bg-tile border-brand-accent text-brand-accent shadow-layered-sm'
                                    : 'bg-tile-alt text-brand-textSecondary border-border-subtle hover:bg-tile-hover'
                                    }`}
                            >
                                <CalendarDays size={24} />
                                <span className="text-[10px] font-black uppercase tracking-wider">Schedule</span>
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-border-subtle my-2" />

                        {/* Student Info Cards */}
                        <div className="space-y-2">
                            {/* Student Name */}
                            <button
                                onClick={() => {
                                    onEditName();
                                    onClose();
                                }}
                                className="w-full bg-tile rounded-xl p-3 flex items-center justify-between border border-border-subtle transition-float button-lift-dynamic shadow-layered-sm group"
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
                            <div className="bg-tile rounded-xl p-3 flex items-center justify-between border border-border-subtle shadow-layered-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-[var(--color-status-progress)]/10 text-[var(--color-status-progress)]">
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
                        <div className="bg-tile rounded-xl p-4 border border-border-subtle shadow-layered-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-[var(--color-status-in-progress)]/10 text-[var(--color-status-in-progress)]">
                                        <CheckCircle size={20} />
                                    </div>
                                    <span className="font-black uppercase tracking-widest text-xs text-brand-textPrimary">Progress</span>
                                </div>
                                <span className="text-sm font-black text-brand-accent">{progressPercent}%</span>
                            </div>
                            <div className="h-1.5 bg-tile-alt rounded-full overflow-hidden">
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
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 max-h-[60vh] overflow-y-auto pr-1">
                        {/* Theme Presets */}
                        <SettingsSection label="Themes">
                            <div className="grid grid-cols-3 gap-1.5">
                                {Object.entries(THEME_PRESETS).map(([id, preset]) => {
                                    const isSelected = preset.settings.bgColor === backgroundSettings.bgColor &&
                                        preset.settings.tileTheme === backgroundSettings.tileTheme &&
                                        preset.settings.primaryTheme === backgroundSettings.primaryTheme;
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => setBackgroundSettings(preset.settings)}
                                            className={`py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-float ${isSelected ? 'bg-brand-accent/10 border-2 border-brand-accent text-brand-accent' : 'bg-tile border border-border-subtle text-brand-textSecondary hover:border-brand-accent/30'}`}
                                            style={{ backgroundColor: preset.settings.bgColor }}
                                        >
                                            {preset.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </SettingsSection>

                        {/* Background */}
                        <SettingsSection label="Background">
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { id: '#000000', label: 'Stark' },
                                    { id: '#050505', label: 'Void' },
                                    { id: '#0F1115', label: 'Cyber' },
                                    { id: '#171A21', label: 'Deep' },
                                    { id: '#C1C7D0', label: 'Ghost' },
                                    { id: '#D1D5DA', label: 'Vapor' }
                                ].map(bg => (
                                    <button
                                        key={bg.id}
                                        onClick={() => setBackgroundSettings({ bgColor: bg.id })}
                                        className={`py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-float ${backgroundSettings.bgColor === bg.id ? 'border-2 border-brand-accent' : 'border border-border-subtle hover:border-brand-accent/30'}`}
                                        style={{ backgroundColor: bg.id }}
                                    >
                                        <span className={bg.id.startsWith('#C') || bg.id.startsWith('#D') ? 'text-gray-800' : 'text-white/80'}>{bg.label}</span>
                                    </button>
                                ))}
                            </div>
                        </SettingsSection>

                        {/* Tiles */}
                        <SettingsSection label="Tiles">
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { id: 'pure', label: 'Pure', color: '#000000' },
                                    { id: 'onyx', label: 'Onyx', color: '#1A1D24' },
                                    { id: 'slate', label: 'Slate', color: '#1E293B' },
                                    { id: 'glass', label: 'Glass', color: 'rgba(255, 255, 255, 0.1)' },
                                    { id: 'cloud', label: 'Cloud', color: '#E2E8F0' },
                                    { id: 'glacier', label: 'Glacier', color: '#FFFFFF' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setBackgroundSettings({ tileTheme: t.id as any })}
                                        className={`py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-float ${backgroundSettings.tileTheme === t.id ? 'border-2 border-brand-accent text-brand-accent' : 'border border-border-subtle text-brand-textSecondary hover:border-brand-accent/30'}`}
                                        style={t.id === 'glass'
                                            ? { background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))', backdropFilter: 'blur(4px)' }
                                            : { backgroundColor: t.color }
                                        }
                                    >
                                        <span className={['cloud', 'glacier'].includes(t.id) ? 'text-gray-800' : ''}>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </SettingsSection>

                        {/* Primary Text */}
                        <SettingsSection label="Primary Text">
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { id: 'pure', label: 'Pure', color: '#FFFFFF' },
                                    { id: 'silver', label: 'Silver', color: '#CBD5E1' },
                                    { id: 'steel', label: 'Steel', color: '#64748B' },
                                    { id: 'iron', label: 'Iron', color: '#334155' },
                                    { id: 'ink', label: 'Ink', color: '#111827' },
                                    { id: 'obsidian', label: 'Obsidian', color: '#020617' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setBackgroundSettings({ primaryTheme: t.id as any })}
                                        className={`py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-float flex items-center justify-center gap-1 ${backgroundSettings.primaryTheme === t.id ? 'bg-brand-accent/10 border-2 border-brand-accent' : 'bg-tile border border-border-subtle hover:border-brand-accent/30'}`}
                                    >
                                        <span style={{ color: t.color }} className="font-black">Aa</span>
                                        <span className="text-brand-textMuted">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </SettingsSection>

                        {/* Secondary Text */}
                        <SettingsSection label="Secondary Text">
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { id: 'sky', label: 'Sky', color: '#7DD3FC' },
                                    { id: 'mist', label: 'Mist', color: '#E2E8F0' },
                                    { id: 'ash', label: 'Ash', color: '#94A3B8' },
                                    { id: 'accent', label: 'Accent', color: '#3B82F6' },
                                    { id: 'lead', label: 'Lead', color: '#334155' },
                                    { id: 'coal', label: 'Coal', color: '#1F2937' }
                                ].map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => setBackgroundSettings({ secondaryTheme: t.id as any })}
                                        className={`py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-float flex items-center justify-center gap-1 ${backgroundSettings.secondaryTheme === t.id ? 'bg-brand-accent/10 border-2 border-brand-accent' : 'bg-tile border border-border-subtle hover:border-brand-accent/30'}`}
                                    >
                                        <span style={{ color: t.color }} className="font-black">Aa</span>
                                        <span className="text-brand-textMuted">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </SettingsSection>

                        {/* Elevation */}
                        <SettingsSection label="Elevation">
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { id: 'flat', label: 'Flat' },
                                    { id: 'subtle', label: 'Subtle' },
                                    { id: 'moderate', label: 'Moderate' },
                                    { id: 'elevated', label: 'Elevated' },
                                    { id: 'dramatic', label: 'Dramatic' },
                                    { id: 'weightless', label: 'Weightless' }
                                ].map(e => (
                                    <button
                                        key={e.id}
                                        onClick={() => setBackgroundSettings({ elevationLevel: e.id as any })}
                                        className={`py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-float ${backgroundSettings.elevationLevel === e.id ? 'bg-brand-accent/10 border-2 border-brand-accent text-brand-accent' : 'bg-tile border border-border-subtle text-brand-textSecondary hover:border-brand-accent/30'}`}
                                    >
                                        {e.label}
                                    </button>
                                ))}
                            </div>
                        </SettingsSection>

                        {/* Borders */}
                        <SettingsSection label="Borders">
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { id: 'auto', label: 'Auto' },
                                    { id: 'accent', label: 'Accent' },
                                    { id: 'ghost', label: 'Ghost' },
                                    { id: 'glass', label: 'Glass' },
                                    { id: 'vibrant', label: 'Vivid' },
                                    { id: 'flux', label: 'Flux' }
                                ].map(b => (
                                    <button
                                        key={b.id}
                                        onClick={() => setBackgroundSettings({ borderStyle: b.id as any })}
                                        className={`py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-float ${backgroundSettings.borderStyle === b.id ? 'bg-brand-accent/10 border-2 border-brand-accent text-brand-accent' : 'bg-tile border border-border-subtle text-brand-textSecondary hover:border-brand-accent/30'}`}
                                    >
                                        {b.label}
                                    </button>
                                ))}
                            </div>
                        </SettingsSection>

                        {/* Effects */}
                        <SettingsSection label="Effects">
                            <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { id: 'none', label: 'None' },
                                    { id: 'etch_top', label: 'Etch (T)' },
                                    { id: 'etch_left', label: 'Etch (L)' },
                                    { id: 'glow_hover', label: 'Hover' },
                                    { id: 'glow_active', label: 'Active' },
                                    { id: 'both', label: 'Both' }
                                ].map(opt => {
                                    const isSelected = opt.id === 'none'
                                        ? (backgroundSettings.horizonEtch === 'off' && backgroundSettings.auraGlow === 'off')
                                        : opt.id === 'etch_top' ? backgroundSettings.horizonEtch === 'top' && backgroundSettings.auraGlow === 'off'
                                            : opt.id === 'etch_left' ? backgroundSettings.horizonEtch === 'left' && backgroundSettings.auraGlow === 'off'
                                                : opt.id === 'glow_hover' ? backgroundSettings.auraGlow === 'hover'
                                                    : opt.id === 'glow_active' ? backgroundSettings.auraGlow === 'active' && backgroundSettings.horizonEtch !== 'both'
                                                        : backgroundSettings.horizonEtch === 'both';

                                    const handleClick = () => {
                                        if (opt.id === 'none') {
                                            setBackgroundSettings({ horizonEtch: 'off', auraGlow: 'off' });
                                        } else if (opt.id === 'etch_top') {
                                            setBackgroundSettings({ horizonEtch: 'top', auraGlow: 'off' });
                                        } else if (opt.id === 'etch_left') {
                                            setBackgroundSettings({ horizonEtch: 'left', auraGlow: 'off' });
                                        } else if (opt.id === 'glow_hover') {
                                            setBackgroundSettings({ horizonEtch: 'off', auraGlow: 'hover' });
                                        } else if (opt.id === 'glow_active') {
                                            setBackgroundSettings({ horizonEtch: 'off', auraGlow: 'active' });
                                        } else if (opt.id === 'both') {
                                            setBackgroundSettings({ horizonEtch: 'both', auraGlow: 'active' });
                                        }
                                    };

                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={handleClick}
                                            className={`py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-float ${isSelected ? 'bg-brand-accent/10 border-2 border-brand-accent text-brand-accent' : 'bg-tile border border-border-subtle text-brand-textSecondary hover:border-brand-accent/30'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </SettingsSection>

                        {/* Particles */}
                        <SettingsSection label="Particles">
                            <div className="grid grid-cols-4 gap-1.5">
                                {[
                                    { id: 'none', label: 'Off', icon: Minus },
                                    { id: 'gravity', label: 'Geo', icon: Triangle },
                                    { id: 'grid', label: 'Grid', icon: Grid3X3 },
                                    { id: 'magnetic', label: 'Mag', icon: Magnet },
                                    { id: 'orbit', label: 'Orbit', icon: Orbit },
                                    { id: 'swarm_small', label: 'Swarm', icon: Bug },
                                    { id: 'swarm_large', label: 'Flock', icon: Bird }
                                ].map(p => {
                                    const isOff = p.id === 'none';
                                    const isSelected = isOff
                                        ? !backgroundSettings.particlesEnabled
                                        : backgroundSettings.particlesEnabled && backgroundSettings.particleEffect === p.id;

                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                if (isOff) {
                                                    setBackgroundSettings({ particlesEnabled: false });
                                                } else {
                                                    setBackgroundSettings({ particlesEnabled: true, particleEffect: p.id as any });
                                                }
                                            }}
                                            className={`py-2 px-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-float flex flex-col items-center gap-1 ${isSelected ? 'bg-brand-accent/10 border-2 border-brand-accent text-brand-accent' : 'bg-tile border border-border-subtle text-brand-textSecondary hover:border-brand-accent/30'}`}
                                        >
                                            <p.icon size={14} />
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </SettingsSection>

                        {/* Particle Colours (only if particles enabled) */}
                        {backgroundSettings.particlesEnabled && (
                            <SettingsSection label="Particle Colors">
                                <div className="grid grid-cols-3 gap-1.5">
                                    {[
                                        { id: '#262626', label: 'Onyx' },
                                        { id: '#3b82f6', label: 'Accent' },
                                        { id: '#cbd5e1', label: 'Slate' },
                                        { id: '#e8edf2', label: 'Glacier' },
                                        { id: 'vibrant', label: 'Vibrant' },
                                        { id: 'random', label: 'Random' }
                                    ].map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => setBackgroundSettings({ particleColor: c.id })}
                                            className={`py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-float ${backgroundSettings.particleColor === c.id ? 'border-2 border-brand-accent' : 'border border-border-subtle hover:border-brand-accent/30'}`}
                                            style={{
                                                background: c.id === 'vibrant'
                                                    ? 'linear-gradient(45deg, #ef4444, #10b981, #3b82f6)'
                                                    : c.id === 'random'
                                                        ? 'linear-gradient(45deg, #f59e0b, #8b5cf6, #ec4899)'
                                                        : c.id
                                            }}
                                        >
                                            <span className={['#e8edf2', '#cbd5e1'].includes(c.id) ? 'text-gray-800' : 'text-white/90'}>{c.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </SettingsSection>
                        )}

                        {/* Opacity slider (only if particles enabled) */}
                        {backgroundSettings.particlesEnabled && (
                            <SettingsSection label="Opacity">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="0.05"
                                        max="1.0"
                                        step="0.05"
                                        value={backgroundSettings.particleOpacity}
                                        onChange={(e) => setBackgroundSettings({ particleOpacity: parseFloat(e.target.value) })}
                                        className="flex-1 h-1.5 bg-tile-alt rounded-lg appearance-none cursor-pointer accent-brand-accent"
                                        aria-label="Particle opacity"
                                    />
                                    <span className="text-xs font-bold text-brand-accent w-10 text-right">{Math.round(backgroundSettings.particleOpacity * 100)}%</span>
                                </div>
                            </SettingsSection>
                        )}

                        {/* Reset Button */}
                        <button
                            onClick={resetSettings}
                            className="w-full py-3 px-4 rounded-xl border border-border-subtle bg-tile-alt text-[10px] font-black uppercase tracking-widest text-brand-textMuted hover:text-[var(--color-status-stuck)] hover:border-[var(--color-status-stuck)]/50 transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={14} />
                            Reset to Defaults
                        </button>
                    </div>
                )}

                {/* Shared Logout Action */}
                <div className="pt-4 mt-2 border-t border-border-subtle">
                    <button
                        onClick={() => {
                            if (window.confirm('Sign out of this class?')) {
                                sessionStorage.removeItem('studentName');
                                sessionStorage.removeItem('studentClassId');
                                onSignOut();
                                onClose();
                            }
                        }}
                        className="w-full bg-[var(--color-status-stuck)]/10 hover:bg-[var(--color-status-stuck)]/20 text-[var(--color-status-stuck)] rounded-xl p-4 flex items-center justify-center gap-3 transition-float button-lift-dynamic border border-[var(--color-status-stuck)]/20 shadow-layered-sm font-black uppercase tracking-widest text-xs"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default StudentMenuModal;
