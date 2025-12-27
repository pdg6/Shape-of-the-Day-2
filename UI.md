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

## Floating Tiles Design System (Dark Mode)

The premium dark mode aesthetic uses the "Floating Tiles" pattern for depth, tactility, and interactivity.

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-page` / `brand-dark` | `#0f1115` | Main page background |
| `bg-tile` / `dark:bg-[#1a1d24]` | `#1a1d24` | Standard card/tile background |
| `bg-tile-alt` | `#151921` | Alternate/nested tile background |
| `border-subtle` / `dark:border-white/5` | `rgba(255,255,255,0.05)` | Generic borders |

### Core Effects

| Effect | Utility Class | Description |
|--------|---------------|-------------|
| Layered Shadows | `.shadow-layered` | Composite shadow: ambient + definition + rim |
| Rim Light | `.rim-light` | Edge highlight for physical thickness |
| Glass Panel | `.glass-panel` | Blur + low-opacity bg for glassmorphism |
| Lift Hover | `.lift-hover` | Translate -4px on hover with 300ms ease-out |
| Shine Effect | `.shine-effect` | Animated gloss highlight on hover |

### Neon Glow Effects

For active states, progress bars, or emphasis:

| Class | Color |
|-------|-------|
| `.glow-blue` | Blue 500 |
| `.glow-emerald` | Emerald 500 |
| `.glow-red` | Red 500 |
| `.glow-amber` | Amber 500 |

### Interactive States

**Hover Changes:**
- Vertical translation: `-4px` (`.lift-hover`)
- Shadow expansion: `.shadow-layered` → `.shadow-layered-lg`
- Border light increase: `white/5` → `brand-accent/30`

**Transition:**
```css
transition: transform 300ms ease-out, box-shadow 300ms ease-out;
```

### Geometry & Spacing

| Element | Border Radius | Padding |
|---------|---------------|---------|
| Main Tiles | `rounded-2xl` (16px) | `p-6` (24px minimum) |
| Buttons | `rounded-lg` (8px) | varies |
| Icon Containers | `rounded-full` | varies |
| Grid Gaps | — | `gap-6` to `gap-8` |

### Typography (Dark Mode)

| Element | Classes |
|---------|---------|
| Headings | `text-white font-bold tracking-tight` |
| Body Text | `text-slate-300` or `text-slate-400` |
| Labels | `text-xs font-medium tracking-wide uppercase` |

### Additional Utilities

- `.bg-pattern-dots`: Subtle dot grid for empty/preview states
- `.nav-item-active`: Left-border accent + tint for active nav items
- Custom scrollbar: Dark theme scrollbar styling (automatic)

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
className="border-2 border-gray-400 dark:border-gray-600"

// Primary text
className="text-brand-textDarkPrimary dark:text-brand-textPrimary"

// Secondary text
className="text-gray-500 dark:text-gray-400"

// Dividers and separators
className="border-b border-gray-200 dark:border-gray-800"
```

### Interactive Border States

Form inputs, dropdowns, and non-CTA buttons follow this border color pattern:

| Mode | Default Border | Hover/Focus Border |
|------|----------------|-------------------|
| **Light** | `gray-400` | `gray-600` |
| **Dark** | `gray-600` | `gray-400` |

### Interactive Background States

Non-CTA buttons and tiles follow this hover background pattern:

| Mode | Hover Background |
|------|-----------------|
| **Light** | `gray-100` |
| **Dark** | `gray-800/50` (50% opacity) |

**Implementation:**
```jsx
// Select, MultiSelect, DatePicker, form buttons
className="border-2 border-gray-400 dark:border-gray-600 
           hover:bg-gray-100 dark:hover:bg-gray-800/50
           hover:border-gray-600 dark:hover:border-gray-400
           focus:border-brand-accent"
```

**Exceptions (CTA Buttons):** Save, Delete, New Task buttons use `brand-accent` or semantic colors (red/green) for focus/hover instead of gray borders.

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
                border-2 border-gray-400 dark:border-gray-600">
  
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
--color-brand-dark: #0f1115;
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

## TeacherView Content Page Layout

Each tab in the TeacherView follows a consistent layout pattern with standardized header height and spacing.

### Content Header

All content pages (except LiveView) use a fixed-height header that matches the sidebar header:

```jsx
{/* Content Header - h-16 matches sidebar header height */}
<div className="h-16 flex-shrink-0 flex items-center justify-between">
    <div className="flex items-baseline gap-3">
        <span className="text-fluid-xl font-black text-brand-textDarkPrimary dark:text-brand-textPrimary">
            TabName:
        </span>
        <span className="text-fluid-xl font-black text-brand-accent">
            {currentClass?.name}
        </span>
    </div>
    {/* Optional: Right-side actions */}
