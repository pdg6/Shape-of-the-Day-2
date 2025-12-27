---
trigger: always_on
---

# Floating Elements Design System v2.0

This document defines the **ground truth** for all floating UI elements in the application. It establishes two primary component categories that serve as the foundation for the entire design:

1. **Floating Buttons** (sidebar nav-items) → Foundation for all free-floating buttons
2. **Floating Tiles** (ClassCard) → Foundation for all tiles, modals, and containers

---

## I. COLOR PALETTE (Dark Slate Theme)

### A. Background Hierarchy

The system uses a strict 4-tier depth hierarchy. Pure black is **never** used.

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-page` | `#0f1115` | Deepest void / page background |
| `--bg-tile-alt` | `#151921` | Recessed layer / inset surfaces |
| `--bg-tile` | `#1a1d24` | Standard floating surface |
| `--bg-tile-hover` | `#1e2128` | Elevated hover state |

### B. Brand Accent

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-brand-accent` | `#3b82f6` | Blue accent for borders, icons, glows |
| `--color-brand-accent-dark` | `#1D4ED8` | Darker blue for text (AAA compliant) |

### C. Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--text-primary` | `#F2EFEA` | Primary text on dark backgrounds |
| `--text-secondary` | `#A8A29D` | Secondary/muted text |
| `--text-muted` | `#64748b` | Labels, placeholders (gray-500) |
| `--text-muted-hover` | `#94a3b8` | Muted text on hover (gray-400) |

---

## II. SHADOW SYSTEM

### A. Light Mode Shadows

```css
--shadow-layered-sm: 0 1px 2px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(0, 0, 0, 0.05);
--shadow-layered: 0 4px 6px rgba(0, 0, 0, 0.05), 0 12px 24px rgba(0, 0, 0, 0.05), 0 24px 48px rgba(0, 0, 0, 0.05);
--shadow-layered-lg: 0 15px 30px rgba(0, 0, 0, 0.08), 0 30px 60px rgba(0, 0, 0, 0.1);
```

### B. Dark Mode Shadows (Ground Truth)

```css
--shadow-layered-sm:
    0 2px 4px -1px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.05);

--shadow-layered:
    0 10px 15px -3px rgba(0, 0, 0, 0.5),
    0 4px 6px -2px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.1);

--shadow-layered-lg:
    0 20px 40px -8px rgba(0, 0, 0, 0.6),
    0 8px 16px -4px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
```

### C. Tile Button Shadow (Nested Buttons in Tiles)

```css
/* Default state */
shadow: 0 4px 12px -2px rgba(0,0,0,0.5), 0 2px 4px -1px rgba(0,0,0,0.3), inset 0 1px 0 0 rgba(255,255,255,0.1);

/* Hover state */
shadow-hover: 0 8px 20px -4px rgba(0,0,0,0.6), 0 4px 8px -2px rgba(0,0,0,0.4);
```

---

## III. TYPOGRAPHY

### A. Font Stack

```css
font-family: 'Inter', system-ui, sans-serif;
```

Import: `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">`

### B. Weight & Size Tokens

| Name | Weight | Usage |
|------|--------|-------|
| `font-bold` | 700 | Buttons, titles |
| `font-black` | 900 | Emphasis labels (TASKS, SHAPE) |

---

## IV. ANIMATION & TIMING

### A. Timing Function (Weightless Physics)

```css
transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
```

### B. Transition Utility

```css
.transition-float {
    transition-property: transform, box-shadow, background-color, border-color, opacity;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
}
```

### C. Duration Rules

- Hover/lift effects: **300ms**
- Color transitions: **200ms**
- Opacity fades: **300ms**

---

## V. BORDER RADIUS HIERARCHY

| Level | Radius | Usage |
|-------|--------|-------|
| Container (outermost) | `rounded-2xl` (16px) | Tiles, modals, cards |
| Nested elements | `rounded-xl` (12px) | Buttons inside tiles, inputs |
| Small elements | `rounded-lg` (8px) | Icons, badges, chips |
| Micro elements | `rounded-md` (6px) | Tiny indicators |

---

## VI. FLOATING BUTTON (Ground Truth: Sidebar Nav Item)

The sidebar navigation item is the **foundation for all free-floating buttons**.

### A. CSS Class: `.nav-item`

```css
.nav-item {
    /* Layout */
    position: relative;
    display: flex;
    align-items: center;
    overflow: hidden;
    
    /* Typography */
    font-weight: 700; /* bold */
    
    /* Shape */
    border-radius: 12px; /* rounded-xl */
    
    /* Surface */
    background-color: #1a1d24; /* --bg-tile */
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    /* Depth */
    box-shadow: var(--shadow-layered-lg);
    transform: translateY(-4px);
    
    /* Transition */
    transition: transform 300ms, box-shadow 300ms, background-color 300ms, border-color 300ms, opacity 300ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    
    /* Text */
    color: #64748b; /* gray-500 */
}
```

### B. Hover State

```css
.nav-item:hover {
    transform: translateY(-3px);
    border-color: #3b82f6; /* brand-accent */
    color: #94a3b8; /* lighter gray */
}
```

