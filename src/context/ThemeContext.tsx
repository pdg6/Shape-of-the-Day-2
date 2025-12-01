import React, { createContext, useContext, useEffect } from 'react';
import { useClassStore } from '../store/classStore';

const DEFAULT_ACCENT_COLOR = '#2563EB'; // Blue

interface ThemeContextType {
    accentColor: string;
}

const ThemeContext = createContext<ThemeContextType>({
    accentColor: DEFAULT_ACCENT_COLOR,
});

/**
 * Validates if a string is a valid hex color code.
 * Accepts 3-digit (#RGB) or 6-digit (#RRGGBB) formats.
 */
const isValidHexColor = (color: string): boolean => {
    if (!color || typeof color !== 'string') return false;
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { classrooms, currentClassId } = useClassStore();

    // Find the current class and its color
    const currentClass = classrooms.find(c => c.id === currentClassId);

    // Validate and default to blue if no class, no color, or invalid color
    const rawColor = currentClass?.color;
    const accentColor = rawColor && isValidHexColor(rawColor) ? rawColor : DEFAULT_ACCENT_COLOR;

    useEffect(() => {
        const root = document.documentElement;
        // Set CSS variable for Tailwind v4
        root.style.setProperty('--color-brand-accent', accentColor);
    }, [accentColor]);

    return (
        <ThemeContext.Provider value={{ accentColor }}>
            {children}
        </ThemeContext.Provider>
    );
};