</div>
```

**Header Specs:**
| Property | Value | Notes |
|----------|-------|-------|
| Height | `h-16` (64px) | Matches sidebar header |
| Typography | `text-fluid-xl font-black` | Label + accent class name |
| Vertical align | `items-center` | Centers content vertically |
| Flex shrink | `flex-shrink-0` | Prevents header from collapsing |

### Page Wrapper Spacing

Content pages use `space-y-3` (12px) between header and content for consistent spacing:

```jsx
<div className="flex flex-col space-y-3">
    {/* h-16 header */}
    {/* Content area */}
</div>
```

**Exception:** LiveView uses `space-y-6` due to its different content density.

### Layout Alignment

The content body aligns with the sidebar's navigation buttons:

```
┌─────────────┬──────────────────────────────────────────┐
│  Sidebar    │     Main Content Area                    │
│  h-16       │     h-16 Content Header                  │
│  Logo/Date  │     [Tab Label: Class Name]              │
├─────────────┼──────────────────────────────────────────┤
│  pt-4 nav   │     space-y-3                            │
│  Classrooms │     Content body ← aligns with nav       │
│  Tasks...   │                                          │
└─────────────┴──────────────────────────────────────────┘
```

---

## TeacherView Desktop Layout (Complete Specification)

The TeacherView is the primary interface for authenticated teachers. This section documents the exact layout structure for pixel-perfect reproduction.

### Global Shell Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Root Container: flex h-full overflow-hidden                                  │
│                  bg-brand-lightSurface dark:bg-brand-darkSurface              │
├───────────────┬──────────────────────────────────────────┬──────────────────┤
│   Left        │            Main Content Area             │     Right        │
│   Sidebar     │            (flex-1)                      │     Connection   │
│   (w-64/w-20) │                                          │     Sidebar      │
│   Desktop     │                                          │     (Desktop)    │
└───────────────┴──────────────────────────────────────────┴──────────────────┘
```

### Left Sidebar Navigation

| State | Width | Content |
|-------|-------|---------|
| Expanded | `w-64` (256px) | Icons + labels + submenus |
| Collapsed | `w-20` (80px) | Icons only |

#### Sidebar Container Classes
```jsx
className={`
  hidden md:flex md:static inset-y-0 left-0 z-sidebar
  ${isCollapsed ? 'w-20' : 'w-64'}
  bg-brand-lightSurface dark:bg-brand-darkSurface
  transform transition-all duration-300 ease-in-out flex-col h-full overflow-hidden
`}
```

#### Sidebar Sections (Top to Bottom)

| Section | Height | Classes | Content |
|---------|--------|---------|---------|
| Header | `h-16` (64px) | `flex-shrink-0 flex items-center px-4` | Logo (40x40), App name, Date |
| Navigation | `flex-1` | `px-4 pb-4 pt-4 overflow-y-auto custom-scrollbar` | Menu items with submenus |
| Footer | auto | `px-4 pb-1 pt-4 space-y-2 flex-shrink-0` | Toggle, divider, Join Code, Settings |

#### Navigation Button Specs

| Property | Active | Inactive |
|----------|--------|----------|
| Border | `border-brand-accent` | `border-transparent` |
| Background | `bg-brand-accent/5` | transparent |
| Text Color | `text-brand-accent` | `text-gray-500` |
| Shadow | `shadow-sm` | none |

#### Menu Items

| ID | Icon | Label | Submenu |
|----|------|-------|---------|
| `classrooms` | `School` | "Classrooms" | Class list + "Add Class" (click toggle) |
| `tasks` | `ListTodo` | "Tasks" | "Create", "Inventory" (auto-expand) |
| `shape` | `Presentation` | "Shape of Day" | None |
| `live` | `Activity` | "Live View" | "By Task", "By Student" (auto-expand) |
| `reports` | `BarChart2` | "Reports" | "Calendar", "Analytics" (auto-expand) |

#### Submenu Animation
```jsx
className={`
  grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
  ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}
`}
```

### Main Content Area

```jsx
<main className="flex-1 flex flex-col min-w-0 relative">
  <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden">
    <div className="h-full w-full overflow-y-auto overflow-x-hidden px-6 pb-[84px] md:pb-6">
      {/* Tab content renders here */}
    </div>
  </div>
</main>
```

### Mobile Bottom Navigation

