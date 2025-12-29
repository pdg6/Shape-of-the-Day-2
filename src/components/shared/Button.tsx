import React, { ReactNode } from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'tertiary' | 'icon' | 'ghost' | 'ghost-danger' | 'outline-primary' | 'outline-danger' | 'soft';
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

export const Button: React.FC<ButtonProps> = ({
    variant = 'primary',
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
    const baseClasses = 'font-bold rounded-xl transition-float focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center active:scale-95 select-none cursor-pointer shadow-layered-sm button-lift-dynamic';

    const variantClasses = {
        primary: 'bg-brand-accent/10 text-brand-accent border border-brand-accent/20 hover:bg-brand-accent/20 hover:border-brand-accent/40',
        secondary: 'background-glass bg-[var(--color-bg-tile-alt)]/50 text-brand-textPrimary border border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-tile-hover)] hover:border-[var(--color-border-strong)]',
        tertiary: 'text-brand-textPrimary hover:text-brand-accent transition-colors shadow-none hover:shadow-none hover:-translate-y-0',
        icon: 'text-brand-textSecondary hover:text-brand-accent transition-all hover:bg-brand-accent/5 focus:text-brand-accent shadow-none hover:shadow-none hover:-translate-y-0',
        ghost: 'border border-transparent text-brand-accent hover:bg-brand-accent/5 focus:bg-brand-accent/5 shadow-none hover:shadow-none hover:-translate-y-0',
        'ghost-danger': 'border border-transparent text-red-500 hover:bg-red-500/5 focus:bg-red-500/5 shadow-none hover:shadow-none hover:-translate-y-0',
        'outline-primary': 'border border-brand-accent bg-transparent text-brand-accent hover:bg-brand-accent/10 focus:bg-brand-accent/10',
        'outline-danger': 'border border-red-500 bg-transparent text-red-500 hover:bg-red-500/10 focus:bg-red-500/10',
        'soft': 'border border-brand-accent/30 bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 focus:bg-brand-accent/20'
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

    // Icon buttons have specific padding
    const finalSizeClasses = variant === 'icon' ? 'p-2' : sizeClasses[size];

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
