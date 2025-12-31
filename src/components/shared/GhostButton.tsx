import React, { ReactNode } from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface GhostButtonProps {
    variant?: 'default' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit';
    children?: ReactNode;
    className?: string;
    title?: string;
    'aria-label'?: string;
}

/**
 * GhostButton Component
 * 
 * Flat button with no elevation or shadow - for toggles, menu items, and subtle actions.
 * Uses transition-colors for smooth color changes without triggering transform transitions.
 * 
 * When used without children (icon-only), uses compact p-2 padding.
 */
export const GhostButton: React.FC<GhostButtonProps> = ({
    variant = 'default',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    onClick,
    type = 'button',
    children,
    className = '',
    title,
    'aria-label': ariaLabel
}) => {
    const baseClasses = 'font-bold rounded-xl transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center active:scale-95 select-none cursor-pointer border border-transparent';

    const variantClasses = {
        default: 'text-brand-accent hover:bg-brand-accent/5 focus:bg-brand-accent/5',
        danger: 'text-red-500 hover:bg-red-500/5 focus:bg-red-500/5'
    };

    // Fitts's Law: Minimum 44x44px touch targets for accessibility
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm min-h-[36px] min-w-[36px]',
        md: 'px-5 py-2.5 text-base min-h-[44px] min-w-[44px]',
        lg: 'px-7 py-3.5 text-lg min-h-[52px] min-w-[52px]'
    };

    const iconSizeClasses = {
        sm: 16,
        md: 20,
        lg: 24
    };

    // Icon-only buttons use compact padding
    const isIconOnly = Icon && !children;
    const finalSizeClasses = isIconOnly ? 'p-2' : sizeClasses[size];

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variantClasses[variant]} ${finalSizeClasses} ${className}`}
            title={title}
            aria-label={ariaLabel || title}
        >
            {loading ? (
                <Loader2 className="animate-spin mr-2" size={iconSizeClasses[size]} />
            ) : (
                <>
                    {Icon && iconPosition === 'left' && (
                        <Icon className={children ? "mr-2" : ""} size={iconSizeClasses[size]} />
                    )}
                    {children}
                    {Icon && iconPosition === 'right' && (
                        <Icon className={children ? "ml-2" : ""} size={iconSizeClasses[size]} />
                    )}
                </>
            )}
        </button>
    );
};