| Property | Value |
|----------|-------|
| Display | `md:hidden` (mobile only) |
| Position | `fixed bottom-0 inset-x-0` |
| Height | `h-24` (96px overall), `h-16` (64px buttons) |
| Background | `footer-fade` (gradient) |
| Z-Index | `z-sidebar` |

#### Mobile Nav Button Specs

```jsx
className={`
  flex flex-col items-center justify-center gap-1 p-2
  w-16 h-16 rounded-xl border-2 transition-all duration-200
  bg-brand-lightSurface dark:bg-brand-darkSurface
  ${isActive ? 'border-brand-accent text-brand-accent' : 'border-transparent ...'}
`}
```

| Item | Icon | Label |
|------|------|-------|
| Classes | `School` | "Classes" |
| Tasks | `ListTodo` | "Tasks" |
| Shape | `Presentation` | "Shape" |
| Live | `Activity` | "Live" |
| More | `Home` | "More" |

### Tab Content Mapping

| Tab | Subtab | Component |
|-----|--------|-----------|
| `tasks` | `create` | `TaskManager` |
| `tasks` | `browse` | `TaskInventory` |
| `shape` | — | `ShapeOfDay` |
| `live` | `tasks`/`students` | `LiveView` |
| `classrooms` | — | `ClassroomManager (classes)` |
| `reports` | `calendar` | `ClassroomManager (history)` |
| `reports` | `analytics` | `ClassroomManager (analytics)` |

### For Full Specifications

