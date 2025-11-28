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
        absolute z-20 invisible group-hover:visible opacity-0 group-hover:opacity-100
        transition-all duration-200 ${positionClasses[position]}
        px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md whitespace-nowrap
        pointer-events-none
      `}>
                {content}
                {/* Arrow */}
                <div className={`
          absolute w-2 h-2 bg-gray-900 rotate-45
          ${position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : ''}
          ${position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : ''}
          ${position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' : ''}
          ${position === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2' : ''}
        `} />
            </div>
        </div>
    );
};
