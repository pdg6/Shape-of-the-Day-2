---
trigger: always_on
---

# Floating Elements Design System v3.0

This document defines the **ground truth** for all UI elements in the application, based on the Classrooms page implementation. It establishes component categories that serve as the foundation for the entire design.

---

## I. COLOR PALETTE (Dark Slate Theme)

### A. Background Hierarchy

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
| `--color-brand-accent-dark` | `#1D4ED8` | Darker blue for text |

### C. Text Colors

| Token | Hex | Tailwind | Usage |
|-------|-----|----------|-------|
| Primary | `#F2EFEA` | `text-brand-textPrimary` | Primary text (dark mode) |
| Primary Dark | - | `text-brand-textDarkPrimary` | Primary text (light mode) |
| Secondary | `#A8A29D` | `text-brand-textDarkSecondary` | Secondary text |
| Muted | `#64748b` | `text-gray-500` | Labels, placeholders |
| Muted Hover | `#94a3b8` | `text-gray-400` | Muted text on hover |
| White | `#ffffff` | `text-white` | Selected/active state |

---

## II. SHADOW SYSTEM

### A. Shadow Tokens

```css
/* Small shadow - for icons, small buttons */
--shadow-layered-sm:
    0 2px 4px -1px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.05);

/* Standard shadow */
--shadow-layered:
    0 10px 15px -3px rgba(0, 0, 0, 0.5),
    0 4px 6px -2px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.1);

/* Large shadow - for tiles, modals */
--shadow-layered-lg:
    0 20px 40px -8px rgba(0, 0, 0, 0.6),
    0 8px 16px -4px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.15);
```

### B. Tile Button Shadow (Inline Tailwind)

```css
/* Default */
shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)]

/* Hover */
shadow-[0_8px_20px_-4px_rgba(0,0,0,0.6),0_4px_8px_-2px_rgba(0,0,0,0.4)]
```

---

## III. TYPOGRAPHY

### A. Font Stack
```css
font-family: 'Inter', system-ui, sans-serif;
```

### B. Weight Tokens

| Class | Weight | Usage |
|-------|--------|-------|
| `font-bold` | 700 | Buttons, titles, card names |
| `font-black` | 900 | Labels (uppercase), emphasis |

### C. Label Pattern (Ground Truth)
```css
text-[10px] font-bold uppercase tracking-wider
/* or */
text-[9px] font-black uppercase tracking-widest
```

---

## IV. ANIMATION & TIMING

### A. Transition Utility
```css
.transition-float {
    transition-property: transform, box-shadow, background-color, border-color, opacity;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 300ms;
}
```

### B. Hover Lift Effect
```
hover:-translate-y-0.5
```

---

## V. BORDER RADIUS HIERARCHY

| Level | Tailwind | Pixels | Usage |
|-------|----------|--------|-------|
| Container | `rounded-2xl` | 16px | Tiles, modals, cards |
| Nested | `rounded-xl` | 12px | Buttons, inputs |
| Small | `rounded-lg` | 8px | Icons, badges |
| Micro | `rounded-md` | 6px | Tiny indicators |

---

## VI. CONTENT HEADER (Ground Truth: ClassroomManager)

### A. Container
```tsx
<div className="hidden lg:flex h-16 flex-shrink-0 items-center justify-between">
```

### B. Left Section (Title)
```tsx
<div className="flex items-baseline gap-3">
    <span className="text-fluid-lg font-black text-white">
        Classrooms:
    </span>
    <span className="text-fluid-lg font-black text-brand-textDarkPrimary dark:text-brand-textPrimary underline decoration-brand-accent decoration-2 underline-offset-4">
        {currentClass?.name || 'None Selected'}
    </span>
</div>
```

### C. Right Section (Action Button)
```tsx
<button
    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-float self-end
        bg-[#1a1d24] border border-white/10 text-white
        shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)]
        hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.6),0_4px_8px_-2px_rgba(0,0,0,0.4)]
        hover:-translate-y-0.5 hover:border-brand-accent/50"
>
    <Plus className="w-5 h-5 text-brand-accent" />
    <span>Create Class</span>
</button>
```

