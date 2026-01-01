import React from 'react';

interface LogoSvgProps {
    showBeams?: boolean;
}

/**
 * Base SVG structure shared by all logo variants.
 * Contains the 3 card groups (red, green, blue) with their icons.
 */
export const LogoSvg: React.FC<LogoSvgProps> = ({ showBeams = false }) => {
    return (
        <svg viewBox="0 0 220 200">
            {/* Red Group */}
            <g className="logo-group-red" style={{ color: 'var(--glow-red)' }}>
                {showBeams && (
                    <path
                        d="M 142 10 L 18 10 Q 10 10 10 18 L 10 52 Q 10 60 18 60 L 124 60"
                        className="logo-beam logo-anim-red"
                    />
                )}
                <rect
                    x="10"
                    y="10"
                    width="140"
                    height="50"
                    rx="8"
                    ry="8"
                    className="logo-path-base logo-card-red"
                />
                {/* Red Circle: Clockwise from top */}
                <path
                    d="M 128 23 A 12 12 0 0 1 128 47 A 12 12 0 0 1 128 23"
                    className="logo-check-part logo-check-visual logo-anim-stuck-circle"
                />
                <path
                    d="M 125.09 32 A 3 3 0 0 1 130.92 33 C 130.92 35 127.92 36 127.92 36 M 128 40 L 128.01 40"
                    className="logo-check-part logo-check-visual logo-anim-stuck-hook"
                />
            </g>

            {/* Green Group */}
            <g className="logo-group-green" style={{ color: 'var(--glow-green)' }}>
                {showBeams && (
                    <path
                        d="M 75 70 L 172 70 Q 180 70 180 78 L 180 112 Q 180 120 172 120 L 110 120"
                        className="logo-beam logo-anim-green"
                    />
                )}
                <rect
                    x="40"
                    y="70"
                    width="140"
                    height="50"
                    rx="8"
                    ry="8"
                    className="logo-path-base logo-card-green"
                />
                <path
                    d="M 152 86 L 168 95 L 152 104 L 152 86"
                    className="logo-check-part logo-check-visual logo-anim-play-icon"
                    style={{ strokeLinejoin: 'round' }}
                />
            </g>

            {/* Blue Group */}
            <g className="logo-group-blue" style={{ color: 'var(--glow-blue)' }}>
                {showBeams && (
                    <path
                        d="M 154 130 L 78 130 Q 70 130 70 138 L 70 172 Q 70 180 78 180 L 202 180"
                        className="logo-beam logo-anim-blue"
                    />
                )}
                <rect
                    x="70"
                    y="130"
                    width="140"
                    height="50"
                    rx="8"
                    ry="8"
                    className="logo-path-base logo-card-blue"
                />
                {/* Blue Circle: Clockwise from top */}
                <path
                    d="M 188 143 A 12 12 0 0 1 188 167 A 12 12 0 0 1 188 143"
                    className="logo-check-part logo-check-visual logo-anim-circle"
                />
                <path
                    d="M 184 155 L 188 159 L 199 144"
                    className="logo-check-part logo-check-mask logo-anim-mask"
                />
                <path
                    d="M 184 155 L 188 159 L 199 144"
                    className="logo-check-part logo-check-visual logo-anim-check"
                />
            </g>
        </svg>
    );
};

export default LogoSvg;
