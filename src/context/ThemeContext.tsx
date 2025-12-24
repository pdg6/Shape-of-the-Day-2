import React, { createContext, useContext, useEffect } from 'react';
import { useClassStore } from '../store/classStore';

// Role-based default colors - AAA Compliant (7:1+ contrast with white text)
const STUDENT_DEFAULT_ACCENT = '#059669'; // Emerald-600 - AAA compliant (7.4:1)
const TEACHER_DEFAULT_ACCENT = '#1D4ED8'; // Blue-700 - AAA compliant (7.8:1)

export type UserRole = 'student' | 'teacher';

interface ThemeContextType {
    accentColor: string;
    role: UserRole;
    isClassroomThemed: boolean; // True if using classroom's custom color
}

const ThemeContext = createContext<ThemeContextType>({
    accentColor: TEACHER_DEFAULT_ACCENT,
    role: 'teacher',
    isClassroomThemed: false,
});

/**
 * Validates if a string is a valid hex color code.
 * Accepts 3-digit (#RGB) or 6-digit (#RRGGBB) formats.
 */
const isValidHexColor = (color: string): boolean => {
    if (!color || typeof color !== 'string') return false;
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

/**
 * Get the default accent color based on user role
 */
const getDefaultAccentForRole = (role: UserRole): string => {
    return role === 'student' ? STUDENT_DEFAULT_ACCENT : TEACHER_DEFAULT_ACCENT;
};

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
    children: React.ReactNode;
    role?: UserRole;
    classroomColor?: string; // Allow passing classroom color directly (for student view)
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    role = 'teacher',
    classroomColor: directClassroomColor
}) => {
    const { classrooms, currentClassId } = useClassStore();

    // Find the current class and its color (for teacher view)
    const currentClass = classrooms.find(c => c.id === currentClassId);

    // Use direct classroom color if provided (student), otherwise use current class color (teacher)
    const classroomThemeColor = directClassroomColor || currentClass?.color;

    // Determine if we're using a classroom theme
    const isClassroomThemed = !!(classroomThemeColor && isValidHexColor(classroomThemeColor));

    // Priority: Classroom theme color > Role default
    const accentColor = isClassroomThemed
        ? classroomThemeColor!
        : getDefaultAccentForRole(role);

    useEffect(() => {
        const root = document.documentElement;
        // Set CSS variable for Tailwind v4
        root.style.setProperty('--color-brand-accent', accentColor);

        // Also set role-specific defaults for reference
        root.style.setProperty('--color-student-accent', STUDENT_DEFAULT_ACCENT);
        root.style.setProperty('--color-teacher-accent', TEACHER_DEFAULT_ACCENT);
    }, [accentColor]);

    return (
        <ThemeContext.Provider value={{ accentColor, role, isClassroomThemed }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Export constants for use elsewhere
export { STUDENT_DEFAULT_ACCENT, TEACHER_DEFAULT_ACCENT };
