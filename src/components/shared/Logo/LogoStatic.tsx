import React from 'react';
import './logo.css';
import { LogoSvg } from './LogoSvg';

interface LogoStaticProps {
    /** Width and height in pixels (default: 280) */
    size?: number;
    /** Additional CSS classes */
    className?: string;
}

/**
 * Static logo - Clean, resting state with no animation.
 * Use for headers, favicons, or static branding contexts.
 */
export const LogoStatic: React.FC<LogoStaticProps> = ({
    size = 280,
    className = ''
}) => {
    return (
        <div
            className={`logo-container logo-static ${className}`}
            style={{ width: size, height: size }}
        >
            <LogoSvg showBeams={false} />
        </div>
    );
};

export default LogoStatic;
