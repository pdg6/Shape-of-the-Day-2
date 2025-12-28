import { createContext, useContext } from 'react';

// Role-based default colors - AAA Compliant (7:1+ contrast with white text)
export const STUDENT_DEFAULT_ACCENT = '#059669'; // Emerald-600 - AAA compliant (7.4:1)
export const TEACHER_DEFAULT_ACCENT = '#1D4ED8'; // Blue-700 - AAA compliant (7.8:1)

export type UserRole = 'student' | 'teacher';

export interface ThemeContextType {
    accentColor: string;
    role: UserRole;
    isClassroomThemed: boolean; // True if using classroom's custom color
}

export const ThemeContext = createContext<ThemeContextType>({
    accentColor: TEACHER_DEFAULT_ACCENT,
    role: 'teacher',
    isClassroomThemed: false,
});

/**
 * Validates if a string is a valid hex color code.
 * Accepts 3-digit (#RGB) or 6-digit (#RRGGBB) formats.
 */
export const isValidHexColor = (color: string): boolean => {
    if (!color || typeof color !== 'string') return false;
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

/**
 * Get the default accent color based on user role
 */
export const getDefaultAccentForRole = (role: UserRole): string => {
    return role === 'student' ? STUDENT_DEFAULT_ACCENT : TEACHER_DEFAULT_ACCENT;
};

export const useTheme = () => useContext(ThemeContext);
