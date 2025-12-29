---
trigger: always_on
---

# UI Rules (Dynamic Theme System)

This document defines the **dynamic ground truth** for all UI elements in the application. It replaces fixed hex codes with CSS variables to support the Autonomous Theme System.

---

## I. COLOR PALETTE (Dynamic Variables)

### A. Background & Surfaces

| Token | Previous Hex | Usage |
|-------|--------------|-------|
| `--bg-page` | `#0f1115` | Deepest void / page background |
| `--bg-tile-alt` | `#151921` | Recessed layer / inset surfaces |
| `--bg-tile` | `#1a1d24` | Standard floating surface |
| `--bg-tile-hover` | `#1e2128` | Elevated hover state |

### B. Borders

| Token | Usage |
|-------|-------|
| `--color-border-subtle` | Default borders (card edges, dividers) |
| `--color-border-strong` | Hover states, active borders |
| `--color-horizon-highlight` | Top-edge highlight for "Horizon" effect |

### C. Text Colors

| Token | Tailwind Class | Usage |
|-------|----------------|-------|
| `--color-brand-textPrimary` | `text-brand-textPrimary` | Primary text (Headings, Body) |
| `--color-brand-textSecondary` | `text-brand-textSecondary` | Secondary text (Metadata, Subtitles) |
| `--color-brand-textMuted` | `text-brand-textMuted` | Muted/Disabled text |
| `--color-brand-accent` | `text-brand-accent` | Interactive links/icons |

### D. Visual Fidelity

| Token | Usage |
|-------|-------|
| `--glow-opacity` | Opacity for neon/ambient glow effects (0.0 to 0.06) |
| `--color-horizon-highlight` | Top-border highlight color (transparent or accent) |
| `--timing-weightless` | Standard cubic-bezier(0.4, 0, 0.2, 1) |

---

## II. SHADOW SYSTEM

### A. Shadow Tokens

```css
/* Dynamic shadows controlled by elevation settings */
--shadow-layered-sm: ...; /* Small shadow for icons/buttons */
--shadow-layered: ...;    /* Standard shadow for cards */
--shadow-layered-lg: ...; /* Large shadow for hover/modals */
```

### B. Usage

**DO NOT use hardcoded arbitrary shadow strings.**

- **Cards/Tiles**: `shadow-layered`
- **Hover States**: `shadow-layered-lg`
- **Small Buttons**: `shadow-layered-sm`

---

## III. ANIMATION & ELEVATION

### A. Transition Utility
```css
.transition-float {
    transition-property: transform, box-shadow, background-color, border-color, opacity;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
}
```

### B. Universal Lift Utilities

Instead of `hover:-translate-y-0.5`, use:

- **`.lift-dynamic`**: For cards and large tiles.
- **`.button-lift-dynamic`**: For buttons and smaller interactive elements.

These utilities respect the user's `elevationLevel` setting (whisper, gentle, float, lift, dramatic).

### C. Elevation Tokens

| Token | Usage |
|-------|-------|
| `--elevation-tile-default` | Base Y-transform for tiles (-4px to 0px) |
| `--elevation-tile-hover` | Hover Y-transform for tiles (-3px to -1px) |
| `--elevation-button-hover` | Hover Y-transform for buttons |

---

## IV. COMPONENT PATTERNS (Refactored Ground Truth)

### A. Content Header (Ground Truth)

```tsx
<div className="hidden lg:flex h-16 flex-shrink-0 items-center justify-between">
    <div className="flex items-baseline gap-3">
        <span className="text-fluid-lg font-black text-brand-textPrimary">
            Classrooms:
        </span>
        <span className="text-fluid-lg font-black text-brand-textPrimary underline decoration-brand-accent decoration-2 underline-offset-4">
            {currentClass?.name || 'None Selected'}
        </span>
    </div>
    
    <button
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-float self-end
            bg-[var(--color-bg-tile)] border border-[var(--color-border-subtle)] text-brand-textPrimary
            shadow-layered
            hover:shadow-layered-lg
            button-lift-dynamic hover:border-brand-accent/50"
    >
        <Plus className="w-5 h-5 text-brand-accent" />
        <span>Create Class</span>
    </button>
</div>
```

