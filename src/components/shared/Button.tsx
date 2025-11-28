import React, { ReactNode } from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

interface ButtonProps {
    variant?: 'primary' | 'secondary' | 'tertiary' | 'icon';
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
    const baseClasses = 'font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center';

    const variantClasses = {
        primary: 'bg-brand-accent text-white hover:bg-blue-600 active:scale-[0.98] focus:ring-blue-500/20',
        secondary: 'border-[3px] border-gray-200 dark:border-gray-700 text-brand-textDarkPrimary dark:text-brand-textPrimary hover:border-brand-accent hover:text-brand-accent focus:ring-brand-accent/10',
        tertiary: 'text-brand-textDarkPrimary dark:text-brand-textPrimary hover:underline decoration-2 focus:ring-gray-500/20',
        icon: 'text-gray-500 hover:text-brand-accent hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500/20'
    };

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg'
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
