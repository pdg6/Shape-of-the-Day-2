export const spacing = {
    micro: '0.5rem',  // 8px
    base: '1rem',     // 16px
    macro: '1.5rem',  // 24px
}

export const borderRadius = {
    base: '0.75rem',  // 12px - rounded-xl
    card: '0.75rem',
    button: '0.75rem',
}

export const borderWidth = {
    surface: '3px',   // Cards, major surfaces
    element: '2px',   // Interactive elements
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