### B. Sidebar Nav Item

```tsx
<button 
    className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
    /* ... */
>
    {/* ... */}
</button>
```

**CSS Definition:**
```css
.nav-item {
    background-color: var(--color-bg-tile);
    border: 1px solid var(--color-border-subtle);
    box-shadow: var(--shadow-layered-lg);
    color: var(--color-brand-textSecondary);
    transform: translateY(var(--elevation-tile-default, -4px));
}

.nav-item:hover {
    transform: translateY(var(--elevation-tile-hover, -3px));
    border-color: var(--color-brand-accent);
    color: var(--color-brand-textPrimary);
}

.nav-item.active {
    color: var(--color-brand-textPrimary);
    background-color: var(--color-bg-tile);
    /* Dynamic top border for horizon effect */
    border-top: 0.5px solid var(--color-horizon-highlight); 
}
```

### C. Floating Tile (ClassCard)

```tsx
<div
    className={`group relative flex flex-col h-full rounded-2xl cursor-pointer overflow-hidden 
    levitated-tile ${isSelected ? 'active' : ''}`}
    /* ... */
>
```

**Rationale for UI Rules:**
.levitated-tile uses transforms and large shadows. Without `overflow: visible`, these effects extend beyond the tile's bounds and get clipped by the default `overflow: hidden` behavior. This is especially critical for tiles inside scrollable containers or flex layouts.

**CSS Definition:**
```css
.levitated-tile {
    background-color: var(--color-bg-tile);
    border: 1px solid var(--color-border-subtle);
    box-shadow: var(--shadow-layered-lg);
    transform: translateY(var(--elevation-tile-default, -4px));
    overflow: visible; /* CRITICAL: Prevents shadow/elevation clipping */
}
```

### D. Nested Tile Button (Action Footer)

```tsx
<button className={`group/btn relative flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 px-1
    rounded-xl transition-float border
    bg-[var(--color-bg-tile)] shadow-layered
    hover:shadow-layered-lg button-lift-dynamic
    ${isSelected
        ? 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-[var(--color-bg-tile-hover)] border-[var(--color-border-subtle)] hover:border-brand-accent/50'
        : 'border-white/5 cursor-default'}`}
>
    {/* ... icon and label ... */}
</button>
```

### E. Join Code Box

```tsx
<div className={`w-full group/code relative flex items-center justify-between p-2.5
    rounded-xl transition-float border cursor-pointer
    bg-[var(--color-bg-tile)] shadow-layered
    hover:shadow-layered-lg hover:-translate-y-0.5
    ${isSelected
        ? 'text-brand-textSecondary hover:text-brand-textPrimary hover:bg-[var(--color-bg-tile-hover)] border-[var(--color-border-subtle)] hover:border-brand-accent/50'
        : 'border-white/5 cursor-default'}`}
>
   {/* ... code content ... */}
</div>
```

---

## V. BORDER RADIUS HIERARCHY

| Level | Tailwind | Pixels |
|-------|----------|--------|
| Container | `rounded-2xl` | 16px |
| Nested | `rounded-xl` | 12px |
| Small | `rounded-lg` | 8px |
| Micro | `rounded-md` | 6px |

---

## VI. KEY REFACTORING RULES

1. **NO Hardcoded Colors**: Never use `bg-[#1a1d24]`, `text-[#94a3b8]`, etc. Use `bg-[var(--color-bg-tile)]`, `text-brand-textSecondary`.
2. **NO `dark:` Classes**: The system is autonomous. Do not write `text-gray-900 dark:text-white`. Use `text-brand-textPrimary`.
3. **NO Hardcoded Shadows**: Do not use arbitrary shadow strings. Use `shadow-layered` class or `var(--shadow-layered)` variable.
4. **Use Elevation Utilities**: Prefer `.lift-dynamic` over manual `hover:-translate-y-x`.
