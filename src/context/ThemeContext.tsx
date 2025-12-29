import React, { useEffect } from 'react';
import { useClassStore } from '../store/appSettings';
import {
    ThemeContext,
    UserRole,
    STUDENT_DEFAULT_ACCENT,
    TEACHER_DEFAULT_ACCENT,
    isValidHexColor,
    getDefaultAccentForRole
} from './theme-context';

export type { UserRole };

interface ThemeProviderProps {
    children: React.ReactNode;
    role?: UserRole;
    classroomColor?: string; // Allow passing classroom color directly (for student view)
}

/**
 * ThemeProvider Component
 * 
 * Manages the application's accent color theme and syncs it with CSS variables.
 * Logic is separated into theme-context.ts to enable Vite Fast Refresh.
 */
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
