---
trigger: manual
---

# FLOATING TILES DESIGN SYSTEM - ADDITIONS

The following specifications should be added to `layeredshadows.md` to complete the design system.

---

## ADVANCED EFFECTS

### D. Shadow Expansion on Hover

When an element is hovered, the shadow should expand to simulate the object rising closer to the light source.

**CSS Rule (shadow-layered-lg):**
```css
box-shadow:
  0 20px 40px -8px rgba(0, 0, 0, 0.6),
  0 8px 16px -4px rgba(0, 0, 0, 0.4),
  inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
```

### E. Neon/Glow Effects

For active states, progress bars, or accent emphasis, apply a colored glow.

**CSS Rule:**
```css
box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);  /* Blue glow */
box-shadow: 0 0 10px rgba(16, 185, 129, 0.5);  /* Emerald glow */
box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);   /* Red glow */
```

**Tailwind:** `shadow-[0_0_10px_rgba(59,130,246,0.5)]`

### F. Gradient Blob Backgrounds (Glassmorphism Context)

Glassmorphism requires background elements to be visible through the blur.

**Tailwind Example:**
```html
<div class="absolute top-20 left-10 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
<div class="absolute bottom-20 right-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
```

**Properties:**
- Position: `absolute`, distributed across background
- Size: Large (`w-48` to `w-64`)
- Opacity: Low (20% or less)
- Blur: `blur-3xl` (48px)
- Animation: Optional `animate-pulse`

---

## UI CHROME

### G. Custom Scrollbar Styling

**CSS Rule:**
```css
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #0f1115; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #475569; }
```

### H. Background Patterns (Preview/Empty States)

Subtle dot grid for preview areas or empty states.

**CSS Rule:**
```css
background-image: radial-gradient(#334155 1px, transparent 1px);
background-size: 20px 20px;
```

---

## NAVIGATION & STATES

### I. Navigation Active State

For sidebar/menu items, indicate active state with left border and background tint.

**CSS Rule:**
```css
.nav-item.active {
    color: white;
    background-color: rgba(255, 255, 255, 0.05);
    border-left: 3px solid #3b82f6;
}
```

**Tailwind:** `text-white bg-white/5 border-l-[3px] border-blue-500`

---

## ANIMATION TIMING

### J. Precise Timing Functions

For the "weightless" feel, use specific cubic-bezier values.

**CSS Rule:**
```css
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
```

**Duration:** Always `300ms` for hover/lift effects.
