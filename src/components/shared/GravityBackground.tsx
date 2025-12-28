import React, { useEffect, useRef } from 'react';
import { useClassStore } from '../../store/classStore';

/**
 * GravityBackground Component
 * 
 * An interactive canvas-based particle system.
 * Hover to attract particles, click to repel them.
 */
const GravityBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { backgroundTheme } = useClassStore();

    // Theme Definitions
    const THEMES = {
        '4c': { bg: '#0a0a0a', node: '#262626', line: '#262626' }, // Neutral
        '2a': { bg: '#050505', node: '#111111', line: '#111111' }, // Deep Cut
        '3a': { bg: '#080a0f', node: '#3b82f6', line: '#3b82f6' }, // Cyber
        '5a': { bg: '#f5f5f5', node: '#262626', line: '#262626' }, // Light Neutral
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const activeTheme = THEMES[backgroundTheme] || THEMES['4c'];

        const CONFIG = {
            particleCount: 30,
            connectDistance: 150,
            baseSpeed: 0.4,
            mouseRadius: 250,
            colors: {
                bg: activeTheme.bg,
                line: activeTheme.line,
                node: activeTheme.node,
            },
            physics: {
                attractStrength: 2.5,
                repelStrength: 10.0,
                friction: 0.98
            }
        };

        let width: number, height: number;
        let particles: Particle[] = [];
        const mouse = { x: null as number | null, y: null as number | null };
        let isMouseDown = false;

        // Helper to convert hex to rgb string "r, g, b"
        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ?
                `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
                '255, 255, 255';
        };

        const lineRgb = hexToRgb(CONFIG.colors.line);

        class Particle {
            x: number;
            y: number;
            dx: number;
            dy: number;
            size: number;
            color: string;

            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;

                const theta = Math.random() * Math.PI * 2;
                this.dx = Math.cos(theta);
                this.dy = Math.sin(theta);

                this.size = Math.random() * 2 + 1.5;
                this.color = CONFIG.colors.node;
            }

            update() {
                this.x += this.dx * CONFIG.baseSpeed;
                this.y += this.dy * CONFIG.baseSpeed;

                if (mouse.x !== null && mouse.y !== null) {
                    const dx = mouse.x - this.x;
                    const dy = mouse.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < CONFIG.mouseRadius) {
                        const forceDirectionX = dx / distance;
                        const forceDirectionY = dy / distance;
                        const force = (CONFIG.mouseRadius - distance) / CONFIG.mouseRadius;

                        if (isMouseDown) {
                            const strength = CONFIG.physics.repelStrength;
                            this.x -= forceDirectionX * force * strength;
                            this.y -= forceDirectionY * force * strength;
                        } else {
                            const strength = CONFIG.physics.attractStrength;
                            this.x += forceDirectionX * force * strength;
                            this.y += forceDirectionY * force * strength;
                        }
                    }
                }

                // Wrap around edges
                if (this.x < 0) this.x = width;
                if (this.x > width) this.x = 0;
                if (this.y < 0) this.y = height;
                if (this.y > height) this.y = 0;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        function init() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;

            particles = [];
            const particleLimit = width < 600 ? CONFIG.particleCount / 2 : CONFIG.particleCount;

            for (let i = 0; i < particleLimit; i++) {
                particles.push(new Particle());
            }
        }

        function drawConnections() {
            if (!ctx) return;
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < CONFIG.connectDistance) {
                        const opacity = 1 - (distance / CONFIG.connectDistance);
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(${lineRgb}, ${opacity * 0.5})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function drawMouseConnections() {
            if (!ctx || mouse.x === null || mouse.y === null) return;

            for (let i = 0; i < particles.length; i++) {
                const dx = mouse.x - particles[i].x;
                const dy = mouse.y - particles[i].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < CONFIG.mouseRadius) {
                    const opacity = 1 - (distance / CONFIG.mouseRadius);
                    ctx.beginPath();
                    const alpha = isMouseDown ? opacity : opacity * 0.7;
                    ctx.strokeStyle = `rgba(${lineRgb}, ${alpha})`;
                    ctx.lineWidth = 1;
                    ctx.moveTo(mouse.x, mouse.y);
                    ctx.lineTo(particles[i].x, particles[i].y);
                    ctx.stroke();
                }
            }
        }

        let animationFrameId: number;
        function animate() {
            if (!ctx) return;
            ctx.clearRect(0, 0, width, height);

            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
            }

            drawConnections();
            drawMouseConnections();

            animationFrameId = requestAnimationFrame(animate);
        }

        const handleResize = () => {
            init();
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const handleMouseDown = () => {
            isMouseDown = true;
        };

        const handleMouseUp = () => {
            isMouseDown = false;
        };

        const handleMouseLeave = () => {
            mouse.x = null;
            mouse.y = null;
            isMouseDown = false;
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches[0]) {
                mouse.x = e.touches[0].clientX;
                mouse.y = e.touches[0].clientY;
                isMouseDown = true;
            }
        };

        const handleTouchEnd = () => {
            mouse.x = null;
            mouse.y = null;
            isMouseDown = false;
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mouseleave', handleMouseLeave);
        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchend', handleTouchEnd);

        init();
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mouseleave', handleMouseLeave);
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
            cancelAnimationFrame(animationFrameId);
        };
    }, [backgroundTheme]); // Re-run when theme changes

    const activeTheme = THEMES[backgroundTheme] || THEMES['4c'];

    return (
        <canvas
            ref={canvasRef}
            id="bg-canvas"
            className="fixed top-0 left-0 w-full h-full pointer-events-none"
            style={{
                zIndex: 0,
                backgroundColor: activeTheme.bg
            }}
        />
    );
};

export default GravityBackground;
