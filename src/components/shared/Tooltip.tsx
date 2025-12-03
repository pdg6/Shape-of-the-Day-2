import React, { ReactNode } from 'react';

interface TooltipProps {
    content: string;
    children: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({
    content,
    children,
    position = 'top'
}) => {
    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    return (
        <div className="group relative inline-block">
            {children}
            <div className={`
                absolute z-tooltip invisible group-hover:visible opacity-0 group-hover:opacity-100
                transition-all duration-200 ${positionClasses[position]}
                px-3 py-1.5 text-xs font-semibold text-white bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-lg whitespace-nowrap
                pointer-events-none
            `}>
                {content}
                {/* Arrow */}
                <div className={`
                    absolute w-2 h-2 bg-gray-900/95 rotate-45
                    ${position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : ''}
                    ${position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : ''}
                    ${position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' : ''}
                    ${position === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2' : ''}
                `} />
            </div>
        </div>
    );
};
