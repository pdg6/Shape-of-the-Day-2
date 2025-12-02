import { ReactNode } from 'react';

interface AccordionProps {
    isOpen: boolean;
    children: ReactNode;
    className?: string;
}

/**
 * Accordion component using CSS Grid for smooth height animation.
 * Uses the grid-template-rows: 0fr -> 1fr technique for animating to auto height.
 */
export const Accordion: React.FC<AccordionProps> = ({ 
    isOpen, 
    children,
    className = ''
}) => {
    return (
        <div 
            className={`
                grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
                ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
                ${className}
            `}
        >
            <div className="min-h-0 overflow-hidden">
                {children}
            </div>
        </div>
    );
};

export default Accordion;