### C. Active State (Horizon Etched)

```css
.nav-item.active {
    color: white;
    background-color: #1a1d24;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-top: 0.5px solid #3b82f6; /* accent top edge */
    box-shadow:
        inset 0 3px 6px -2px rgba(29, 78, 216, 0.5), /* internal blue glow */
        var(--shadow-layered-lg);
    transform: translateY(-4px);
}

.nav-item.active svg {
    color: #3b82f6;
    filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
}
```

---

## VII. FLOATING TILE (Ground Truth: ClassCard)

The ClassCard is the **foundation for all tiles, modals, and large containers**.

### A. CSS Class: `.levitated-tile`

```css
.levitated-tile {
    /* Shape */
    border-radius: 16px; /* rounded-2xl */
    
    /* Surface */
    background-color: #1a1d24; /* --bg-tile */
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    /* Depth */
    box-shadow: var(--shadow-layered-lg);
    transform: translateY(-4px);
    
    /* Transition */
    transition: transform 300ms, box-shadow 300ms, background-color 300ms, border-color 300ms, opacity 300ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### B. Active/Selected State

```css
.levitated-tile.active {
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-top: 0.5px solid #3b82f6;
    box-shadow:
        inset 0 3px 6px -2px rgba(29, 78, 216, 0.5),
        var(--shadow-layered-lg);
    transform: translateY(-4px);
}
```

---

## VIII. NESTED TILE BUTTON (Ground Truth: ClassCard Action Buttons)

Buttons that live **inside tiles** have a specific styling to appear elevated within their container.

### A. Base Styling

```css
/* Layout */
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
gap: 6px; /* gap-1.5 */
padding: 10px 4px; /* py-2.5 px-1 */

/* Shape */
border-radius: 12px; /* rounded-xl */

/* Surface */
background-color: #1a1d24; /* --bg-tile */
border: 1px solid rgba(255, 255, 255, 0.1); /* border-white/10 */

/* Depth */
box-shadow:
    0 4px 12px -2px rgba(0,0,0,0.5),
    0 2px 4px -1px rgba(0,0,0,0.3),
    inset 0 1px 0 0 rgba(255,255,255,0.1);

/* Text */
color: #94a3b8; /* slate-400 */
```

### B. Hover State

```css
/* Hover - Lift and expand shadow */
transform: translateY(-2px); /* -translate-y-0.5 */
background-color: #1e2128; /* slightly lighter */
border-color: rgba(59, 130, 246, 0.5); /* brand-accent/50 */

box-shadow:
    0 8px 20px -4px rgba(0,0,0,0.6),
    0 4px 8px -2px rgba(0,0,0,0.4);

/* Icon turns accent color */
svg: color: #3b82f6;

/* Text turns white */
color: white;
```

### C. Icon Styling

```css
/* Default */
width: 16px; /* w-4 */
height: 16px; /* h-4 */
color: inherit;
transition: color 200ms;

/* Hover (when parent is hovered) */
color: #3b82f6; /* brand-accent */
```

### D. Label Styling

```css
font-size: 9px; /* text-[9px] */
font-weight: 900; /* font-black */
text-transform: uppercase;
letter-spacing: 0.1em; /* tracking-widest */
```

---

## IX. GLASS PANEL (Overlay Variant)

For differentiated containers like the Overview card.

```css
.glass-panel {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: var(--shadow-layered);
}
```

---

## X. SCROLLBAR STYLING

```css
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: #0f1115; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #475569; }
```

---

## XI. SIDEBAR SPACING

| Location | Spacing | Tailwind |
|----------|---------|----------|
| Top nav buttons | 4px gap | `space-y-1` |
| Bottom utility buttons | 16px gap | `space-y-4` |
| Button height | 48px | `h-12` |

---

## XII. EXTERNAL DEPENDENCIES

- **Icons**: Lucide React (`lucide-react`)
- **Charts**: Chart.js (`https://cdn.jsdelivr.net/npm/chart.js`)
- **Fonts**: Inter via Google Fonts

---

## XIII. QUICK REFERENCE: Tailwind Classes

### Floating Button (Nav Item)
```
bg-[#1a1d24] border border-white/10 rounded-xl shadow-layered-lg -translate-y-1 transition-float
hover:border-brand-accent hover:-translate-y-0.5
active: text-white border-t-[0.5px] border-t-brand-accent shadow-[inset_0_3px_6px_-2px_rgba(29,78,216,0.5)]
```

### Floating Tile
```
bg-[#1a1d24] border border-white/10 rounded-2xl shadow-layered-lg -translate-y-1 transition-float
active: text-white border-t-[0.5px] border-t-brand-accent shadow-[inset_0_3px_6px_-2px_rgba(29,78,216,0.5)]
```

### Nested Tile Button
```
bg-[#1a1d24] border border-white/10 rounded-xl 
shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)]
hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.6),0_4px_8px_-2px_rgba(0,0,0,0.4)]
hover:-translate-y-0.5 hover:bg-[#1e2128] hover:border-brand-accent/50
hover:text-white group-hover:text-brand-accent (for icons)
```
