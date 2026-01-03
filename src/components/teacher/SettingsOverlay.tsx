import React from 'react';
import { LogOut, QrCode, Minus, Triangle, Grid3X3, Magnet, Orbit, Bug, Bird } from 'lucide-react';
import { useClassStore, THEME_PRESETS } from '../../store/appSettings';

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

// Grid cell component - reflects visual theme settings in real-time
const GridCell: React.FC<{
    isSelected: boolean;
    onClick: () => void;
    label: string;
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    noExample?: boolean;
    immersive?: boolean;
}> = ({ isSelected, onClick, label, children, className = '', style, noExample = false, immersive = false }) => {
    const { backgroundSettings } = useClassStore();

    return (
        <button
            onClick={onClick}
            style={style}
            className={`group relative flex flex-col items-center gap-1 p-1.5 rounded-lg transition-float overflow-visible
                ${immersive ? 'justify-center min-h-[44px]' : 'items-center'}
                ${noExample
                    ? (isSelected ? 'border-2 border-brand-textPrimary bg-(--color-bg-tile)' : 'border-2 border-transparent hover:bg-(--color-bg-tile-hover)')
                    : `bg-(--color-bg-tile) border-2 lift-dynamic
                       ${isSelected ? 'border-brand-textPrimary' : 'border-border-subtle'}
                       hover:border-brand-accent/50
                       hover:shadow-[var(--shadow-layered-lg),0_0_var(--glow-blur)_var(--glow-spread)_var(--glow-color)]
                      `
                }
                ${className}`}
        >
            {/* Living Example: Horizon Etch (mirrors the logic in SettingsManager) */}
            {!noExample && backgroundSettings.horizonEtch !== 'off' && (
                <div className="absolute inset-0 pointer-events-none rounded-lg overflow-hidden">
                    <div
                        className={`absolute inset-0 border-brand-accent transition-opacity duration-300
                            ${backgroundSettings.horizonEtch === 'top' ? 'border-t-2' : 'border-l-2'}`}
                    />
                </div>
            )}

            {/* Living Example: Aura Glow (mirrors the logic in SettingsManager) */}
            {!noExample && backgroundSettings.auraGlow !== 'off' && (
                <div
                    className="absolute inset-0 -z-10 pointer-events-none rounded-lg transition-opacity duration-500"
                    style={{
                        opacity: 'var(--glow-opacity)',
                        boxShadow: `0 0 var(--glow-blur) var(--glow-spread) var(--glow-color)`
                    }}
                />
            )}

            <div className={`relative z-10 flex flex-col items-center w-full ${immersive ? 'justify-center' : 'gap-1'}`}>
                {immersive ? (
                    <span className={`text-[10px] font-bold uppercase tracking-tight leading-none text-center px-1
                        ${isSelected ? 'text-brand-textPrimary' : 'text-brand-textSecondary'}`}>
                        {label}
                    </span>
                ) : (
                    <>
                        {children}
                        <span className={`text-[10px] font-bold uppercase tracking-tight leading-none
                            ${isSelected ? 'text-brand-textPrimary' : 'text-brand-textMuted'}`}>
                            {label}
                        </span>
                    </>
                )}
            </div>
        </button>
    );
};

// Settings row with label on left (desktop) or top (mobile) - grows to fill space
const SettingsRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 flex-1">
        <span className="text-[10px] font-black uppercase tracking-wider text-brand-textSecondary px-1 md:px-0 md:w-20 md:shrink-0 md:text-right">
            {label}
        </span>
        <div className="flex-1 min-w-0 h-full">
            {children}
        </div>
    </div>
);

// Legacy row label component (for action buttons that don't need inline layout)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const RowLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="text-[9px] font-black uppercase tracking-wider text-brand-textSecondary px-0.5 mb-1">
        {children}
    </span>
);