See [teacher-ui-blueprint.md](file:///c:/Users/16047/Desktop/Antigravity/Shape%20of%20the%20Day%202/teacher-ui-blueprint.md) for exhaustive pixel-perfect documentation including:
- All CSS class specifications
- State management details
- Animation timing
- ARIA accessibility attributes
- Icon library reference

---

## TeacherView Component-Level Specifications

This section provides exhaustive documentation of every UI component pattern used within TeacherView, derived from the current implementation as ground truth.

---

### Content Page Headers (Standard Pattern)

All content pages in TeacherView follow a consistent header pattern that aligns with the sidebar header height.

#### Structure
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ h-16 flex-shrink-0 flex items-center justify-between                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  Left Side                                    │  Right Side                 │
│  ┌────────────────────────────────────────────┴──────────────────────────┐  │
│  │ Label: [Class Name]  [Optional Badge]     | [Action Buttons]         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Container Classes
```jsx
className="h-16 flex-shrink-0 flex items-center justify-between"
```

| Property | Value | Notes |
|----------|-------|-------|
| Height | `h-16` (64px) | Matches sidebar header |
| Flex shrink | `flex-shrink-0` | Prevents collapse |
| Alignment | `items-center justify-between` | Vertical center, horizontal spread |

#### Left Side Pattern: Label + Class Name
```jsx
<div className="flex items-center gap-3">
    <div className="flex items-baseline gap-3">
        <span className="text-fluid-lg font-black text-gray-400">
            TabName:
        </span>
        <span className="text-fluid-lg font-black text-brand-textDarkPrimary dark:text-brand-textPrimary underline decoration-brand-accent decoration-2 underline-offset-4">
            {currentClass?.name}
        </span>
    </div>
    {/* Optional: Inline badges */}
</div>
```

| Element | Typography | Color |
|---------|------------|-------|
| Label (e.g., "Live View:") | `text-fluid-lg font-black` | `text-gray-400` |
| Class Name | `text-fluid-lg font-black` | Primary text with accent underline |
| Underline | `decoration-2 underline-offset-4` | `decoration-brand-accent` |

#### Tab-Specific Header Variations

| Tab | Label Text | Right Side Actions | Extra Elements |
|-----|------------|-------------------|----------------|
| Tasks: Create | `Tasks:` | `New Task` ghost button | Draft indicator badge |
| Tasks: Inventory | `Tasks:` | None | — |
| Shape of Day | `Shape:` | `Fullscreen` icon button | Active students badge |
| Live View | `Live View:` | `Tasks` / `Students` toggle | Active count badge |
| Classrooms | `Classrooms:` | `Create Class` ghost button | — |
| Reports: Calendar | `Reports:` | `Calendar` / `Analytics` toggle | — |
| Reports: Analytics | `Reports:` | `Calendar` / `Analytics` toggle | — |

---

### Active Students Badge

Displayed in LiveView and ShapeOfDay headers to show current active student count.

```jsx
<div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium border border-green-200 dark:border-green-800">
    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
    {count} Active
</div>
```

| Property | Light Mode | Dark Mode |
|----------|------------|-----------|
| Background | `bg-green-100` | `bg-green-900/30` |
| Text | `text-green-700` | `text-green-400` |
| Border | `border-green-200` | `border-green-800` |
| Indicator | `bg-green-500 animate-pulse` | Same |
| Shadow | `shadow-[0_0_8px_rgba(34,197,94,0.6)]` | Same |

---

### Button Variants

TeacherView uses several button variants with consistent patterns.

#### Ghost Button (Toggle/Navigation)
Used for view toggles, header actions, and non-primary CTAs.

```jsx
<Button
    variant="ghost"
    size="md"
    icon={IconComponent}
    onClick={handler}
    className={isActive ? 'text-brand-accent' : 'text-gray-500'}
>
    Label
</Button>
```

**Implemented CSS Classes (from Button component):**
```jsx
// Base classes for ghost variant
className="flex items-center justify-center gap-2 h-12 px-4 rounded-md font-bold transition-all duration-200
           border-2 border-transparent
           hover:border-brand-accent text-brand-accent hover:bg-brand-accent/5
           focus:outline-none focus:ring-2 focus:ring-brand-accent/20
           disabled:opacity-50 disabled:cursor-not-allowed"
```

| State | Border | Background | Text |
|-------|--------|------------|------|
| Default (active) | `transparent` | `transparent` | `text-brand-accent` |
| Default (inactive) | `transparent` | `transparent` | `text-gray-500` |
| Hover | `border-brand-accent` | `bg-brand-accent/5` | — |
| Focus | Focus ring | — | — |

#### Ghost Danger Button
Used for delete/remove actions.

```css
.btn-ghost-danger {
    @apply flex items-center justify-center gap-2 h-12 px-4 rounded-md;
    @apply font-bold transition-all duration-200;
    @apply border-2 border-transparent;
    @apply text-red-500;
    @apply hover:border-red-500 hover:bg-red-500/5;
    @apply focus:outline-none focus:ring-2 focus:ring-red-500/20;
}
```

#### Icon Button
Small square button with icon only.

```jsx
<Button
    variant="icon"
    size="sm"
    onClick={handler}
    icon={IconComponent}
/>
```

| Size | Dimensions | Icon Size |
|------|------------|-----------|
| `sm` | `w-8 h-8` | `16px` |
| `md` | `w-10 h-10` | `20px` |
| `lg` | `w-12 h-12` | `24px` |

#### Primary Action Button (Create Class, New Task)
Ghost variant with accent color, positioned in header right side.

```jsx
<Button
    variant="ghost"
    size="md"
    icon={Plus}
    onClick={openCreateModal}
    className="flex-shrink-0 text-brand-accent"
>
    Create Class
</Button>
```

---

### Card Patterns

#### Base Card (`card-base`)
Generic card container used throughout.

```css
.card-base {
    @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
    @apply border-2 border-gray-200 dark:border-gray-700;
    @apply rounded-xl transition-colors;
}
```

#### Interactive Card (`card-interactive`)
Used for selectable items like class cards.

```css
.card-interactive {
    @apply rounded-xl border-2 transition-all cursor-pointer;
    @apply border-gray-400 dark:border-gray-600;
    @apply hover:border-gray-600 dark:hover:border-gray-400;
    @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
}

.card-interactive-selected {
    @apply border-brand-accent bg-brand-accent/5;
}
```

| State | Border | Background |
|-------|--------|------------|
| Default (Light) | `border-gray-400` | `bg-brand-lightSurface` |
| Default (Dark) | `border-gray-600` | `bg-brand-darkSurface` |
| Hover (Light) | `border-gray-600` | — |
| Hover (Dark) | `border-gray-400` | — |
| Selected | `border-brand-accent` | `bg-brand-accent/5` |

#### Class Card Structure
ClassCard component layout:

```
┌──────────────────────────────────────────────────┬───────────────┐
│  Main Content (flex-1)                            │  Actions Bar  │
│  ┌────────────────────────────────────────────┐   │  (w-[72px])   │
│  │ Header (h-20, p-5)                         │   │               │
│  │ - Class Name (text-xl font-bold)           │   │  ┌─────────┐  │
│  │ - Join Code (text-xs)                      │   │  │ Action  │  │
│  └────────────────────────────────────────────┘   │  │ Buttons │  │
│  ┌────────────────────────────────────────────┐   │  │ Stack   │  │
│  │ Body Stats (flex-1, p-5)                   │   │  └─────────┘  │
│  │ - Students count | Tasks count             │   │               │
│  └────────────────────────────────────────────┘   │               │
└──────────────────────────────────────────────────┴───────────────┘
```

---

### Table Styling

Tables are used in LiveView for student lists and in analytics modals.

#### Table Container
```jsx
className="bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
```

#### Table Header
```jsx
<thead className="bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-700">
    <tr>
        <th className="p-4 text-xs font-bold text-gray-500 uppercase">Column</th>
    </tr>
</thead>
```

| Element | Property | Value |
|---------|----------|-------|
| Header bg | Light | `bg-gray-50` |
| Header bg | Dark | `bg-gray-800` |
| Header text | All | `text-xs font-bold text-gray-500 uppercase` |
| Header padding | All | `p-4` |
| Border | All | `border-b-2 border-gray-200 dark:border-gray-700` |

#### Table Body
```jsx
<tbody className="divide-y divide-gray-200 dark:divide-gray-700">
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <td className="p-4 font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
            {/* content */}
        </td>
    </tr>
</tbody>
```

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Row divider | `divide-gray-200` | `divide-gray-700` |
| Row hover | `hover:bg-gray-50` | `hover:bg-gray-800/50` |
| Cell padding | `p-4` | `p-4` |
| Primary text | `text-brand-textDarkPrimary` | `text-brand-textPrimary` |
| Secondary text | `text-gray-600` | `text-gray-400` |

---

### Progress Bars

#### Standard Progress Bar
Used in student list, task cards, and analytics.

```jsx
<div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
    <div
        className="h-full bg-brand-accent transition-all duration-500 ease-out rounded-full"
        style={{ width: `${percentage}%` }}
    />
</div>
```

| Property | Value |
|----------|-------|
| Track height | `h-3` (12px) standard, `h-2` (8px) compact, `h-1.5` (6px) inline |
| Track bg | `bg-gray-200 dark:bg-gray-700` |
| Fill color | `bg-brand-accent` |
| Border radius | `rounded-full` |
| Animation | `transition-all duration-500 ease-out` |

#### Progress with Label
```jsx
<div className="flex items-center gap-3">
    <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-brand-accent rounded-full" style={{ width: `${progress}%` }} />
    </div>
    <span className="text-xs font-bold text-gray-500 w-12 text-right">
        {completed} / {total}
    </span>
</div>
```

---

### Status Badges/Pills

#### Status Colors (Student Status)
```jsx
// StatusBadge component patterns
const statusStyles = {
    in_progress: 'bg-brand-accent/10 text-brand-accent border-brand-accent/20',
    stuck: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    question: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    done: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
};
```

| Status | Light BG | Dark BG | Text Light | Text Dark |
|--------|----------|---------|------------|-----------|
| In Progress | `brand-accent/10` | Same | `brand-accent` | Same |
| Stuck | `red-100` | `red-900/30` | `red-600` | `red-400` |
| Question | `amber-100` | `amber-900/30` | `amber-600` | `amber-400` |
| Done | `green-100` | `green-900/30` | `green-600` | `green-400` |

#### Inline Pill (Rounded Full)
```jsx
<span className="px-2 py-0.5 rounded text-xs font-bold uppercase text-center">
    {label}
</span>
```

#### Completion Badge
```jsx
<span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold">
    Completed
</span>
```

---

### Form Input Specifications

#### Standard Input Field (`input-field`)
```css
.input-field {
    @apply w-full px-3 py-2 rounded-lg border-2 transition-all duration-200;
    @apply bg-transparent font-medium;
    @apply text-brand-textDarkPrimary dark:text-brand-textPrimary;
    @apply border-gray-400 dark:border-gray-600;
    @apply placeholder-gray-400 dark:placeholder-gray-500;
    @apply hover:border-gray-600 dark:hover:border-gray-400;
    @apply focus:outline-none focus:border-brand-accent;
}
```

| State | Border (Light) | Border (Dark) |
|-------|----------------|---------------|
| Default | `border-gray-400` | `border-gray-600` |
| Hover | `border-gray-600` | `border-gray-400` |
| Focus | `border-brand-accent` | `border-brand-accent` |

#### Title Input (Underline Style)
Used in TaskManager for task title.

```jsx
className="text-fluid-xl font-bold bg-transparent border-b-2 border-gray-300 dark:border-gray-600 
           focus:border-brand-accent focus:outline-none w-full py-2"
```

---

### Empty State Patterns

#### Standard Empty State
```jsx
<div className="text-center py-12 bg-brand-lightSurface dark:bg-brand-darkSurface rounded-xl border-2 border-gray-200 dark:border-gray-700">
    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-fluid-lg font-bold text-gray-900 dark:text-white mb-1">
        Primary Message
    </h3>
    <p className="text-fluid-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
        Secondary description text.
    </p>
    {/* Optional: CTA or additional content */}
</div>
```

| Element | Property |
|---------|----------|
| Container padding | `py-12` |
| Icon circle | `w-16 h-16 rounded-full` |
| Icon size | `w-8 h-8` |
| Icon color | `text-gray-400` |
| Title | `text-fluid-lg font-bold` |
| Description | `text-fluid-sm text-gray-500` |

---

### Modal Patterns

#### Modal Backdrop
```jsx
className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
```

#### Modal Container
```jsx
className="bg-brand-lightSurface dark:bg-brand-darkSurface w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl border-2 border-gray-200 dark:border-gray-700 flex flex-col"
```

#### Modal Header
```jsx
className="p-6 border-b-2 border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-xl"
```

#### Modal Sizes
| Size | Max Width |
|------|-----------|
| `sm` | `max-w-sm` |
| `md` | `max-w-md` |
| `lg` | `max-w-lg` |
| `xl` | `max-w-xl` |
| `2xl` | `max-w-2xl` |
| `4xl` | `max-w-4xl` |

---

### KPI Stat Tiles (Analytics)

Used in ClassroomManager analytics view.

```jsx
<div className="card-base p-6">
    <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Metric Label</span>
        <Icon className="w-5 h-5 text-{color}-500" />
    </div>
    <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
            {value}
        </span>
        <span className="text-sm text-gray-500">{unit}</span>
    </div>
</div>
```

| Element | Typography | Color |
|---------|------------|-------|
| Label | `text-xs font-bold uppercase tracking-wider` | `text-gray-500` |
| Value | `text-3xl font-bold` | Primary text |
| Unit | `text-sm` | `text-gray-500` |
| Icon | `w-5 h-5` | Semantic (varies) |

---

### Calendar Grid (Reports)

#### Day Header Row
```jsx
<div className="grid grid-cols-7 border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <div key={day} className="p-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
            {day}
        </div>
    ))}
</div>
```

#### Day Cell
```jsx
className={`
    border-b border-r border-gray-200 dark:border-gray-700 p-2 relative cursor-pointer transition-colors
    hover:bg-brand-accent/5
    focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-accent
    ${!isSameMonth ? 'bg-gray-50/50 dark:bg-gray-900/50 text-gray-400' : ''}
    ${isToday ? 'bg-brand-accent/10' : ''}
`}
```

| State | Background |
|-------|------------|
| Default | Transparent |
| Different month | `bg-gray-50/50 dark:bg-gray-900/50` |
| Today | `bg-brand-accent/10` |
| Hover | `bg-brand-accent/5` |
| Focus | Focus ring inset |

---

### Task Card States (LiveView - By Task)

Task cards in LiveView change appearance based on student status.

```jsx
// Determine styling based on student status
let borderColor = 'border-gray-200 dark:border-gray-700';
let bgColor = 'bg-brand-lightSurface dark:bg-brand-darkSurface';
let opacity = 'opacity-100';

if (stuckStudents.length > 0) {
    borderColor = 'border-red-500';
    bgColor = 'bg-red-50 dark:bg-red-900/10';
} else if (questionStudents.length > 0) {
    borderColor = 'border-amber-500';
    bgColor = 'bg-amber-50 dark:bg-amber-900/10';
} else if (activeStudents.length > 0) {
    borderColor = 'border-brand-accent';
} else if (allCompleted) {
    borderColor = 'border-brand-accent/50';
    bgColor = 'bg-brand-accent/5';
    opacity = 'opacity-60 grayscale';
}
```

| Priority | Condition | Border | Background | Opacity |
|----------|-----------|--------|------------|---------|
| 1 (High) | Students stuck | `border-red-500` | `bg-red-50` | 100% |
| 2 | Students with questions | `border-amber-500` | `bg-amber-50` | 100% |
| 3 | Students working | `border-brand-accent` | Default | 100% |
| 4 | All completed | `border-brand-accent/50` | `bg-brand-accent/5` | 60% + grayscale |
| 5 (Low) | No activity | Default gray | Default | 100% |

---

### Loading States

#### Spinner
```jsx
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent" />
```

#### Skeleton Placeholders
```css
.skeleton {
    @apply bg-gray-200 dark:bg-gray-700 rounded animate-pulse;
}

.skeleton-text {
    @apply bg-gray-200 dark:bg-gray-700 rounded animate-pulse h-4 w-full;
}

.skeleton-card {
    @apply bg-gray-200 dark:bg-gray-700 animate-pulse h-20 w-full rounded-xl;
}
```

---

### Student Buckets (LiveView Task View)

Grouped student lists by status within task cards.

```jsx
<div className="flex items-start gap-2 text-sm">
    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase w-20 shrink-0 text-center ${colorClasses}`}>
        {label} ({count})
    </span>
    <div className="flex flex-wrap gap-1 flex-1">
        {students.map(s => (
            <span key={s.uid} className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-black/20 px-1.5 rounded border border-black/5 dark:border-white/5">
                {s.displayName}
            </span>
        ))}
    </div>
