import React, { useEffect, useState, useCallback } from 'react';
import './logo.css';
import { LogoSvg } from './LogoSvg';

interface LogoBeamProps {
    /** Width and height in pixels (default: 280) */
    size?: number;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Beam (Standard) logo - Glowing beams loop around cards, icons draw with glow.
 * Best for hero sections or loading states.
 */
export const LogoBeam: React.FC<LogoBeamProps> = ({
    size = 280,
    className = ''
}) => {
    const [animKey, setAnimKey] = useState(0);

    // Reset animation on mount to ensure it plays from start
    const resetAnimation = useCallback(() => {
        setAnimKey(k => k + 1);
    }, []);

    useEffect(() => {
        resetAnimation();
    }, [resetAnimation]);

    return (
        <div
            key={animKey}
            className={`logo-container logo-beam-mode ${className}`}
            style={{ width: size, height: size }}
        >
            <LogoSvg showBeams={true} />
        </div>
    );
};

export default LogoBeam;