const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
    isOpen,
    onClose,
    onLogout,
    onShowJoinCode,
}) => {
    const { backgroundSettings, setBackgroundSettings } = useClassStore();

    if (!isOpen) return null;

    // Preset options
    const presets = Object.entries(THEME_PRESETS).map(([id, preset]) => ({
        id,
        name: preset.name,
        preview: preset.settings
    }));

    // Background options
    const bgOptions = [
        { id: '#000000', label: 'Stark' },
        { id: '#050505', label: 'Void' },
        { id: '#0F1115', label: 'Cyber' },
        { id: '#171A21', label: 'Deep' },
        { id: '#C1C7D0', label: 'Ghost' },
        { id: '#D1D5DA', label: 'Vapor' }
    ];

    // Tile options
    const tileOptions = [
        { id: 'pure', label: 'Pure', color: '#000000' },
        { id: 'onyx', label: 'Onyx', color: '#1A1D24' },
        { id: 'slate', label: 'Slate', color: '#1E293B' },
        { id: 'glass', label: 'Glass', color: 'rgba(255, 255, 255, 0.1)' },
        { id: 'cloud', label: 'Cloud', color: '#E2E8F0' },
        { id: 'glacier', label: 'Glacier', color: '#FFFFFF' }
    ];

    // Primary text options
    const primaryOptions = [
        { id: 'pure', label: 'Pure', color: '#FFFFFF' },
        { id: 'silver', label: 'Silver', color: '#CBD5E1' },
        { id: 'steel', label: 'Steel', color: '#64748B' },
        { id: 'iron', label: 'Iron', color: '#334155' },
        { id: 'ink', label: 'Ink', color: '#111827' },
        { id: 'obsidian', label: 'Obsidian', color: '#020617' }
    ];

    // Secondary text options
    const secondaryOptions = [
        { id: 'sky', label: 'Sky', color: '#7DD3FC' },
        { id: 'mist', label: 'Mist', color: '#E2E8F0' },
        { id: 'ash', label: 'Ash', color: '#94A3B8' },
        { id: 'accent', label: 'Accent', color: '#3B82F6' },
        { id: 'lead', label: 'Lead', color: '#334155' },
        { id: 'coal', label: 'Coal', color: '#1F2937' }
    ];

    // Elevation options
    const elevationOptions = [
        { id: 'flat', label: 'Flat', lift: '0px', shadow: '0 2px 4px rgba(0,0,0,0.2)' },
        { id: 'subtle', label: 'Subtle', lift: '-1px', shadow: '0 4px 12px rgba(0,0,0,0.25)' },
        { id: 'moderate', label: 'Moderate', lift: '-2px', shadow: '0 6px 16px rgba(0,0,0,0.3)' },
        { id: 'elevated', label: 'Elevated', lift: '-3px', shadow: '0 8px 20px rgba(0,0,0,0.35)' },
        { id: 'dramatic', label: 'Dramatic', lift: '-4px', shadow: '0 12px 28px rgba(0,0,0,0.4)' },
        { id: 'weightless', label: 'Weightless', lift: '-6px', shadow: '0 16px 36px rgba(0,0,0,0.5)' }
    ];

    // Border options
    const borderOptions = [
        { id: 'auto', label: 'Auto' },
        { id: 'accent', label: 'Accent' },
        { id: 'ghost', label: 'Ghost' },
        { id: 'glass', label: 'Glass' },
        { id: 'vibrant', label: 'Vivid' },
        { id: 'flux', label: 'Flux' }
    ];

    // Particle options - all effects with unique icons
    const particleOptions = [
        { id: 'none', label: 'Off', icon: Minus },
        { id: 'gravity', label: 'Geometry', icon: Triangle },
        { id: 'grid', label: 'Grid', icon: Grid3X3 },
        { id: 'magnetic', label: 'Magnetic', icon: Magnet },
        { id: 'orbit', label: 'Orbit', icon: Orbit },
        { id: 'swarm_small', label: 'Swarm', icon: Bug },
        { id: 'swarm_large', label: 'Flock', icon: Bird }
    ];

    // Particle color options
    const particleColorOptions = [
        { id: '#262626', label: 'Onyx' },
        { id: '#3b82f6', label: 'Accent' },
        { id: '#cbd5e1', label: 'Slate' },
        { id: '#e8edf2', label: 'Glacier' },
        { id: 'vibrant', label: 'Vibrant' },
        { id: 'random', label: 'Random' }
    ];

    const applyPreset = (presetId: string) => {
        const preset = THEME_PRESETS[presetId];
        if (preset) {
            setBackgroundSettings(preset.settings);
        }
    };

    // Check if current settings match a preset
    const currentPresetId = Object.entries(THEME_PRESETS).find(([_, preset]) => {
        const s = preset.settings;
        return s.bgColor === backgroundSettings.bgColor &&
            s.tileTheme === backgroundSettings.tileTheme &&
            s.primaryTheme === backgroundSettings.primaryTheme;
    })?.[0] || null;

    return (
        <div className="flex flex-col h-full gap-2">
            {/* Action Buttons - Top */}
            <div className="flex gap-2 mb-3">
                {onShowJoinCode && (
                    <button
                        onClick={() => { onShowJoinCode(); onClose(); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold
                            bg-(--color-bg-tile) text-brand-textPrimary border border-border-subtle
                            button-lift-dynamic hover:border-brand-accent/50"
                    >
                        <QrCode size={16} className="text-brand-accent" />
                        <span className="text-xs">Join Code</span>
                    </button>
                )}
                {onLogout && (
                    <button
                        onClick={() => { onLogout(); onClose(); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold
                            bg-(--color-bg-tile) text-brand-textPrimary border border-border-subtle
                            button-lift-dynamic hover:border-red-500/50"
                    >
                        <LogOut size={16} className="text-red-500" />
                        <span className="text-xs">Sign Out</span>
                    </button>
                )}
            </div>

            {/* Divider */}
            <div className="border-t border-border-subtle my-2" />

            {/* Row 1: Presets */}
            <SettingsRow label="Themes">
                <div className="grid grid-cols-6 gap-1.5 p-1 h-full">
                    {presets.map((p) => (
                        <GridCell
                            key={p.id}
                            isSelected={currentPresetId === p.id}
                            onClick={() => applyPreset(p.id)}
                            label={p.name}
                            immersive={true}
                            style={{ backgroundColor: p.preview.bgColor }}
                        />
                    ))}
                </div>
            </SettingsRow>

            {/* Row 2: Background */}
            <SettingsRow label="Background">
                <div className="grid grid-cols-6 gap-1.5 p-1 h-full">
                    {bgOptions.map((bg) => (
                        <GridCell
                            key={bg.id}
                            isSelected={backgroundSettings.bgColor === bg.id}
                            onClick={() => setBackgroundSettings({ bgColor: bg.id })}
                            label={bg.label}
                            immersive={true}
                            style={{ backgroundColor: bg.id }}
                        />
                    ))}
                </div>
            </SettingsRow>

            {/* Row 3: Tiles */}
            <SettingsRow label="Tiles">
                <div className="grid grid-cols-6 gap-1.5 p-1 h-full">
                    {tileOptions.map((t) => (
                        <GridCell
                            key={t.id}
                            isSelected={backgroundSettings.tileTheme === t.id}
                            onClick={() => setBackgroundSettings({ tileTheme: t.id as any })}
                            label={t.label}
                            immersive={true}
                            style={t.id === 'glass'
                                ? { background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))', backdropFilter: 'blur(4px)' }
                                : { backgroundColor: t.color }
                            }
                        />
                    ))}
                </div>
            </SettingsRow>

            {/* Row 4: Primary Text */}
            <SettingsRow label="Primary">
                <div className="grid grid-cols-6 gap-1.5 p-1 h-full">
                    {primaryOptions.map((t) => (
                        <GridCell
                            key={t.id}
                            isSelected={backgroundSettings.primaryTheme === t.id}
                            onClick={() => setBackgroundSettings({ primaryTheme: t.id as any })}
                            label={t.label}
                        >
                            <div
                                className="w-full h-6 rounded-md flex items-center justify-center font-black text-sm"
                                style={{
                                    backgroundColor: ['white', 'mist'].includes(t.id) ? '#1a1d24' : 'transparent',
                                    color: t.color
                                }}
                            >
                                Aa
                            </div>
                        </GridCell>
                    ))}
                </div>
            </SettingsRow>

            {/* Row 5: Secondary Text */}
            <SettingsRow label="Secondary">
                <div className="grid grid-cols-6 gap-1.5 p-1 h-full">
                    {secondaryOptions.map((t) => (
                        <GridCell
                            key={t.id}
                            isSelected={backgroundSettings.secondaryTheme === t.id}
                            onClick={() => setBackgroundSettings({ secondaryTheme: t.id as any })}
                            label={t.label}
                        >
                            <div
                                className="w-full h-6 rounded-md flex items-center justify-center font-black text-sm"
                                style={{
                                    backgroundColor: ['slate', 'ash'].includes(t.id) ? '#1a1d24' : 'transparent',
                                    color: t.color
                                }}
                            >
                                Aa
                            </div>
                        </GridCell>
                    ))}
                </div>
            </SettingsRow>

            {/* Row 6: Elevation */}
            <SettingsRow label="Elevation">
                <div className="grid grid-cols-6 gap-1.5 p-1 h-full">
                    {elevationOptions.map((e) => (
                        <GridCell
                            key={e.id}
                            isSelected={backgroundSettings.elevationLevel === e.id}
                            onClick={() => setBackgroundSettings({ elevationLevel: e.id as any })}
                            label={e.label}
                            className="overflow-hidden"
                        >
                            <div
                                className="w-8 h-5 rounded-sm bg-brand-textSecondary"
                                style={{
                                    transform: `translateY(${e.lift})`,
                                    boxShadow: 'var(--shadow-layered)'
                                }}
                            />
                        </GridCell>
                    ))}
                </div>
            </SettingsRow>

            {/* Row 7: Borders */}
            <SettingsRow label="Borders">
                <div className="grid grid-cols-6 gap-1.5 p-1 h-full">
                    {borderOptions.map((b) => (
                        <GridCell
                            key={b.id}
                            isSelected={backgroundSettings.borderStyle === b.id}
                            onClick={() => setBackgroundSettings({ borderStyle: b.id as any })}
                            label={b.label}
                        >
                            <div className="w-full h-6 flex items-center justify-center">
                                <div
                                    className={`w-6 h-4 rounded-sm border-2 ${b.id === 'accent' ? 'border-brand-accent' :
                                        b.id === 'ghost' ? 'border-white/10' :
                                            b.id === 'glass' ? 'border-white/20' :
                                                b.id === 'vibrant' ? 'border-white/40' :
                                                    'border-border-subtle'
                                        }`}
                                />
                            </div>
                        </GridCell>
                    ))}
                </div>
            </SettingsRow>

            {/* Row 8: Border Effects (Merged Etch & Glow) */}
            <SettingsRow label="Effects">
                <div className="grid grid-cols-6 gap-1.5 p-1 h-full">
                    {[
                        { id: 'none', label: 'None' },
                        { id: 'etch_top', label: 'Etch (T)' },
                        { id: 'etch_left', label: 'Etch (L)' },
                        { id: 'glow_hover', label: 'Hover' },
                        { id: 'glow_active', label: 'Active' },
                        { id: 'both', label: 'Both' }
                    ].map((opt) => {
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
                            <GridCell
                                key={opt.id}
                                isSelected={isSelected}
                                onClick={handleClick}
                                label={opt.label}
                            >
                                <div className="w-full h-6 flex items-center justify-center">
                                    {opt.id === 'none' ? (
                                        <span className="text-[10px] font-bold text-brand-textMuted">—</span>
                                    ) : (
                                        <div
                                            className={`w-6 h-4 rounded-sm bg-(--color-bg-tile) border border-border-subtle 
                                                ${opt.id === 'etch_top' ? 'border-t-2 border-brand-accent' : ''}
                                                ${opt.id === 'etch_left' ? 'border-l-2 border-brand-accent' : ''}`}
                                            style={opt.id.startsWith('glow') ? {
                                                boxShadow: `0 0 var(--glow-blur) var(--glow-spread) rgba(59, 130, 246, ${opt.id === 'glow_active' ? '0.6' : '0'})`
                                            } : {}}
                                        />
                                    )}
                                </div>
                            </GridCell>
                        );
                    })}
                </div>
            </SettingsRow>

            {/* Row 9: Particles */}
            <SettingsRow label="Particles">
                <div className="grid grid-cols-7 gap-1.5 p-1 h-full">
                    {particleOptions.map((p) => {
                        const isOff = p.id === 'none';
                        const isSelected = isOff
                            ? !backgroundSettings.particlesEnabled
                            : backgroundSettings.particlesEnabled && backgroundSettings.particleEffect === p.id;

                        return (
                            <GridCell
                                key={p.id}
                                isSelected={isSelected}
                                noExample={true}
                                onClick={() => {
                                    if (isOff) {
                                        setBackgroundSettings({ particlesEnabled: false });
                                    } else {
                                        setBackgroundSettings({ particlesEnabled: true, particleEffect: p.id as any });
                                    }
                                }}
                                label={p.label}
                            >
                                <div className="w-full h-6 flex items-center justify-center text-brand-textSecondary">
                                    <p.icon className={`w-4 h-4 ${isSelected ? 'text-brand-accent' : 'text-brand-textMuted'}`} />
                                </div>
                            </GridCell>
                        );
                    })}
                </div>
            </SettingsRow>

            {/* Row 10: Particle Colours (only if particles enabled) */}
            {backgroundSettings.particlesEnabled && (
                <SettingsRow label="Particle Colours">
                    <div className="grid grid-cols-6 gap-1.5 p-1 h-full">
                        {particleColorOptions.map((c) => (
                            <GridCell
                                key={c.id}
                                isSelected={backgroundSettings.particleColor === c.id}
                                noExample={true}
                                onClick={() => setBackgroundSettings({ particleColor: c.id })}
                                label={c.label}
                            >
                                <div
                                    className="w-full h-6 rounded-md"
                                    style={{
                                        background: c.id === 'vibrant'
                                            ? 'linear-gradient(45deg, #ef4444, #10b981, #3b82f6)'
                                            : c.id
                                    }}
                                />
                            </GridCell>
                        ))}
                    </div>
                </SettingsRow>
            )}

            {/* Row 11: Opacity slider (only if particles enabled) */}
            {backgroundSettings.particlesEnabled && (
                <SettingsRow label="Opacity">
                    <div className="flex items-center gap-2 h-full">
                        <input
                            type="range"
                            min="0.05"
                            max="1.0"
                            step="0.05"
                            value={backgroundSettings.particleOpacity}
                            onChange={(e) => setBackgroundSettings({ particleOpacity: parseFloat(e.target.value) })}
                            className="flex-1 h-1 bg-tile-alt rounded-lg appearance-none cursor-pointer accent-brand-accent"
                            aria-label="Particle opacity"
                            title="Adjust particle opacity"
                        />
                        <span className="text-xs font-bold text-brand-accent w-10 text-right">{Math.round(backgroundSettings.particleOpacity * 100)}%</span>
                    </div>
                </SettingsRow>
            )}

            {/* Bottom padding */}
            <div className="h-2 shrink-0" />
        </div>
    );
};


export default SettingsOverlay;