</div>
```

| Status | BG Color Classes |
|--------|------------------|
| Stuck | `text-red-600 bg-red-100` |
| Question | `text-amber-600 bg-amber-100` |
| Working | `text-brand-accent bg-brand-accent/10` |
| Done | `text-brand-accent bg-brand-accent/20` |

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
  @apply w-full py-2.5 px-4 rounded-md border-2 transition-all duration-200;
  @apply bg-transparent;
  @apply text-brand-accent font-bold;
  @apply border-brand-accent;
  @apply hover:bg-brand-accent/10;
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

---

## Shape of the Day Presentation Cards

The Shape of the Day view (`ShapeOfDay.tsx`) is designed for classroom projection and presentation. Task cards are optimized for readability at a distance with large typography, clear visual hierarchy, and teacher-friendly presentation features.

### Card Layout Structure

```
┌──────────────────────────────────────────────────────────────┐
│ [4px type-colored left accent bar]                           │
│                                                              │
│  1.2     Task Title                      Due Mon, Dec 16     │
│  ───     ──────────                                          │
│  (underline matches type color)                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Progress: 2/3 complete  ████████████░░░░            │   │ (only for parent tasks)
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Description text with full rich text support...             │
│  - Bullet lists                                              │
│  - **Bold** and *italic*                                     │
│  - Code blocks with copy button                              │
│                                                              │
│  ─────────────────────────────────────────────────────────   │
│  Resources                                                   │
│  [80x80 image] [80x80 image] [📎 document.pdf] [🔗 link]    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Visual Hierarchy

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Task Number | `text-xl` (20px) | `font-black` | Primary text + type-colored underline |
| Task Title | `text-xl` (20px) | `font-black` | Primary text |
| Due Date | `text-sm` | `font-medium` | `gray-400` |
| Description | `text-base` (16px) | Regular | Primary text |
| Resources Label | `text-xs` | `font-semibold` | `gray-400` uppercase |

