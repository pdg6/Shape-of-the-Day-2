import React, { ReactNode } from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'outline-primary' | 'outline-danger' | 'soft';
    size?: 'sm' | 'md' | 'lg';
    icon?: LucideIcon;
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    disabled?: boolean;
    active?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit';
    children?: ReactNode;
    className?: string;
    title?: string;
    'aria-label'?: string;
}

/**
 * Button Component
 * 
 * Standard elevated button with shadow and lift dynamics.
 * For flat/ghost buttons, use GhostButton instead.
 * 
 * Active state applies brand accent color and horizon highlight border.
 */
export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    active = false,
    onClick,
    type = 'button',
    children,
    className = '',
    title,
    'aria-label': ariaLabel
}) => {
    const baseClasses = 'font-bold rounded-xl transition-float focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center active:scale-95 select-none cursor-pointer shadow-layered hover:shadow-layered-lg button-lift-dynamic';

    const variantClasses = {
        primary: 'bg-tile text-brand-textPrimary border border-border-subtle hover:bg-tile-hover hover:border-brand-accent/50',
        secondary: 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20 hover:bg-brand-accent/20 hover:border-brand-accent/40',
        'outline-primary': 'border border-brand-accent bg-transparent text-brand-accent hover:bg-brand-accent/10',
        'outline-danger': 'border border-[var(--color-danger,#ef4444)] bg-transparent text-[var(--color-danger,#ef4444)] hover:bg-[var(--color-danger,#ef4444)]/10',
        'soft': 'border border-brand-accent/30 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20'
    };

    // Active state: Horizon highlight border + inset shadow (icon color handled separately)
    const activeClasses = active
        ? '!border-t-[0.5px] !border-t-brand-accent [box-shadow:var(--active-inset-shadow),var(--shadow-layered)]'
        : '';

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

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variantClasses[variant]} ${activeClasses} ${sizeClasses[size]} ${className}`}
            title={title}
            aria-label={ariaLabel || title}
            aria-pressed={active ? "true" : "false"}
        >
            {loading ? (
                <Loader2 className="animate-spin mr-2" size={iconSizeClasses[size]} />
            ) : (
                <>
                    {Icon && iconPosition === 'left' && (
                        <Icon className={`${children ? "mr-2" : ""} ${active ? "text-brand-accent" : ""}`} size={iconSizeClasses[size]} />
                    )}
                    {children}
                    {Icon && iconPosition === 'right' && (
                        <Icon className={`${children ? "ml-2" : ""} ${active ? "text-brand-accent" : ""}`} size={iconSizeClasses[size]} />
                    )}
                </>
            )}
        </button>
    );
};
