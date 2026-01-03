import React, { ReactNode, useState } from 'react';

/**
 * Enhanced Tooltip Component
 * 
 * Implements:
 * - Paradox of the Active User: Contextual help without requiring manual reading
 * - Tesler's Law: Absorbs complexity by providing inline guidance
 */

interface TooltipProps {
    content: string | ReactNode;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number; // Delay before showing (ms)
    maxWidth?: string;
    variant?: 'default' | 'info' | 'warning';
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top',
    delay = 200,
    maxWidth = '200px',
    variant = 'default'
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const variantClasses = {
        default: 'bg-[var(--color-bg-tile-alt)] text-brand-textPrimary border border-[var(--color-border-subtle)]',
        info: 'bg-brand-accent/95 text-brand-textPrimary',
        warning: 'bg-brand-accent/80 text-brand-textPrimary'
    };

    const handleMouseEnter = () => {
        const id = setTimeout(() => setIsVisible(true), delay);
        setTimeoutId(id);
    };

    const handleMouseLeave = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
        setIsVisible(false);
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
        >
            {children}
            <div
                className={`
                    absolute z-tooltip
                    transition-all duration-200
                    ${positionClasses[position]}
                    ${isVisible ? 'visible opacity-100' : 'invisible opacity-0'}
                    px-3 py-2 text-xs font-medium rounded-lg shadow-layered
                    ${variantClasses[variant]}
                    backdrop-blur-sm pointer-events-none
                `}
                style={{ maxWidth }}
                role="tooltip"
            >
                {content}
                {/* Arrow */}
                <div className={`
                    absolute w-2 h-2 rotate-45 border-r border-b border-[var(--color-border-subtle)]
                    ${variant === 'default' ? 'bg-[var(--color-bg-tile-alt)]' :
                        'bg-brand-accent/95'}
                    ${position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2 rotate-45 border-r border-b' : ''}
                    ${position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 -rotate-135 border-r border-b' : ''}
                    ${position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2 -rotate-45 border-r border-b' : ''}
                    ${position === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2 rotate-135 border-r border-b' : ''}
                `} />
            </div>
        </div>
    );
};

/**
 * Info Tooltip - For helpful hints about features
 */
interface InfoTooltipProps {
    content: string | ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, position = 'top' }) => (
    <Tooltip content={content} position={position} variant="info">
        <button
            className="inline-flex items-center justify-center w-4 h-4 text-xs text-brand-accent bg-brand-accent/10 rounded-full hover:bg-brand-accent/20 transition-colors"
            aria-label="More information"
        >
            ?
        </button>
    </Tooltip>
);

/**
 * Feature Spotlight - Highlights new or important features
 */
interface FeatureSpotlightProps {
    children: ReactNode;
    message: string;
    isNew?: boolean;
}

export const FeatureSpotlight: React.FC<FeatureSpotlightProps> = ({
    children,
    message,
    isNew = true
}) => (
    <div className="relative">
        {children}
        {isNew && (
            <>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-brand-accent rounded-full animate-pulse" />
                <Tooltip content={message} position="top">
                    <span className="absolute -top-1 -right-1 w-3 h-3" />
                </Tooltip>
            </>
        )}
    </div>
);