### Type-Colored Accents

Each task type has a distinct color applied to the left border and number underline:

| Type | Border Color | Tailwind Class |
|------|--------------|----------------|
| Project | Purple | `border-l-purple-500`, `decoration-purple-500` |
| Assignment | Blue | `border-l-blue-500`, `decoration-blue-500` |
| Task | Emerald | `border-l-green-500`, `decoration-emerald-500` |
| Subtask | Orange | `border-l-orange-500`, `decoration-orange-500` |

### Interactive States

```jsx
// Card container classes
className={`
  group bg-brand-lightSurface dark:bg-brand-darkSurface 
  border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5
  border-l-4 ${typeBorderColor}
  transition-all duration-200
  hover:border-brand-accent/50 hover:shadow-lg hover:shadow-brand-accent/5
  hover:-translate-y-0.5 relative cursor-pointer
  ${task.status === 'done' ? 'opacity-60' : ''}
`}
```

- **Hover:** Accent-tinted border, shadow elevation, slight lift (`-translate-y-0.5`)
- **Completed:** 60% opacity, strikethrough title
- **Double-click:** Toggles description expand/collapse

### Description Rendering

Descriptions support full rich text from TipTap editor via `CodeBlockRenderer`:

#### Prose Styling
- Uses Tailwind Typography plugin (`prose prose-lg dark:prose-invert`)
- Line-clamped to 3 lines when collapsed
- Expand/collapse via chevron button or double-click

