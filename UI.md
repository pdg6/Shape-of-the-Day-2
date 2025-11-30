# UI Design System

This document outlines the standard UI patterns, animations, color themes, and responsive utilities for the Shape of the Day application.

---

## Core Design Principles

- **Solid Surfaces:** Cards and tiles use solid backgrounds (`bg-brand-lightSurface` / `dark:bg-brand-darkSurface`) to ensure readability.
- **Interactive Borders:** Interactive elements use a 3px border that changes color on hover and focus.
- **Micro-Animations:** Arrows and icons animate on hover (`translate-x-1`) to encourage interaction.
- **Mobile-First Responsive:** All layouts adapt gracefully from mobile to desktop using fluid utilities.
- **Accessibility-First:** Skip links, ARIA attributes, and keyboard navigation are built-in.

---

## Color Tokens

Defined in `index.css` under `@theme`:

```css
/* Brand Colors */
--color-brand-dark: #10100eff;
--color-brand-darkSurface: #10100eff;
--color-brand-light: #E5E5E5;
--color-brand-lightSurface: #FFFFFF;
--color-brand-accent: #2563EB;

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

### 1. Student Theme (Emerald Green)

Used for all student-facing components (`StudentView`, `StudentNameModal`, `JoinRoom`, etc.).

```css
/* Base Tile/Input/Button Style */
.student-tile {
  @apply w-full px-4 py-2.5 rounded-xl border-[3px] transition-all duration-200;
  @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
  @apply text-brand-textDarkPrimary dark:text-brand-textPrimary;
  @apply border-gray-200 dark:border-gray-700;
}

.student-tile:hover {
  @apply border-gray-200 dark:border-gray-700;
}

.student-tile:focus-within,
.student-tile:focus {
  @apply outline-none border-emerald-500;
  @apply ring-2 ring-emerald-200 dark:ring-emerald-900/50;
}

/* Ghost Button Style (Nav/Footer) */
.student-ghost {
  @apply border-[3px] transition-all duration-200;
  @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
  @apply border-transparent;
  @apply text-gray-500 dark:text-gray-400;
}

.student-ghost:hover {
  @apply border-gray-200 dark:border-gray-700;
}

.student-ghost:focus,
.student-ghost.active {
  @apply border-emerald-500 text-emerald-600 dark:text-emerald-500;
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

```css
/* Base Tile/Input/Button Style */
.teacher-tile {
  @apply w-full px-4 py-2.5 rounded-xl border-[3px] transition-all duration-200;
  @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
  @apply text-brand-textDarkPrimary dark:text-brand-textPrimary;
  @apply border-gray-200 dark:border-gray-700;
}

.teacher-tile:hover {
  @apply border-gray-200 dark:border-gray-700;
}

.teacher-tile:focus-within,
.teacher-tile:focus {
  @apply outline-none border-blue-500;
  @apply ring-2 ring-blue-200 dark:ring-blue-900/50;
}

/* Ghost Button Style (Nav/Footer) */
.teacher-ghost {
  @apply border-[3px] transition-all duration-200;
  @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
  @apply border-transparent;
  @apply text-gray-500 dark:text-gray-400;
}

.teacher-ghost:hover {
  @apply border-gray-200 dark:border-gray-700;
}

.teacher-ghost:focus,
.teacher-ghost.active {
  @apply border-blue-500 text-blue-600 dark:text-blue-500;
  @apply ring-2 ring-blue-200 dark:ring-blue-900/50;
}

/* Arrow Animation */
.group:hover .teacher-arrow {
  @apply translate-x-1 text-blue-500;
}
```

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
          w-16 h-16 rounded-xl border-[3px] transition-all duration-200
          bg-brand-lightSurface dark:bg-brand-darkSurface
          focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/50
          ${isActive
            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-500'
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
              ? 'border-blue-500 text-blue-600 dark:text-blue-500'
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
  @apply hover:border-emerald-400 dark:hover:border-emerald-500;
}

.input-focus {
  @apply focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400;
  @apply focus:ring-2 focus:ring-emerald-500/20;
}
```

### Primary Button (Green)

```css
.btn-primary-green {
  @apply w-full py-2.5 px-4 rounded-xl border-[3px] transition-all duration-200;
  @apply bg-transparent;
  @apply text-emerald-400 font-bold;
  @apply border-emerald-400;
  @apply hover:text-emerald-300 hover:border-emerald-300 hover:bg-emerald-400/10;
  @apply focus:outline-none focus:ring-2 focus:ring-emerald-400/30;
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
    focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/50
    ${activeTab === 'tasks'
      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-500'
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
    <span className="text-fluid-lg font-semibold text-blue-600 dark:text-blue-500">
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