Key properties:
- `py-2.5` for vertical padding (not fixed height)
- `self-end` aligns button to bottom of header
- Icon size: `w-5 h-5` with `text-brand-accent`

---

## VII. SIDEBAR NAV ITEM (Ground Truth: TeacherDashboard)

### A. CSS Class: `.nav-item`
```css
.nav-item {
    position: relative;
    display: flex;
    align-items: center;
    overflow: hidden;
    font-weight: 700;
    border-radius: 12px;
    background-color: #1a1d24;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: var(--shadow-layered-lg);
    transform: translateY(-4px);
    transition: transform 300ms, box-shadow 300ms, background-color 300ms, border-color 300ms, opacity 300ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    color: #64748b;
}

.nav-item:hover {
    transform: translateY(-3px);
    border-color: #3b82f6;
    color: #94a3b8;
}

.nav-item.active {
    color: white;
    border-top: 0.5px solid #3b82f6;
    box-shadow: inset 0 3px 6px -2px rgba(29, 78, 216, 0.5), var(--shadow-layered-lg);
}

.nav-item.active svg {
    color: #3b82f6;
    filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
}
```

### B. Main Nav Button Layout
```tsx
<button className={`nav-item ${activeTab === item.id ? 'active' : ''} ${isCollapsed ? 'lg:w-12 lg:h-12 lg:justify-center w-full h-12' : 'w-full h-12 px-2'}`}>
    <div className="flex items-center justify-center w-12 shrink-0">
        <ItemIcon size={20} className={activeTab === item.id ? 'text-brand-accent' : ''} />
    </div>
    <span className={`whitespace-nowrap ${isCollapsed ? 'lg:w-0 lg:opacity-0' : 'opacity-100 ml-1'}`}>
        {item.label}
    </span>
</button>
```

---

## VIII. SIDEBAR SUBMENU (Accordion Pattern)

### A. Toggle Behavior
- Click parent opens/closes submenu (exclusive accordion)
- Opening one menu closes all others
- Submenus work in both expanded and collapsed sidebar states

### B. Submenu Container
```tsx
<div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
    ${isMenuOpen ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}`}
>
    <ul className={`min-h-0 overflow-hidden ${isCollapsed ? 'ml-0 pl-0 flex flex-col items-center' : 'ml-6 pl-4'} space-y-1 list-none m-0 p-0 py-2`}>
```

### C. Submenu Item Button
```tsx
<button
    className={`${isCollapsed ? 'w-10 h-10 p-0 justify-center' : 'w-full text-left p-2.5'} 
        text-xs rounded-xl font-bold transition-float hover:-translate-y-0.5 flex items-center gap-2 border
        ${isActive 
            ? 'text-brand-accent bg-brand-accent/5 border-brand-accent/20 shadow-layered-sm' 
            : 'text-brand-textDarkSecondary dark:text-gray-400 hover:text-brand-accent hover:bg-white dark:hover:bg-brand-accent/5 border-transparent hover:border-brand-accent/20 shadow-none hover:shadow-layered-sm'}
        group/item`}
    title={label}
>
    <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-300 shadow-layered-sm 
        ${isActive ? 'bg-brand-accent/10' : 'bg-slate-100 dark:bg-white/10 group-hover/item:bg-brand-accent/10 group-hover/item:scale-110'}`}>
        <Icon size={14} className="transition-transform group-hover/item:scale-110" />
    </div>
    <span className={`${isCollapsed ? 'hidden' : ''}`}>{label}</span>
</button>
```

---

## IX. FLOATING TILE (Ground Truth: ClassCard)

### A. CSS Class: `.levitated-tile`
```css
.levitated-tile {
    border-radius: 16px;
    background-color: #1a1d24;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: var(--shadow-layered-lg);
    transform: translateY(-4px);
    transition: transform 300ms, box-shadow 300ms, background-color 300ms, border-color 300ms, opacity 300ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

.levitated-tile.active {
    color: white;
    border-top: 0.5px solid #3b82f6;
    box-shadow: inset 0 3px 6px -2px rgba(29, 78, 216, 0.5), var(--shadow-layered-lg);
}
```