#### Code Blocks
```jsx
// Code block styling in CodeBlockRenderer
<pre className="relative rounded-lg overflow-hidden border-2 border-gray-400 dark:border-gray-600">
  <button className="absolute top-4 right-4 p-1.5 rounded bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white z-10">
    {/* Copy button */}
  </button>
  <code style={{ padding: '16px', display: 'block' }}>
    {/* Syntax-highlighted code */}
  </code>
</pre>
```

Features:
- 16px internal padding
- Copy button in top-right corner
- Syntax highlighting via lowlight
- Dark background (`bg-gray-900`)

#### CSS Classes for Rendered Content
Located in `index.css` under `.code-block-renderer`:

```css
/* List styling */
.code-block-renderer ol { list-style-type: decimal; padding-left: 1.5rem; }
.code-block-renderer ul { list-style-type: disc; padding-left: 1.5rem; }

/* Headings */
.code-block-renderer h1 { font-size: 1.75rem; font-weight: 700; }
.code-block-renderer h2 { font-size: 1.375rem; font-weight: 700; }
.code-block-renderer h3 { font-size: 1.125rem; font-weight: 600; }

/* Inline code */
.code-block-renderer code:not(pre code) {
  background-color: rgba(59, 130, 246, 0.1);
  padding: 0.15rem 0.4rem;
  border-radius: 0.25rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #3b82f6;
}
```

