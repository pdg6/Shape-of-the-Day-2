import React, { useEffect, useRef } from 'react';
import { useClassStore } from '../../store/appSettings';

/**
 * SettingsManager Component
 * 
 * Applies theme settings as CSS variables and renders the interactive particle background.
 */
const SettingsManager: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { backgroundSettings } = useClassStore();

    // Global Text Color Application
    useEffect(() => {
        const root = document.documentElement;

        // 5-Position Text Palette (Lightest → Darkest for matching with dark→light backgrounds)
        // Position 1 = Lightest (for dark BG), Position 5 = Darkest (for light BG)
        const THEME_PALETTE: Record<string, { ink: string, vibe: string }> = {
            // Position 1: Lightest (default for dark mode)
            'white': { ink: '#e2e8f0', vibe: '#F8FAFC' },
            // Position 2
            'mist': { ink: '#94a3b8', vibe: '#CBD5E1' },
            // Position 3
            'silver': { ink: '#64748b', vibe: '#94a3b8' },
            // Position 4
            'iron': { ink: '#334155', vibe: '#475569' },
            // Position 5: Darkest (for light mode)
            'ink': { ink: '#0f172a', vibe: '#1e293b' },
            // Legacy mappings
            'bone': { ink: '#e2e8f0', vibe: '#F8FAFC' },
            'default': { ink: '#d4d0c8', vibe: '#F8FAFC' },
        };

        // 5-Position Secondary Text Palette
        const SECONDARY_PALETTE: Record<string, { ink: string, vibe: string }> = {
            // Position 1: Lightest (default for dark mode)
            'slate': { ink: '#64748b', vibe: '#94A3B8' },
            // Position 2
            'ash': { ink: '#475569', vibe: '#64748B' },
            // Position 3
            'pewter': { ink: '#334155', vibe: '#475569' },
            // Position 4
            'lead': { ink: '#1e293b', vibe: '#334155' },
            // Position 5: Darkest (for light mode)
            'graphite': { ink: '#334155', vibe: '#475569' },
            // Legacy mappings
            'stone': { ink: '#64748b', vibe: '#94A3B8' },
            'default': { ink: '#78716c', vibe: '#94A3B8' },
        };

        // 5-Position Tile Palette (Darkest → Lightest)
        const TILE_THEMES: Record<string, { tile: string, tileAlt: string, border: string }> = {
            // Position 1: Darkest (default)
            'onyx': { tile: '#1a1d24', tileAlt: '#151921', border: 'rgba(255, 255, 255, 0.1)' },
            // Position 2
            'slate': { tile: '#1e293b', tileAlt: '#0f172a', border: 'rgba(255, 255, 255, 0.1)' },
            // Position 3
            'graphite': { tile: '#334155', tileAlt: '#1e293b', border: 'rgba(255, 255, 255, 0.15)' },
            // Position 4
            'cloud': { tile: '#e2e8f0', tileAlt: '#cbd5e1', border: 'rgba(0, 0, 0, 0.1)' },
            // Position 5: Lightest
            'glacier': { tile: '#ffffff', tileAlt: '#f8fafc', border: 'rgba(0, 0, 0, 0.08)' },
        };

        // 5-Tier Elevation Presets (whisper → dramatic)
        const ELEVATION_PRESETS: Record<string, {
            tileDefault: string;
            tileHover: string;
            buttonHover: string;
            shadowSm: string;
            shadow: string;
            shadowLg: string;
        }> = {
            whisper: {
                tileDefault: '0px',
                tileHover: '-1px',
                buttonHover: '-1px',
                shadowSm: '0 1px 2px rgba(0,0,0,0.03)',
                shadow: '0 2px 6px rgba(0,0,0,0.06)',
                shadowLg: '0 4px 12px rgba(0,0,0,0.08)'
            },
            gentle: {
                tileDefault: '-1px',
                tileHover: '0px',
                buttonHover: '-1px',
                shadowSm: '0 2px 4px rgba(0,0,0,0.08)',
                shadow: '0 4px 12px rgba(0,0,0,0.1)',
                shadowLg: '0 8px 20px rgba(0,0,0,0.12)'
            },
            float: {
                tileDefault: '-2px',
                tileHover: '-1px',
                buttonHover: '-2px',
                shadowSm: '0 2px 4px rgba(0,0,0,0.12)',
                shadow: '0 6px 16px rgba(0,0,0,0.15)',
                shadowLg: '0 12px 28px rgba(0,0,0,0.18)'
            },
            lift: {
                tileDefault: '-4px',
                tileHover: '-3px',
                buttonHover: '-2px',
                shadowSm: '0 2px 4px -1px rgba(0,0,0,0.2), inset 0 1px 0 0 rgba(255,255,255,0.05)',
                shadow: '0 8px 20px -4px rgba(0,0,0,0.35), 0 4px 8px -2px rgba(0,0,0,0.2), inset 0 1px 0 0 rgba(255,255,255,0.08)',
                shadowLg: '0 16px 36px -8px rgba(0,0,0,0.45), 0 6px 14px -4px rgba(0,0,0,0.3), inset 0 1px 0 0 rgba(255,255,255,0.12)'
            },
            dramatic: {
                tileDefault: '-6px',
                tileHover: '-4px',
                buttonHover: '-3px',
                shadowSm: '0 3px 6px -1px rgba(0,0,0,0.3), inset 0 1px 0 0 rgba(255,255,255,0.08)',
                shadow: '0 12px 28px -6px rgba(0,0,0,0.5), 0 6px 12px -3px rgba(0,0,0,0.35), inset 0 1px 0 0 rgba(255,255,255,0.1)',
                shadowLg: '0 24px 48px -12px rgba(0,0,0,0.6), 0 10px 20px -5px rgba(0,0,0,0.4), inset 0 1px 0 0 rgba(255,255,255,0.15)'
            }
        };

        // 1. Get Color Pairs
        const primary = THEME_PALETTE[backgroundSettings.primaryTheme] || THEME_PALETTE['default'];
        const secondary = SECONDARY_PALETTE[backgroundSettings.secondaryTheme] || SECONDARY_PALETTE['default'];
        const tile = TILE_THEMES[backgroundSettings.tileTheme || 'onyx'] || TILE_THEMES['onyx'];
        const elevation = ELEVATION_PRESETS[backgroundSettings.elevationLevel || 'gentle'] || ELEVATION_PRESETS['gentle'];

        // 1.5 Calculate Dynamic Border & Hover Colors
        const isDarkTile = ['onyx', 'slate', 'graphite'].includes(backgroundSettings.tileTheme || 'onyx');

        let borderSubtle = tile.border;
        let borderStrong = isDarkTile ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
        let tileHover = isDarkTile ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
        let horizonHighlight = backgroundSettings.horizonEtching ? 'var(--color-brand-accent)' : 'transparent';
        let glowOpacity = backgroundSettings.glowEffect ? (isDarkTile ? '0.06' : '0.04') : '0';

        // Apply Border Style Presets
        switch (backgroundSettings.borderStyle) {
            case 'accent':
                borderSubtle = 'rgba(29, 78, 216, 0.2)';
                borderStrong = 'rgba(29, 78, 216, 0.4)';
                break;
            case 'ghost':
                borderSubtle = isDarkTile ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
                borderStrong = isDarkTile ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';
                break;
            case 'glass':
                borderSubtle = isDarkTile ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.12)';
                borderStrong = isDarkTile ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)';
                break;
            case 'vibrant':
                borderSubtle = isDarkTile ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
                borderStrong = isDarkTile ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
                break;
            case 'auto':
            default:
                // Keep defaults
                break;
        }

        // 2. Inject CSS Variables
        // Primary Theme (Headers, Active - "The Active Voice")
        root.style.setProperty('--text-primary-ink', primary.ink);   // Darker/Dimmer (Ink)
        root.style.setProperty('--text-primary-vibe', primary.vibe);    // Lighter/BVright (Vibe) -> Use this for Text!
        root.style.setProperty('--color-brand-textPrimary', primary.vibe);

        // Secondary Theme (Body, Labels - "The Context Voice")
        root.style.setProperty('--text-secondary-ink', secondary.ink); // Darker (Ink)
        root.style.setProperty('--text-secondary-vibe', secondary.vibe);  // Lighter (Vibe) -> Use this for Text!
        root.style.setProperty('--color-brand-textSecondary', secondary.vibe);
        root.style.setProperty('--color-brand-textMuted', secondary.ink);

        // Tile Theme (Surfaces, Cards, Navigation)
        root.style.setProperty('--color-bg-tile', tile?.tile || '#1a1d24');
        root.style.setProperty('--color-bg-tile-alt', tile?.tileAlt || '#151921');
        root.style.setProperty('--color-bg-tile-hover', tileHover);

        // Borders and Visual Fidelity
        root.style.setProperty('--color-border-subtle', borderSubtle);
        root.style.setProperty('--color-border-strong', borderStrong);
        root.style.setProperty('--color-horizon-highlight', horizonHighlight);
        root.style.setProperty('--glow-opacity', glowOpacity);

        // Map legacy utilities to dynamic tile colors for consistency
        root.style.setProperty('--color-brand-darkSurface', tile.tile);
        root.style.setProperty('--color-brand-lightSurface', tile.tile);

        // Elevation Theme (Lift transforms + Shadow intensity)
        root.style.setProperty('--elevation-tile-default', elevation.tileDefault);
        root.style.setProperty('--elevation-tile-hover', elevation.tileHover);
        root.style.setProperty('--elevation-button-hover', elevation.buttonHover);
        root.style.setProperty('--shadow-layered-sm', elevation.shadowSm);
        root.style.setProperty('--shadow-layered', elevation.shadow);
        root.style.setProperty('--shadow-layered-lg', elevation.shadowLg);

    }, [backgroundSettings]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (!backgroundSettings.particlesEnabled || backgroundSettings.particleEffect === 'none') {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const COLORS = {
            red: '#ef4444',
            green: '#10b981',
            blue: '#3b82f6',
            light: '#f2efea',
            bg: backgroundSettings.bgColor,
            particle: backgroundSettings.particleColor
        };

        const CONFIG = {
            gridSize: 45,
            mouseRadius: 250,
            swarmCount: backgroundSettings.particleEffect === 'swarm_large' ? 40 : 60,
            gravityCount: 40,
            connectDistance: 150,
            iconSize: backgroundSettings.particleEffect === 'swarm_large' ? 28 : 17,
            gridIconSize: 14
        };

        let width: number, height: number;
        let particles: Particle[] = [];
        const mouse = { x: -1000, y: -1000, active: false };
        let isMouseDown = false;

        class Particle {
            cx: number;
            cy: number;
            x: number;
            y: number;
            vx: number = 0;
            vy: number = 0;
            rot: number = 0;
            rotSpeed: number = 0;
            type: 'red' | 'green' | 'blue';
            baseColor: string;
            captured: boolean = false;
            orbitAngle: number = Math.random() * Math.PI * 2;
            trailSpeed: number = 0.01 + Math.random() * 0.03;

            constructor(cx: number, cy: number, isSwarm: boolean = false, isGravity: boolean = false) {
                this.cx = cx;
                this.cy = cy;
                this.x = cx;
                this.y = cy;

                const types: ('red' | 'green' | 'blue')[] = ['red', 'green', 'blue'];
                this.type = types[Math.floor(Math.random() * types.length)];

                // Color Preset Logic:
                // - Vibrant: Multi-color icons (Red/Green/Blue)
                // - Accent: Brand Blue (#3b82f6) for ALL
                // - Dark: Charcoal (#262626) for ALL
                // - Light: Light (#f2efea) for ALL
                if (backgroundSettings.particleColor === '#3b82f6') {
                    this.baseColor = COLORS.blue;
                } else if (backgroundSettings.particleColor === '#262626') {
                    this.baseColor = '#262626';
                } else if (backgroundSettings.particleColor === '#f2efea') {
                    this.baseColor = COLORS.light;
                } else {
                    this.baseColor = this.type === 'red' ? COLORS.red : this.type === 'green' ? COLORS.green : COLORS.blue;
                }

                if (isSwarm || isGravity) {
                    this.vx = (Math.random() - 0.5) * (isGravity ? 0.6 : 0.4);
                    this.vy = (Math.random() - 0.5) * (isGravity ? 0.6 : 0.4);
                    this.rot = Math.random() * 360;
                    this.rotSpeed = (Math.random() - 0.5) * 0.1;
                }
            }

            draw() {
                if (!ctx) return;
                const mode = backgroundSettings.particleEffect;
                const isSwarmLarge = mode === 'swarm_large';
                const isSwarmSmall = mode === 'swarm_small';
                const isGravity = mode === 'gravity';
                const isGrid = mode === 'grid' || mode === 'magnetic' || mode === 'orbit';

                if (isGravity) {
                    // Draw node as small dot
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
                    ctx.fillStyle = this.baseColor;
                    ctx.fill();
                    return;
                }

                const size = (isSwarmSmall || isSwarmLarge) ? CONFIG.iconSize : CONFIG.gridIconSize;
                const showCircle = isGrid || isSwarmLarge || isSwarmSmall;

                ctx.save();
                ctx.globalAlpha = backgroundSettings.particleOpacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rot * Math.PI / 180);

                const s = size / 40;
                ctx.scale(s, s);
                ctx.translate(-20, -20);

                // 1. Draw Circle for Red (Swarms only) or Blue (Always Grid/Swarms)
                if ((this.type === 'red' && (isSwarmLarge || isSwarmSmall)) || (this.type === 'blue' && showCircle)) {
                    ctx.beginPath();
                    ctx.arc(20, 20, 14, 0, Math.PI * 2);
                    ctx.strokeStyle = this.baseColor;
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                }

                // 2. Icon Path Logic
                ctx.strokeStyle = this.baseColor;
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                if (this.type === 'red') {
                    // Question Mark
                    // Use different path for Grid vs Swarm Large based on reference
                    if (isGrid) {
                        ctx.beginPath();
                        ctx.moveTo(14, 6);
                        ctx.bezierCurveTo(14, 2, 26, 2, 26, 9);
                        ctx.bezierCurveTo(26, 13, 20, 14, 20, 18);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(20, 22);
                        ctx.lineTo(20, 23);
                        ctx.stroke();
                    } else {
                        // Swarm variant paths
                        ctx.beginPath();
                        ctx.moveTo(17, 17);
                        ctx.bezierCurveTo(17, 14, 23, 14, 23, 17);
                        ctx.bezierCurveTo(23, 20, 20, 20.5, 20, 23);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.lineWidth = 4;
                        ctx.moveTo(20, 27);
                        ctx.lineTo(20, 27.1);
                        ctx.stroke();
                    }
                } else if (this.type === 'green') {
                    // Play Triangle (Always borderless)
                    ctx.beginPath();
                    ctx.moveTo(14, 12);
                    ctx.lineTo(30, 20);
                    ctx.lineTo(14, 28);
                    ctx.closePath();
                    ctx.stroke();
                } else {
                    // Checkmark
                    const drawCheck = (color: string, width: number) => {
                        ctx.beginPath();
                        ctx.strokeStyle = color;
                        ctx.lineWidth = width;
                        ctx.moveTo(16, 20);
                        ctx.lineTo(20, 24);
                        ctx.lineTo(33, 9);
                        ctx.stroke();
                    };

                    if (showCircle) {
                        // Mask: Thicker stroke in background color
                        drawCheck(COLORS.bg, 8);
                        // Visual: Actual checkmark
                        drawCheck(this.baseColor, 3);
                    } else {
                        drawCheck(this.baseColor, 2.5);
                    }
                }

                ctx.restore();
            }

            update() {
                const mode = backgroundSettings.particleEffect;
                const RADIUS = CONFIG.mouseRadius;

                if (mode === 'magnetic' || mode === 'orbit') {
                    if (isMouseDown && mouse.active) {
                        const dx = mouse.x - this.x;
                        const dy = mouse.y - this.y;
                        if (Math.sqrt(dx * dx + dy * dy) < 150) {
                            this.captured = true;
                        }
                    } else {
                        this.captured = false;
                    }

                    let targetX, targetY;
                    if (this.captured && mouse.active) {
                        if (mode === 'orbit') {
                            this.orbitAngle += 0.05;
                            const orbitR = 35;
                            targetX = mouse.x + Math.cos(this.orbitAngle + this.cx * 0.1) * orbitR;
                            targetY = mouse.y + Math.sin(this.orbitAngle + this.cy * 0.1) * orbitR;
                        } else {
                            targetX = mouse.x;
                            targetY = mouse.y;
                        }
                    } else {
                        targetX = this.cx;
                        targetY = this.cy;
                    }

                    const speed = this.captured ? this.trailSpeed : 0.03;
                    this.x += (targetX - this.x) * speed;
                    this.y += (targetY - this.y) * speed;
                } else if (mode === 'swarm_small' || mode === 'swarm_large' || mode === 'gravity') {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.rot += this.rotSpeed;

                    if (mouse.active) {
                        const dx = this.x - mouse.x;
                        const dy = this.y - mouse.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        if (dist < RADIUS) {
                            const force = (RADIUS - dist) / RADIUS;
                            const ease = force * force;
                            const angle = Math.atan2(dy, dx);

                            if (isMouseDown) {
                                const push = ease * 5.0;
                                this.x += Math.cos(angle) * push;
                                this.y += Math.sin(angle) * push;
                            } else {
                                const push = ease * -2.0;
                                this.x += Math.cos(angle) * push;
                                this.y += Math.sin(angle) * push;
                            }
                            this.rot += 1;
                        }
                    }

                    // Wrap
                    if (this.x < -50) this.x = width + 50;
                    if (this.x > width + 50) this.x = -50;
                    if (this.y < -50) this.y = height + 50;
                    if (this.y > height + 50) this.y = -50;
                } else {
                    // Grid Mode
                    const dx = mouse.x - this.cx;
                    const dy = mouse.y - this.cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (mouse.active && dist < RADIUS) {
                        const force = (RADIUS - dist) / RADIUS;
                        const ease = force * force;
                        const angle = Math.atan2(dy, dx);
                        const pull = ease * 12;
                        this.x = this.cx + Math.cos(angle) * pull;
                        this.y = this.cy + Math.sin(angle) * pull;
                        this.rot = ease * 45;
                    } else {
                        this.x = this.cx;
                        this.y = this.cy;
                        this.rot = 0;
                    }
                }
            }
        }

        function drawConnections() {
            if (!ctx || backgroundSettings.particleEffect !== 'gravity') return;

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < CONFIG.connectDistance) {
                        const opacity = (1 - dist / CONFIG.connectDistance) * 0.5 * backgroundSettings.particleOpacity;
                        ctx.beginPath();
                        ctx.strokeStyle = particles[i].baseColor;
                        ctx.globalAlpha = opacity;
                        ctx.lineWidth = 1;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                        ctx.globalAlpha = 1.0;
                    }
                }
            }

            if (mouse.active) {
                for (let i = 0; i < particles.length; i++) {
                    const dx = mouse.x - particles[i].x;
                    const dy = mouse.y - particles[i].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < CONFIG.mouseRadius) {
                        const opacity = (1 - dist / CONFIG.mouseRadius) * 0.4 * backgroundSettings.particleOpacity;
                        ctx.beginPath();
                        ctx.strokeStyle = particles[i].baseColor;
                        ctx.globalAlpha = opacity;
                        ctx.lineWidth = 1;
                        ctx.moveTo(mouse.x, mouse.y);
                        ctx.lineTo(particles[i].x, particles[i].y);
                        ctx.stroke();
                        ctx.globalAlpha = 1.0;
                    }
                }
            }
        }

        function init() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;

            particles = [];
            const mode = backgroundSettings.particleEffect;

            if (mode === 'swarm_small' || mode === 'swarm_large' || mode === 'gravity') {
                const count = mode === 'gravity' ? CONFIG.gravityCount : CONFIG.swarmCount;
                for (let i = 0; i < count; i++) {
                    particles.push(new Particle(Math.random() * width, Math.random() * height, mode.startsWith('swarm'), mode === 'gravity'));
                }
            } else {
                const cols = Math.ceil(width / CONFIG.gridSize);
                const rows = Math.ceil(height / CONFIG.gridSize);
                for (let i = 0; i < cols; i++) {
                    for (let j = 0; j < rows; j++) {
                        const cx = i * CONFIG.gridSize + CONFIG.gridSize / 2;
                        const cy = j * CONFIG.gridSize + CONFIG.gridSize / 2;
                        particles.push(new Particle(cx, cy));
                    }
                }
            }
        }

        let animationFrameId: number;
        function animateLoop() {
            ctx!.clearRect(0, 0, width, height);

            drawConnections();
            particles.forEach(p => {
                p.update();
                p.draw();
            });

            animationFrameId = requestAnimationFrame(animateLoop);
        }

        const handleResize = () => init();
        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
            mouse.active = true;
        };
        const handleMouseDown = () => { isMouseDown = true; };
        const handleMouseUp = () => { isMouseDown = false; };
        const handleMouseLeave = () => { mouse.active = false; isMouseDown = false; };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mouseleave', handleMouseLeave);

        init();
        animateLoop();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mouseleave', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, [backgroundSettings]);

    return (
        <canvas
            ref={canvasRef}
            id="bg-canvas"
            className="fixed top-0 left-0 w-full h-full pointer-events-none"
            style={{
                zIndex: 0,
                backgroundColor: backgroundSettings.bgColor
            }}
        />
    );
};

export default SettingsManager;