### B. Card Header
```tsx
<div className="h-20 p-6 relative flex justify-between items-start">
    <div className="z-10 w-full min-w-0">
        <h3 className={`text-xl font-bold leading-tight mb-1 truncate ${isSelected ? 'text-white' : 'text-brand-textDarkPrimary dark:text-brand-textPrimary'}`}>
            {title}
        </h3>
        <p className={`text-xs font-medium ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
            {subtitle}
        </p>
    </div>
</div>
```

### C. Card Stats Row
```tsx
<button className={`flex-1 text-left -m-2 p-2 rounded-xl transition-float hover:-translate-y-0.5 border border-transparent
    ${isSelected ? 'hover:bg-slate-50 dark:hover:bg-white/[0.03] hover:border-slate-200 dark:hover:border-white/5 shadow-layered-sm hover:shadow-layered-lg' : ''}`}
>
    <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>Label</p>
    <span className={`text-2xl font-bold ${isSelected ? 'text-white' : 'text-brand-textDarkPrimary dark:text-brand-textPrimary'}`}>
        {value}
    </span>
</button>
```

---

## X. NESTED TILE BUTTON (Ground Truth: ClassCard Action Footer)

### A. Button Grid Container
```tsx
<div className={`p-3 transition-opacity duration-300 ${isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'}`}>
    <div className="flex gap-2">
```

### B. Action Button
```tsx
<button className={`group/btn relative flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 px-1
    rounded-xl transition-float border
    bg-[#1a1d24] shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)]
    hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.6),0_4px_8px_-2px_rgba(0,0,0,0.4)] hover:-translate-y-0.5
    ${isSelected
        ? 'text-slate-400 hover:text-white hover:bg-[#1e2128] border-white/10 hover:border-brand-accent/50'
        : 'border-white/5 cursor-default'}`}
>
    <Icon className={`w-4 h-4 transition-colors ${isSelected ? 'group-hover/btn:text-brand-accent' : ''}`} />
    <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'group-hover/btn:text-white' : ''}`}>
        {label}
    </span>
</button>
```

---

## XI. JOIN CODE BOX (Inline Button Pattern)

```tsx
<div className={`w-full group/code relative flex items-center justify-between p-2.5
    rounded-xl transition-float border cursor-pointer
    bg-[#1a1d24] shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)]
    hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.6),0_4px_8px_-2px_rgba(0,0,0,0.4)] hover:-translate-y-0.5
    ${isSelected
        ? 'text-slate-400 hover:text-white hover:bg-[#1e2128] border-white/10 hover:border-brand-accent/50'
        : 'border-white/5 cursor-default'}`}
>
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Code</span>
    <span className={`font-mono font-bold text-lg tracking-widest ${isSelected ? 'text-white group-hover/code:text-brand-accent' : ''}`}>
        {code}
    </span>
</div>
```

---

## XII. SPACING TOKENS

| Location | Spacing | Tailwind |
|----------|---------|----------|
| Header height | 64px | `h-16` |
| Nav button height | 48px | `h-12` |
| Nav button spacing | 4px | `space-y-1` |
| Bottom utility spacing | 16px | `space-y-4` |
| Card padding | 24px | `p-6` |
| Card footer padding | 12px | `p-3` |
| Button gap | 8px | `gap-2` |
| Submenu left margin | 24px | `ml-6` |

---

## XIII. EXTERNAL DEPENDENCIES

- **Icons**: Lucide React (`lucide-react`)
- **Fonts**: Inter via Google Fonts
- **Charts**: Chart.js (optional)

---

## XIV. QUICK REFERENCE

### Header Action Button
```
flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-float self-end
bg-[#1a1d24] border border-white/10 text-white
shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)]
hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.6),0_4px_8px_-2px_rgba(0,0,0,0.4)]
hover:-translate-y-0.5 hover:border-brand-accent/50
```

### Floating Tile
```
rounded-2xl levitated-tile
active: .levitated-tile.active
```

### Nested Tile Button
```
flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 px-1
rounded-xl transition-float border bg-[#1a1d24] border-white/10
shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)]
hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.6),0_4px_8px_-2px_rgba(0,0,0,0.4)]
hover:-translate-y-0.5 hover:bg-[#1e2128] hover:border-brand-accent/50
hover:text-white group-hover:text-brand-accent (for icons)
```

