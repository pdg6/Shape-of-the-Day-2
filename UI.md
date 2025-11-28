# UI Design System

This document outlines the standard UI patterns, animations, and color themes for the Shape of the Day application.

## Core Design Principles
- **Solid Surfaces:** Cards and tiles use solid backgrounds (`bg-brand-lightSurface` / `dark:bg-brand-darkSurface`) to ensure readability.
- **Interactive Borders:** Interactive elements (inputs, buttons, tiles) use a 2px border that changes color on hover and focus.
- **Micro-Animations:** Arrows and icons animate on hover (`translate-x-1`) to encourage interaction.

## Component Themes

### 1. Student Theme (Emerald Green)
Used for all student-facing components (`StudentView`, `StudentNameModal`, `JoinRoom`, etc.).

**Standard Classes:**
```css
/* Base Tile/Input/Button Style */
.student-tile {
  @apply w-full px-4 py-2.5 rounded-lg border-[3px] transition-all duration-200;
  /* Note: Using 3px borders for enhanced visibility in educational environments
     and improved accessibility across varied display quality (projectors, tablets, etc.) */
  @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
  @apply text-brand-textDarkPrimary dark:text-brand-textPrimary;
  @apply border-gray-200 dark:border-gray-600;
}

/* Hover State */
.student-tile:hover {
  @apply border-emerald-400;
}

/* Focus State */
.student-tile:focus-within,
.student-tile:focus {
  @apply outline-none border-emerald-500;
  @apply ring-2 ring-emerald-200 dark:ring-emerald-900/50;
}

/* Arrow Animation (requires 'group' on parent) */
.student-arrow {
  @apply transition-all duration-200;
}
.group:hover .student-arrow {
  @apply translate-x-1 text-emerald-500;
}
```

### 2. Teacher Theme (Blue)
Used for all teacher-facing dashboard tiles (`TaskManager`, `ClassPlanner`, etc.).

**Standard Classes:**
```css
/* Base Tile/Input/Button Style */
.teacher-tile {
  @apply w-full px-4 py-2.5 rounded-lg border-[3px] transition-all duration-200;
  /* Note: Using 3px borders for enhanced visibility in educational environments
     and improved accessibility across varied display quality (projectors, tablets, etc.) */
  @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
  @apply text-brand-textDarkPrimary dark:text-brand-textPrimary;
  @apply border-gray-200 dark:border-gray-600;
}

/* Hover State */
.teacher-tile:hover {
  @apply border-blue-400;
}

/* Focus State */
.teacher-tile:focus-within,
.teacher-tile:focus {
  @apply outline-none border-blue-500;
  @apply ring-2 ring-blue-200 dark:ring-blue-900/50;
}

/* Arrow Animation (requires 'group' on parent) */
.teacher-arrow {
  @apply transition-all duration-200;
}
.group:hover .teacher-arrow {
  @apply translate-x-1 text-blue-500;
}
```

## Usage Examples

**Student Button:**
```jsx
<button className="student-tile group relative text-center">
  Join Class
  <ArrowRight className="absolute right-4 top-1/2 -translate-y-1/2 student-arrow" />
</button>
```

**Teacher Tile:**
```jsx
<div className="teacher-tile group cursor-pointer">
  <h3>Task Manager</h3>
  <ArrowRight className="teacher-arrow" />
</div>
```