### Resources Display

Resources appear in a dedicated row below the description (only when expanded):

```jsx
<div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
    Resources
  </div>
  <div className="flex flex-wrap items-center gap-3">
    {/* Image thumbnails, file attachments, links */}
  </div>
</div>
```

#### Image Thumbnails
- Size: `80x80px` (`w-20 h-20`)
- Border: `border-2 border-gray-200 dark:border-gray-700`
- Hover: `hover:border-brand-accent`
- Object fit: `cover` with `rounded-lg`

#### File Attachments
- Semantic file icons with type-specific colors:
  - 📷 Images: Pink (`text-pink-500`)
  - 🎬 Video: Purple (`text-purple-500`)
  - 🎵 Audio: Cyan (`text-cyan-500`)
  - 📊 Spreadsheets: Green (`text-green-500`)
  - 📑 Presentations: Orange (`text-orange-500`)
  - 📕 PDF: Red (`text-red-500`)
- Background: `bg-gray-100 dark:bg-gray-800`
- Shows filename and size on hover

#### Link Cards
```jsx
<a className="flex items-center gap-2 px-3 py-2 rounded-lg
    bg-brand-accent/5 border border-brand-accent/20
    hover:bg-brand-accent/10 transition-colors">
  <ExternalLink size={16} className="text-brand-accent" />
  <div className="flex flex-col">
    <span className="text-sm font-medium">{domain}</span>
    <span className="text-xs text-gray-400 truncate max-w-[200px]">{url}</span>
  </div>
</a>
```

### Progress Bar for Parent Tasks

Tasks with children display a completion progress bar:

```jsx
{hasChildren && (
  <div className="mt-2">
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span className="font-medium">{completedChildren}/{childTasks.length} complete</span>
    </div>
    <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div 
        className="h-full bg-brand-accent rounded-full transition-all duration-300"
        style={{ width: `${(completedChildren / childTasks.length) * 100}%` }}
      />
    </div>
  </div>
)}
```

### Completed Task Styling

When `task.status === 'done'`:
- Card opacity: `opacity-60`
- Title: `line-through decoration-2 decoration-gray-400`

### Presentation Mode Features

#### Fullscreen Toggle
- Button location: Header row, right of "Active Students" badge
- Icon: `Maximize2` / `Minimize2` from Lucide
- Keyboard shortcut: **F** key
- Exit: **Escape** key or click button
- Fullscreen adds `p-6` padding to container

```jsx
<button
  onClick={toggleFullscreen}
  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-accent hover:bg-brand-accent/10"
  title={isFullscreen ? 'Exit Fullscreen (F or Esc)' : 'Enter Fullscreen (F)'}
>
  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
</button>
```

#### Double-Click to Expand
- Double-clicking any task card toggles expand/collapse
- Same behavior as the chevron button

#### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| **F** | Toggle fullscreen mode |
| **Escape** | Exit fullscreen mode |

### Header Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Dec 12, 2024    👥 3 Active    [⛶]     │     Join at: domain/join     │
│  ─────────────                          │     Class Code: ABC123       │
│  Class Name Here                        │     [QR Code]                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Date picker:** Accent-styled pill button with calendar icon
- **Active students:** Emerald-styled pill, clickable to navigate to LiveView
- **Fullscreen button:** Gray icon, accent on hover
- **QR Code:** 80x80px, links to join URL with class code

### Hierarchical Indentation

Child tasks indent by `32px` per depth level:

```jsx
style={{
  marginLeft: `${depth * 32}px`,
  width: `calc(100% - ${depth * 32}px)`
}}
```

### Accessibility

- `tabIndex={0}` for keyboard focus
- `role="article"` semantic role
- `aria-label={`Task: ${task.title}`}` for screen readers
- Chevron button includes descriptive accessibility text
