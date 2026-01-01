import React, { useEffect, useState, useCallback } from 'react';
import './logo.css';
import { LogoSvg } from './LogoSvg';

interface LogoCycleOnceProps {
    /** Width and height in pixels (default: 280) */
    size?: number;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Cycle Once logo - Sequential build animation that plays once and stops static.
 * Great for page load or onboarding.
 */
export const LogoCycleOnce: React.FC<LogoCycleOnceProps> = ({
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
            className={`logo-container logo-cycle-once ${className}`}
            style={{ width: size, height: size }}
        >
            <LogoSvg showBeams={false} />
        </div>
    );
};

export default LogoCycleOnce;