### Submenu Item
```
w-full text-left p-2.5 text-xs rounded-xl font-bold transition-float hover:-translate-y-0.5 flex items-center gap-2 border
text-gray-400 hover:text-brand-accent hover:bg-brand-accent/5 border-transparent hover:border-brand-accent/20 hover:shadow-layered-sm
active: text-brand-accent bg-brand-accent/5 border-brand-accent/20 shadow-layered-sm
```

---

## XV. BUTTON COMPONENT VARIANTS (Ground Truth: Button.tsx)

### A. Base Classes (All Variants)
```
font-bold rounded-xl transition-float focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed
flex items-center justify-center active:scale-95 select-none cursor-pointer
shadow-layered-sm hover:shadow-layered-lg hover:-translate-y-0.5
```

### B. Size Classes

| Size | Padding | Min Height | Usage |
|------|---------|------------|-------|
| `sm` | `px-3 py-1.5` | `min-h-[36px]` | Compact buttons |
| `md` | `px-5 py-2.5` | `min-h-[44px]` | Default (Fitts's Law compliant) |
| `lg` | `px-7 py-3.5` | `min-h-[52px]` | Primary CTAs |

### C. Variant Classes

```css
/* Primary - Accent background tint */
primary: bg-brand-accent/10 dark:bg-brand-accent/20 text-brand-accent border border-brand-accent/20
         hover:bg-brand-accent/20 dark:hover:bg-brand-accent/30 hover:border-brand-accent/40

/* Secondary - Glass/neutral */
secondary: bg-white/5 text-brand-textPrimary border border-white/5
           hover:bg-white/10 hover:border-white/20

/* Tertiary - Text only, no lift */
tertiary: text-brand-textPrimary hover:text-brand-accent
          shadow-none hover:shadow-none hover:-translate-y-0

/* Ghost - Minimal, no shadow */
ghost: border border-transparent text-brand-accent hover:bg-brand-accent/5
       shadow-none hover:shadow-none hover:-translate-y-0

/* Ghost Danger - Red variant */
ghost-danger: border border-transparent text-red-500 hover:bg-red-500/5
              shadow-none hover:shadow-none hover:-translate-y-0

/* Outline Primary */
outline-primary: border border-brand-accent bg-transparent text-brand-accent
                 hover:bg-brand-accent/10

/* Outline Danger */
outline-danger: border border-red-500 bg-transparent text-red-500
                hover:bg-red-500/10

/* Soft - Branded soft button */
soft: border border-brand-accent/30 bg-brand-accent/10 text-brand-accent
      hover:bg-brand-accent/20
```

### D. Icon Sizes

| Button Size | Icon Size |
|-------------|-----------|
| `sm` | 16px |
| `md` | 20px |
| `lg` | 24px |

---

## XVI. STATUS INDICATORS

### A. Online Indicator (Pulsing)
```tsx
<span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
```

### B. Offline Indicator
```tsx
<span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-white/10" />
```

### C. Task Status Colors

| Status | Color | Tailwind |
|--------|-------|----------|
| Help Requested | Red | `bg-red-500` |
| In Progress | Emerald | `bg-emerald-500` |
| Done | Blue | `bg-brand-accent` |
| Not Started | Gray | `bg-gray-300 dark:bg-white/10` |

---

## XVII. MODAL PATTERN (Ground Truth: Modal.tsx)

### A. Overlay Backdrop
```tsx
<div className="fixed inset-0 z-100 bg-black/60 backdrop-blur-sm transition-opacity duration-200">
```

### B. Modal Container
```tsx
<div className="max-w-md w-full bg-brand-lightSurface dark:bg-bg-tile rounded-2xl 
    border border-slate-200 dark:border-white/5 shadow-layered 
    absolute inset-0 m-auto h-fit max-h-[90vh] overflow-y-auto">
```

### C. Modal Header
```tsx
<div className="flex items-center justify-between px-6 pt-6 pb-4">
    <h2 className="text-fluid-xl font-bold text-brand-textDarkPrimary dark:text-brand-textPrimary">
        {title}
    </h2>
    <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
        rounded-full hover:bg-slate-100 dark:hover:bg-white/10 
        transition-float hover:-translate-y-0.5 shadow-none hover:shadow-layered-sm
        border border-transparent hover:border-slate-200 dark:hover:border-white/10">
        <X className="w-5 h-5" />
    </button>
</div>
```

### D. Width Options

| Size | Class | Usage |
|------|-------|-------|
| `sm` | `max-w-sm` | Small dialogs |
| `md` | `max-w-md` | Default |
| `lg` | `max-w-lg` | Forms |
| `xl` | `max-w-xl` | Large content |
| `2xl` | `max-w-2xl` | Full-width modals |

---

## XVIII. SELECT / FORM INPUT (Ground Truth: Select.tsx)

### A. Select Button
```tsx
<button className="relative w-full cursor-pointer
    pl-10 pr-8 py-2.5 rounded-xl text-sm font-bold
    border border-slate-200 dark:border-white/5
    bg-brand-lightSurface dark:bg-bg-tile
    hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/10
    focus:outline-none focus:border-brand-accent
    shadow-layered-sm hover:-translate-y-0.5 transition-float">
```

### B. Dropdown Container
```tsx
<div className="fixed z-[9999] overflow-hidden rounded-lg 
    border border-slate-200 dark:border-white/5 
    bg-brand-lightSurface dark:bg-bg-tile shadow-layered">
```

### C. Dropdown Option
```tsx
<div className="relative cursor-pointer select-none py-2.5 pl-10 pr-4 text-sm
    hover:bg-gray-100 dark:hover:bg-gray-800
    text-brand-textDarkPrimary dark:text-brand-textPrimary">
```

### D. Search Input (in dropdown)
```tsx
<input className="w-full pl-8 pr-8 py-1.5 text-sm rounded-xl 
    border border-slate-200 dark:border-white/10 
    bg-slate-50 dark:bg-white/5 
    text-brand-textDarkPrimary dark:text-brand-textPrimary 
    placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-accent/20" />
```

---

## XIX. GLASS PANEL (Overlay Variant)

For differentiated containers like overview cards or overlays.

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

## XX. SCROLLBAR STYLING

```css
::-webkit-scrollbar { 
    width: 8px; 
}

::-webkit-scrollbar-track { 
    background: #0f1115; 
}

::-webkit-scrollbar-thumb { 
    background: #334155; 
    border-radius: 4px; 
}

::-webkit-scrollbar-thumb:hover { 
    background: #475569; 
}
```

Tailwind utility class: `.custom-scrollbar`

---

## XXI. CARD HOVER COLOR STATES

### A. Dynamic Border Color (ClassCard)

Cards can have a dynamic `borderColor` based on the class's assigned color:

```tsx
<div 
    className="levitated-tile"
    style={{ borderColor: isHovered ? cardColor : undefined }}
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
>
```

### B. Selection States

| State | Border | Text | Background |
|-------|--------|------|------------|
| Default | `border-white/10` | `text-brand-textPrimary` | `bg-[#1a1d24]` |
| Hovered | Dynamic color or `border-brand-accent/50` | `text-white` | `bg-[#1e2128]` |
| Selected | `border-top: 0.5px solid #3b82f6` | `text-white` | `bg-[#1a1d24]` |
| Selected+Hovered | Dynamic color | `text-white` | `bg-[#1e2128]` |

---

## XXII. COMPLETE QUICK REFERENCE

### All Button Variants (copy-paste ready)
```
/* Primary */
bg-brand-accent/10 text-brand-accent border-brand-accent/20 hover:bg-brand-accent/20

/* Secondary */  
bg-white/5 text-brand-textPrimary border-white/5 hover:bg-white/10

/* Ghost (no shadow/lift) */
text-brand-accent hover:bg-brand-accent/5 shadow-none hover:shadow-none hover:-translate-y-0

/* Tertiary (text only) */
text-brand-textPrimary hover:text-brand-accent shadow-none hover:-translate-y-0
```

### Status Dots
```
/* Online */ w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse
/* Offline */ w-2 h-2 rounded-full bg-gray-300 dark:bg-white/10
```

### Modal Close Button
```
p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full
hover:bg-slate-100 dark:hover:bg-white/10 transition-float hover:-translate-y-0.5
shadow-none hover:shadow-layered-sm border border-transparent hover:border-white/10
```
