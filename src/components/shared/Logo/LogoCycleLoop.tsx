import React, { useEffect, useState, useCallback } from 'react';
import './logo.css';
import { LogoSvg } from './LogoSvg';

interface LogoCycleLoopProps {
    /** Width and height in pixels (default: 280) */
    size?: number;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Cycle Loop logo - Sequential build animation that loops infinitely.
 * Cards and icons appear in sequence, then reset.
 */
export const LogoCycleLoop: React.FC<LogoCycleLoopProps> = ({
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
            className={`logo-container logo-cycle-loop ${className}`}
            style={{ width: size, height: size }}
        >
            <LogoSvg showBeams={false} />
        </div>
    );
};

export default LogoCycleLoop;
