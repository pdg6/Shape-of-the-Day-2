import React, { useEffect, useState, useCallback } from 'react';
import './logo.css';
import { LogoSvg } from './LogoSvg';

interface LogoSlideProps {
    /** Width and height in pixels (default: 280) */
    size?: number;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Slide logo - Elements slide in from left with staggered timing.
 * Modern entrance animation.
 */
export const LogoSlide: React.FC<LogoSlideProps> = ({
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
            className={`logo-container logo-slide ${className}`}
            style={{ width: size, height: size }}
        >
            <LogoSvg showBeams={false} />
        </div>
    );
};

export default LogoSlide;
