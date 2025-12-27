import React, { ReactNode, useId } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    hideHeader?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 'md',
    hideHeader = false
}) => {
    const titleId = useId();

    const widthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl'
    };

    const modalRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                return;
            }

            if (e.key === 'Tab' && modalRef.current) {
                const focusableElements = modalRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                const firstElement = focusableElements[0] as HTMLElement;
                const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        // Focus the first focusable element when modal opens
        requestAnimationFrame(() => {
            if (modalRef.current) {
                const focusableElements = modalRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusableElements.length > 0) {
                    (focusableElements[0] as HTMLElement).focus();
                }
            }
        });

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
            onClick={onClose}
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={`${widthClasses[maxWidth]} w-full bg-brand-lightSurface dark:bg-bg-tile rounded-2xl border border-slate-200 dark:border-white/5 shadow-layered transition-transform duration-200 absolute inset-0 m-auto h-fit max-h-[90vh] overflow-y-auto`}
                onClick={e => e.stopPropagation()}
            >
                {!hideHeader && (
                    <div className="flex items-center justify-between px-6 pt-6 pb-4">
                        <h2 id={titleId} className="text-fluid-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-300 transition-float hover:-translate-y-0.5 shadow-none hover:shadow-layered-sm focus:outline-none focus:ring-2 focus:ring-brand-accent/20 active:scale-95 select-none border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}
                <div className={hideHeader ? 'p-6' : 'px-6 pb-6'}>
                    {children}
                </div>
            </div>
        </div>
    );
};
