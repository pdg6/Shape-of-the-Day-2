import React, { useEffect, useState, useCallback } from 'react';
import './logo.css';
import { LogoSvg } from './LogoSvg';

interface LogoTraceProps {
    /** Width and height in pixels (default: 280) */
    size?: number;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Trace logo - Blueprint-style animation where borders trace, then icons draw.
 * Elegant for reveal animations.
 */
export const LogoTrace: React.FC<LogoTraceProps> = ({
    size = 280,
    className = ''
}) => {
    const [animKey, setAnimKey] = useState(0);

    const resetAnimation = useCallback(() => {
        setAnimKey(k => k + 1);
    }, []);

    useEffect(() => {
        resetAnimation();
    }, [resetAnimation]);

    return (
        <div
            key={animKey}
            className={`logo-container logo-trace ${className}`}
            style={{ width: size, height: size }}
        >
            <LogoSvg showBeams={false} />
        </div>
    );
};

export default LogoTrace;
