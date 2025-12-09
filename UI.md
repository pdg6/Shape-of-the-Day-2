# UI Design System

This document outlines the standard UI patterns, animations, color themes, and responsive utilities for the Shape of the Day application.

---

## Laws of UX Implementation

This application follows research-backed UX principles from [Laws of UX](https://lawsofux.com/). Key implementations:

### Performance & Perception
- **Doherty Threshold (<400ms):** Skeleton loaders provide instant feedback during data loading
- **Perceived Performance:** Progress indicators and animations keep users engaged during waits

### Cognitive Load Reduction  
- **Hick's Law:** Progressive disclosure reduces choices; smart defaults minimize decisions
- **Miller's Law:** Navigation limited to 3-5 primary items; content chunked appropriately
- **Choice Overload:** Forms use categorized sections and sensible defaults

### Touch & Interaction
- **Fitts's Law:** All interactive elements minimum 44×44px; adequate spacing between targets
- **Touch Targets:** Buttons, color pickers, status icons all meet accessibility guidelines

### Motivation & Completion
- **Goal-Gradient Effect:** Progress bars show completion status, motivating users near the finish
- **Zeigarnik Effect:** Incomplete task counts visible; "continue where you left off" patterns
- **Peak-End Rule:** Celebration animations on task completion create memorable positive endings

### Navigation & Memory
- **Serial Position Effect:** Most important nav items (Tasks, Sign Out) at first/last positions
- **Jakob's Law:** UI patterns follow established conventions users already know

### Familiarity & Guidance
- **Paradox of Active User:** Contextual tooltips and inline help instead of manuals
- **Tesler's Law:** System absorbs complexity; smart defaults reduce user burden

### Input Handling
- **Postel's Law:** Liberal input acceptance (spaces, dashes auto-stripped from codes)

### Visual Grouping (Gestalt)
- **Law of Common Region:** Related form fields grouped with borders/backgrounds
- **Law of Proximity:** Proper spacing creates visual groupings

---

## Core Design Principles

- **Solid Surfaces:** Cards and tiles use solid backgrounds (`bg-brand-lightSurface` / `dark:bg-brand-darkSurface`) to ensure readability.
- **Interactive Borders:** Interactive elements use a 2px border (`border-2`) that changes color on hover and focus.
- **Micro-Animations:** Arrows and icons animate on hover (`translate-x-1`) to encourage interaction.
- **Mobile-First Responsive:** All layouts adapt gracefully from mobile to desktop using fluid utilities.
- **Accessibility-First:** Skip links, ARIA attributes, and keyboard navigation are built-in.
- **Theme-Aware Colors:** Components adapt accent colors based on user role and classroom settings.
- **60-30-10 Color Rule:** Balanced color distribution for visual hierarchy and harmony.

---

## 60-30-10 Color Rule

The 60-30-10 rule is a classic design principle for creating balanced, visually appealing color schemes. It ensures a dominant color anchors the design while secondary and accent colors add interest without overwhelming.

### Distribution

| Percentage | Role | Application | Colors Used |
|------------|------|-------------|-------------|
| **60%** | Dominant | Backgrounds, large surfaces | `brand-lightSurface` / `brand-darkSurface`, `brand-light` / `brand-dark` |
| **30%** | Secondary | Cards, containers, borders, text | `gray-200` / `gray-700`, `brand-textDarkPrimary` / `brand-textPrimary` |
| **10%** | Accent | Interactive elements, highlights, CTAs | `brand-accent` (dynamic), status colors |

### Visual Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   60% DOMINANT - Background surfaces                        │
│   bg-brand-lightSurface / dark:bg-brand-darkSurface         │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                     │   │
│   │   30% SECONDARY - Cards, borders, text              │   │
│   │   border-gray-200 / dark:border-gray-700            │   │
│   │   text-brand-textDarkPrimary / dark:text-brand-     │   │
│   │   textPrimary                                       │   │
│   │                                                     │   │
│   │   ┌─────────────────────────────────────────────┐   │   │
│   │   │  10% ACCENT                                 │   │   │
│   │   │  border-brand-accent text-brand-accent      │   │   │
│   │   │  Buttons, active states, focus rings        │   │   │
│   │   └─────────────────────────────────────────────┘   │   │
│   │                                                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Guidelines

#### 60% Dominant (Backgrounds)
```jsx
// Page backgrounds
className="bg-brand-light dark:bg-brand-dark"

// Content area surfaces
className="bg-brand-lightSurface dark:bg-brand-darkSurface"
```

#### 30% Secondary (Structure & Text)
```jsx
// Card borders (inactive state)
className="border-2 border-gray-200 dark:border-gray-700"

// Primary text
className="text-brand-textDarkPrimary dark:text-brand-textPrimary"

// Secondary text
className="text-gray-500 dark:text-gray-400"

// Dividers and separators
className="border-b border-gray-200 dark:border-gray-800"
```

#### 10% Accent (Highlights & CTAs)
```jsx
// Active/focused states
className="border-brand-accent text-brand-accent"

// Focus rings
className="focus:ring-2 focus:ring-brand-accent/20"

// Primary buttons
className="bg-brand-accent text-white"

// Status indicators (stuck, question, etc.)
className="bg-red-500"  // Semantic, not theme-based
```

### Do's and Don'ts

**✅ Do:**
- Use accent color sparingly for maximum impact
- Reserve accent for interactive elements and important CTAs
- Let the dominant background breathe with whitespace
- Use secondary colors for structural elements

**❌ Don't:**
- Fill large areas with accent color
- Use accent for non-interactive decorative elements
- Overuse accent in a single view
- Mix multiple accent colors (use the single `brand-accent`)

### Example: Student Task Card

```jsx
{/* 60% - Card background (dominant) */}
<div className="bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl p-4
                {/* 30% - Border (secondary) */}
                border-2 border-gray-200 dark:border-gray-700">
  
  {/* 30% - Text (secondary) */}
  <h3 className="text-brand-textDarkPrimary dark:text-brand-textPrimary font-bold">
    Task Title
  </h3>
  <p className="text-gray-500 dark:text-gray-400 text-sm">
    Task description
  </p>
  
  {/* 10% - Interactive accent */}
  <button className="mt-3 px-4 py-2 rounded-lg
                     border-2 border-brand-accent text-brand-accent
                     hover:bg-brand-accent/10">
    Mark Complete
  </button>
</div>
```

---

## Theme Color System

### Role-Based Default Colors

The application uses different default accent colors based on user role:

| Role | Default Accent | Tailwind Classes | Hex Code |
|------|---------------|------------------|----------|
| **Student** | Emerald | `emerald-500`, `emerald-600` | `#10B981`, `#059669` |
| **Teacher** | Blue | `blue-500`, `blue-600` | `#3B82F6`, `#2563EB` |

### Classroom Theme Override

When a teacher sets a classroom theme color, that color becomes the accent for **both** teacher and student views within that classroom. This creates visual consistency and helps students identify which class they're in.

**Priority Order:**
1. Classroom theme color (if set) → Used as `--color-brand-accent`
2. Role default (Student = Emerald, Teacher = Blue)

### CSS Custom Property

The accent color is set dynamically via CSS custom property:

```css
:root {
    --color-brand-accent: #2563EB; /* Default: Teacher Blue */
}

/* Overridden by ThemeContext based on classroom.color */
```

### Theme-Aware Component Classes

Use these semantic classes that automatically adapt to the current theme:

```css
/* Accent-aware classes (use CSS variable) */
.accent-border { @apply border-[var(--color-brand-accent)]; }
.accent-text { @apply text-[var(--color-brand-accent)]; }
.accent-bg { @apply bg-[var(--color-brand-accent)]; }
.accent-ring { @apply ring-[var(--color-brand-accent)]/20; }
```

---

## Color Tokens

Defined in `index.css` under `@theme`:

```css
/* Brand Colors */
--color-brand-dark: #10100eff;
--color-brand-darkSurface: #10100eff;
--color-brand-light: #E5E5E5;
--color-brand-lightSurface: #FFFFFF;
--color-brand-accent: #2563EB;       /* Dynamic: Set by ThemeContext */

/* Role Default Colors */
--color-student-accent: #10B981;     /* Emerald-500 */
--color-teacher-accent: #3B82F6;     /* Blue-500 */

/* Text Colors */
--color-brand-textPrimary: #F2EFEA;      /* Light text on dark */
--color-brand-textSecondary: #A8A29D;
--color-brand-textDarkPrimary: #141211;  /* Dark text on light */
--color-brand-textDarkSecondary: #57534E;

/* Status Colors */
--color-status-progress: #059669;  /* Emerald */
--color-status-stuck: #DC2626;     /* Red */
--color-status-question: #D97706;  /* Amber */
--color-status-complete: #2563EB;  /* Blue */
```

---

## Z-Index Layering System

Consistent stacking order for overlays and fixed elements:

```css
--z-index-base: 0;
--z-index-dropdown: 10;
--z-index-tooltip: 20;
--z-index-sidebar: 30;
--z-index-modal: 50;
--z-index-overlay: 100;
--z-index-toast: 200;
```

**Usage:**
```jsx
<header className="z-dropdown">...</header>
<aside className="z-sidebar">...</aside>
<div className="z-modal">...</div>
```

---

## Typography System

### Fluid Typography

Text scales smoothly between breakpoints using CSS `clamp()`. The `rem` base ensures user zoom works (accessibility), while `vw` creates responsive scaling.

```css
.text-fluid-xs {
  font-size: clamp(0.75rem, calc(1vw + 0.5rem), 0.875rem);   /* 12-14px */
}

.text-fluid-sm {
  font-size: clamp(0.875rem, calc(1.5vw + 0.5rem), 1rem);    /* 14-16px */
}

.text-fluid-base {
  font-size: clamp(1rem, calc(2vw + 0.5rem), 1.25rem);       /* 16-20px */
}

.text-fluid-lg {
  font-size: clamp(1.125rem, calc(2.5vw + 0.5rem), 1.5rem);  /* 18-24px */
}

.text-fluid-xl {
  font-size: clamp(1.25rem, calc(3vw + 0.5rem), 1.75rem);    /* 20-28px */
}

.text-fluid-2xl {
  font-size: clamp(1.5rem, calc(4vw + 0.5rem), 2.5rem);      /* 24-40px */
}

.text-fluid-3xl {
  font-size: clamp(1.875rem, calc(5vw + 0.5rem), 3rem);      /* 30-48px */
}
```

**Usage:**
```jsx
<h1 className="text-fluid-xl font-bold">Page Title</h1>
<p className="text-fluid-sm">Body text that scales</p>
<span className="text-fluid-xs">Small label</span>
```

---

## Layout Utilities

### Dynamic Viewport Height

For mobile browser compatibility (accounts for address bar):

```css
.h-screen-safe {
  height: 100vh;   /* Fallback */
  height: 100dvh;  /* Dynamic viewport height */
}
```

### Safe Area Insets

For notched devices (iPhone X+, etc.):

```css
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

.safe-area-pt {
  padding-top: env(safe-area-inset-top, 0);
}

.safe-area-inset {
  padding-top: env(safe-area-inset-top, 0);
  padding-right: env(safe-area-inset-right, 0);
  padding-bottom: env(safe-area-inset-bottom, 0);
  padding-left: env(safe-area-inset-left, 0);
}
```

### Responsive Padding

Padding that shrinks on mobile, caps on desktop using `min()`:

```css
.p-responsive {
  padding: min(5vw, 24px);
}

.px-responsive {
  padding-left: min(5vw, 24px);
  padding-right: min(5vw, 24px);
}

.py-responsive {
  padding-top: min(4vw, 20px);
  padding-bottom: min(4vw, 20px);
}
```

### Image Aspect Ratios

```css
.img-responsive {
  width: 100%;
  height: auto;
  object-fit: cover;
}

.img-square {
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.img-video {
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.img-portrait {
  aspect-ratio: 3 / 4;
  object-fit: cover;
}
```

---

## Component Themes

### Theme-Aware Components

All interactive components should use the dynamic `brand-accent` color which adapts based on:
1. **Classroom theme color** (highest priority) - set by teacher
2. **User role default** - Emerald for students, Blue for teachers

### 1. Student Theme (Default: Emerald Green)

Used for all student-facing components when no classroom theme is set.
When a classroom has a theme color, replace emerald classes with `brand-accent`.

```css
/* Base Tile/Input/Button Style */
.student-tile {
  @apply w-full px-4 py-2.5 rounded-xl border-2 transition-all duration-200;
  @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
  @apply text-brand-textDarkPrimary dark:text-brand-textPrimary;
  @apply border-gray-200 dark:border-gray-700;
}

.student-tile:hover {
  @apply border-gray-200 dark:border-gray-700;
}

.student-tile:focus-within,
.student-tile:focus {
  @apply outline-none border-brand-accent;
  @apply ring-2 ring-brand-accent/20;
}

/* Ghost Button Style (Nav/Footer) */
.student-ghost {
  @apply border-2 transition-all duration-200;
  @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
  @apply border-transparent;
  @apply text-gray-500 dark:text-gray-400;
}

.student-ghost:hover {
  @apply border-gray-200 dark:border-gray-700;
}

.student-ghost:focus,
.student-ghost.active {
  @apply border-brand-accent text-brand-accent;
  @apply ring-2 ring-brand-accent/20;
}

/* Arrow Animation (requires 'group' on parent) */
.student-arrow {
  @apply transition-all duration-200;
}
.group:hover .student-arrow {
  @apply translate-x-1 text-brand-accent;
}
```

### 2. Teacher Theme (Default: Blue)

Used for all teacher-facing dashboard tiles. Uses `brand-accent` which defaults to blue
but can be overridden by classroom theme color.

```css
/* Base Tile/Input/Button Style */
.teacher-tile {
  @apply w-full px-4 py-2.5 rounded-xl border-2 transition-all duration-200;
  @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
  @apply text-brand-textDarkPrimary dark:text-brand-textPrimary;
  @apply border-gray-200 dark:border-gray-700;
}

.teacher-tile:hover {
  @apply border-gray-200 dark:border-gray-700;
}

.teacher-tile:focus-within,
.teacher-tile:focus {
  @apply outline-none border-brand-accent;
  @apply ring-2 ring-brand-accent/20;
}

/* Ghost Button Style (Nav/Footer) */
.teacher-ghost {
  @apply border-2 transition-all duration-200;
  @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
  @apply border-transparent;
  @apply text-gray-500 dark:text-gray-400;
}

.teacher-ghost:hover {
  @apply border-gray-200 dark:border-gray-700;
}

.teacher-ghost:focus,
.teacher-ghost.active {
  @apply border-brand-accent text-brand-accent;
  @apply ring-2 ring-brand-accent/20;
}

/* Arrow Animation */
.group:hover .teacher-arrow {
  @apply translate-x-1 text-brand-accent;
}
```

### Theme Implementation in Components

When building components, use `brand-accent` for all accent colors:

```jsx
// ✅ Correct: Uses dynamic brand-accent
className="border-brand-accent text-brand-accent ring-brand-accent/20"

// ❌ Incorrect: Hardcoded color
className="border-emerald-500 text-emerald-600"  // Don't do this
className="border-blue-500 text-blue-600"        // Don't do this
```

**Exception:** Status colors (stuck, question, progress, complete) remain constant regardless of theme.

---

## Using the Theme Context

### ThemeProvider Setup

The `ThemeProvider` wraps your app and manages the accent color:

```tsx
// In App.tsx
import { ThemeProvider, UserRole } from './context/ThemeContext';

// Determine role based on view
const userRole: UserRole = view === 'student' ? 'student' : 'teacher';

return (
    <ThemeProvider 
        role={userRole} 
        classroomColor={view === 'student' ? studentClassroomColor : undefined}
    >
        {/* App content */}
    </ThemeProvider>
);
```

### Accessing Theme Values

```tsx
import { useTheme } from './context/ThemeContext';

const MyComponent = () => {
    const { accentColor, role, isClassroomThemed } = useTheme();
    
    // accentColor: Current hex color (e.g., "#10B981" or classroom color)
    // role: 'student' | 'teacher'
    // isClassroomThemed: true if using classroom's custom color
    
    return <div style={{ borderColor: accentColor }}>...</div>;
};
```

### Classroom Color Flow

1. Teacher creates classroom → Sets theme color (optional)
2. Student joins classroom → App fetches classroom.color
3. ThemeProvider receives classroomColor prop
4. CSS variable `--color-brand-accent` is set
5. All `brand-accent` Tailwind classes use new color

---

## Navigation Patterns

### Mobile Bottom Navigation

Fixed bottom nav bar with square tile buttons (64×64px) and centered icon + text:

```jsx
<nav className="md:hidden fixed bottom-0 inset-x-0 bg-brand-lightSurface dark:bg-brand-darkSurface z-sidebar safe-area-pb pb-2">
  <ul className="flex justify-around items-center h-16 px-2 list-none m-0 p-0">
    <li>
      <button
        className={`
          flex flex-col items-center justify-center gap-1 p-2
          w-16 h-16 rounded-xl border-2 transition-all duration-200
          bg-brand-lightSurface dark:bg-brand-darkSurface
          focus:outline-none focus:ring-2 focus:ring-brand-accent/20
          ${isActive
            ? 'border-brand-accent text-brand-accent'
            : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400'
          }
        `}
      >
        <ListTodo className="w-6 h-6" />
        <span className="text-fluid-xs font-bold">Tasks</span>
      </button>
    </li>
  </ul>
</nav>
```

**Button Specs:**
| Property | Value |
|----------|-------|
| Button Size | `w-16 h-16` (64×64px) |
| Icon Size | `w-6 h-6` (24×24px) |
| Text Size | `text-fluid-xs` (12-14px) |
| Gap | `gap-1` (4px) |
| Padding | `p-2` (8px) |
| Border Radius | `rounded-xl` |

### Gradient Fade Overlays

Content fades as it scrolls behind fixed headers/footers:

```jsx
{/* Header fade - positioned below header */}
<div
  className="absolute left-0 right-0 top-16 h-8 pointer-events-none z-dropdown
             bg-gradient-to-b from-brand-lightSurface dark:from-brand-darkSurface to-transparent"
  aria-hidden="true"
/>

{/* Footer fade - positioned above mobile nav */}
<div
  className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+0.5rem)]
             left-0 right-0 h-8 pointer-events-none z-sidebar
             bg-gradient-to-t from-brand-lightSurface dark:from-brand-darkSurface to-transparent"
  aria-hidden="true"
/>
```

**Key Properties:**
- `h-8` (32px) gradient height for subtle fade
- `pointer-events-none` so clicks pass through
- `aria-hidden="true"` for accessibility
- Header: `bg-gradient-to-b` (fades downward)
- Footer: `bg-gradient-to-t` (fades upward)

### Desktop Sidebar Navigation

Collapsible sidebar with semantic list structure:

```jsx
<aside className={`${isCollapsed ? 'w-20' : 'w-64'} transition-all duration-300`}>
  <nav aria-label="Main navigation">
    <ul className="space-y-2 list-none m-0 p-0">
      <li>
        <button
          aria-expanded={hasSubmenu ? isExpanded : undefined}
          aria-controls={hasSubmenu ? 'submenu-id' : undefined}
          className={`
            flex items-center rounded-xl border-[3px] transition-all duration-200 font-bold
            ${isActive
              ? 'border-brand-accent text-brand-accent'
              : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
            }
            ${isCollapsed ? 'w-12 h-12 justify-center' : 'w-full h-12'}
          `}
        >
          <Icon className="w-5 h-5" />
          <span className={isCollapsed ? 'w-0 opacity-0' : 'opacity-100'}>
            Label
          </span>
        </button>
      </li>
    </ul>
  </nav>
</aside>
```

---

## Accessibility Patterns

### Skip Link

First focusable element for keyboard users to bypass navigation:

```jsx
{/* In App.tsx - first child */}
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

{/* Main content target */}
<main id="main-content">...</main>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px 16px;
  background: var(--color-brand-accent);
  color: white;
  z-index: 9999;
  transition: top 0.2s ease;
  font-weight: 600;
  text-decoration: none;
  border-radius: 0 0 8px 0;
}

.skip-link:focus {
  top: 0;
  outline: 2px solid white;
  outline-offset: 2px;
}
```

### ARIA Patterns

**Collapsible Menus:**
```jsx
<button
  aria-expanded={!isCollapsed}
  aria-controls="sidebar-nav"
  aria-label={isCollapsed ? 'Expand menu' : 'Collapse menu'}
>
```

**Toggle Switches:**
```jsx
<button
  role="switch"
  aria-checked={isEnabled}
  aria-label="Enable dark mode"
>
```

**Modals:**
```jsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <h2 id="modal-title">Modal Title</h2>
</div>
```

### Focus Management

Sidebars and modals trap focus and restore it on close:

```jsx
const previousFocusRef = useRef<HTMLElement | null>(null);

useEffect(() => {
  if (isOpen) {
    previousFocusRef.current = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();
  } else if (previousFocusRef.current) {
    previousFocusRef.current.focus();
  }
}, [isOpen]);

// Escape key to close
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [onClose]);
```

---

## Shared Components

### Card Base

```css
.card-base {
  @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
  @apply border-[3px] border-gray-200 dark:border-gray-700;
  @apply rounded-xl transition-colors;
}
```

### Input Base

```css
.input-base {
  @apply w-full px-4 py-2.5 rounded-xl border-[3px] transition-all duration-200;
  @apply bg-transparent;
  @apply text-brand-textDarkPrimary dark:text-brand-textPrimary;
  @apply border-gray-200 dark:border-gray-700;
  @apply placeholder-gray-400 dark:placeholder-gray-500 font-medium;
  @apply hover:border-brand-accent/70;
}

.input-focus {
  @apply focus:outline-none focus:border-brand-accent;
  @apply focus:ring-2 focus:ring-brand-accent/20;
}
```

### Primary Button (Accent)

```css
.btn-primary-accent {
  @apply w-full py-2.5 px-4 rounded-xl border-[3px] transition-all duration-200;
  @apply bg-transparent;
  @apply text-brand-accent font-bold;
  @apply border-brand-accent;
  @apply hover:text-brand-accent/80 hover:border-brand-accent/80 hover:bg-brand-accent/10;
  @apply focus:outline-none focus:ring-2 focus:ring-brand-accent/30;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}
```

---

## Usage Examples

### Student Mobile Nav Button

```jsx
<button
  onClick={() => setTab('tasks')}
  className={`
    flex flex-col items-center justify-center gap-1 p-2
    w-16 h-16 rounded-xl border-[3px] transition-all duration-200
    bg-brand-lightSurface dark:bg-brand-darkSurface
    focus:outline-none focus:ring-2 focus:ring-brand-accent/20
    ${activeTab === 'tasks'
      ? 'border-brand-accent text-brand-accent'
      : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 text-gray-500 dark:text-gray-400'
    }
  `}
  aria-label="Tasks"
>
  <ListTodo className="w-6 h-6" />
  <span className="text-fluid-xs font-bold">Tasks</span>
</button>
```

### Teacher Dashboard Header

```jsx
<header className="h-16 bg-brand-lightSurface dark:bg-brand-darkSurface flex items-center justify-between px-4 md:px-6 z-dropdown border-b border-gray-200 dark:border-gray-800">
  <h2 className="text-fluid-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary truncate">
    {className}
  </h2>
  <div className="flex items-center gap-3">
    <span className="text-fluid-lg font-semibold text-brand-accent">
      {activeView}
    </span>
    <span className="text-fluid-sm font-medium text-gray-500 dark:text-gray-400">
      {formattedDate}
    </span>
  </div>
</header>
```

### Responsive Modal

```jsx
<div
  className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
  onClick={onClose}
>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
    className="max-w-md w-full bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-[3px] border-gray-200 dark:border-gray-700 shadow-2xl"
    onClick={e => e.stopPropagation()}
  >
    <div className="flex items-center justify-between p-6">
      <h2 id="modal-title" className="text-xl font-bold">Title</h2>
      <button onClick={onClose} aria-label="Close">
        <X className="w-5 h-5" />
      </button>
    </div>
    <div className="p-6">{children}</div>
  </div>
</div>
```

---

## Animation Standards

| Animation | Duration | Easing |
|-----------|----------|--------|
| Transitions | `200ms` | `ease-in-out` |
| Sidebar collapse | `300ms` | `ease-in-out` |
| Modal enter | `200ms` | `zoom-in-95` |
| Fade in | `200ms` | `ease-out` |
| Arrow hover | `200ms` | default |

```css
@keyframes fadeIn {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes slideUp {
  0% { transform: translateY(20px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
```
