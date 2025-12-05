export const spacing = {
    micro: '0.5rem',  // 8px
    base: '1rem',     // 16px
    macro: '1.5rem',  // 24px
}

/**
 * Border Radius Hierarchy:
 * - rounded-xl (0.75rem/12px): Container/Card level (outermost)
 * - rounded-lg (0.5rem/8px): Nested elements within cards
 * - rounded-md (0.375rem/6px): Buttons, icons, interactive elements
 * - rounded-full: Pills, badges, avatars
 */
export const borderRadius = {
    container: '0.75rem',  // 12px - rounded-xl - Cards, modals, major surfaces
    nested: '0.5rem',      // 8px - rounded-lg - Elements inside cards
    interactive: '0.375rem', // 6px - rounded-md - Buttons, icons
}

/**
 * Border Width:
 * - Standardized to 2px across all elements
 */
export const borderWidth = {
    default: '2px',   // Standard border width for all elements
}

export const zIndex = {
    base: 0,
    dropdown: 10,
    tooltip: 20,
    sidebar: 30,
    modal: 50,
    overlay: 100,
    toast: 200,
}

export const iconSize = {
    mini: 16,
    base: 20,
    large: 24,
    hero: 32,
}

export const duration = {
    fast: 150,
    base: 200,
    slow: 300,
}

// Theme colors - Role-based defaults
export const themeColors = {
    studentAccent: '#10B981',  // Emerald-500
    teacherAccent: '#3B82F6',  // Blue-500
    // Classroom theme colors (teacher selectable)
    classroomOptions: [
        '#3B82F6', // Blue (default teacher)
        '#10B981', // Emerald (default student)
        '#EF4444', // Red
        '#F59E0B', // Amber
        '#8B5CF6', // Purple
        '#EC4899', // Pink
        '#06B6D4', // Cyan
        '#F97316', // Orange
    ]
}
