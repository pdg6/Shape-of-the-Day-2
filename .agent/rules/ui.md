---
trigger: always_on
---

# UI Rules (Dynamic Theme System)
This document defines the **dynamic ground truth** for all UI elements in the application. It replaces fixed hex codes with CSS variables to support the Autonomous Theme System.
---
## 🎯 SCROLLABLE CONTENT CLIPPING FIX (General Pattern)
**Problem**: Scrollable containers (`overflow-y-auto`) clip shadows and elevation effects on the first/last items.
**Solution**: Use `pt-2 -mt-2` (or equivalent padding + negative margin) to create room for shadows while maintaining alignment.
```tsx
// ✅ CORRECT: Scrollable container with anti-clipping fix
<div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pt-2 -mt-2 pb-2">
    {/* Cards with levitated-tile class will not clip */}
</div>
// ❌ WRONG: Scrollable container without fix
<div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
    {/* First/last card shadows will be clipped */}
</div>
When to apply:

Any scrollable container with overflow-y-auto
That contains cards using levitated-tile, lift-dynamic, or shadow-layered
I. COLOR PALETTE (Dynamic Variables)
A. Background & Surfaces
Token	Usage
--bg-page / --color-page	Deepest void / page background
--bg-tile-alt / --color-tile-alt	Recessed layer / inset surfaces
--bg-tile / --color-tile	Standard floating surface
--bg-tile-hover / --color-tile-hover	Elevated hover state
B. Borders
Token	Usage
--color-border-subtle	Default borders (card edges, dividers) - rgba(255,255,255,0.05)
--color-border-strong	Hover states, active borders
--color-horizon-highlight	Top-edge highlight for "Horizon" effect
C. Text Colors
Token	Tailwind Class	Usage
--color-brand-textPrimary	text-brand-textPrimary	Primary text (Headings, Body)
--color-brand-textSecondary	text-brand-textSecondary	Secondary text (Metadata, Subtitles)
--color-brand-textMuted	text-brand-textMuted	Muted/Disabled text
--color-brand-accent	text-brand-accent	Interactive links/icons
D. Visual Fidelity
Token	Usage
--glow-opacity	Opacity for neon/ambient glow effects (0.0 to 0.06)
--glow-blur	Blur radius for glow effects
--glow-spread	Spread radius for glow effects
--glow-color	Color for glow effects
--timing-weightless	Standard cubic-bezier(0.4, 0, 0.2, 1)
II. SHADOW SYSTEM
A. Shadow Tokens
css
--shadow-layered-sm: 0 1px 2px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.05);
--shadow-layered: 0 4px 6px rgba(0,0,0,0.05), 0 12px 24px rgba(0,0,0,0.05), 0 24px 48px rgba(0,0,0,0.05);
--shadow-layered-lg: 0 15px 30px rgba(0,0,0,0.08), 0 30px 60px rgba(0,0,0,0.1);
B. Usage Classes
Class	Usage
shadow-layered-sm	Small shadows for icons/buttons
shadow-layered	Standard shadow for cards
shadow-layered-lg	Large shadow for hover/modals
DO NOT use hardcoded arbitrary shadow strings.

III. GLASS & BLUR SYSTEM
A. Blur Tokens
Token	Default	Usage
--tile-blur	0px	Blur amount for glass tiles (0px-20px)
B. Blur Utilities
css
/* Apply blur to any tile */
.tile-blur {
    backdrop-filter: blur(var(--tile-blur, 0px));
    -webkit-backdrop-filter: blur(var(--tile-blur, 0px));
}
/* Glass panel with blur + subtle white overlay */
.glass-panel {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(var(--tile-blur, 0px));
    border: 1px solid rgba(255, 255, 255, 0.1);
}
C. Usage in Components
tsx
// Glass tile with dynamic blur
<div className="bg-(--color-bg-tile) tile-blur rounded-xl border border-border-subtle">
    {/* Content */}
</div>
IV. ANIMATION & ELEVATION
A. Transition Utility
css
.transition-float {
    transition-property: transform, box-shadow, background-color, border-color, color, opacity;
    transition-timing-function: var(--timing-weightless);
    transition-duration: 300ms;
}
B. Universal Lift Utilities
Class	Usage
.lift-dynamic	Cards and large tiles - includes hover elevation
.button-lift-dynamic	Buttons and smaller interactive elements
These utilities automatically include tile-blur and respect the user's elevationLevel setting.

C. Elevation Tokens
Token	Usage
--elevation-tile-default	Base Y-transform for tiles (-4px to 0px)
--elevation-tile-hover	Hover Y-transform for tiles (-3px to -1px)
--elevation-button-hover	Hover Y-transform for buttons
V. BUTTON PATTERNS
A. Ghost Buttons
tsx
// Primary ghost button
<button className="btn-ghost">
    <Icon className="w-4 h-4" />
    Action
</button>
// Danger ghost button
<button className="btn-ghost-danger">
    <Trash2 className="w-4 h-4" />
    Delete
</button>
CSS Definition:

css
.btn-ghost {
    @apply flex items-center justify-center gap-2 h-12 px-4 rounded-md;
    @apply font-bold transition-all duration-200;
    @apply border-2 border-transparent;
    @apply hover:border-brand-accent text-brand-accent hover:bg-brand-accent/5;
    @apply focus:outline-none focus:ring-2 focus:ring-brand-accent/20;
    @apply disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-ghost-danger {
    @apply text-red-500;
    @apply hover:border-red-500 hover:bg-red-500/5;
    @apply focus:ring-red-500/20;
}
B. Elevated Buttons (Tile Style)
tsx
<button className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold
    bg-(--color-bg-tile) border border-border-subtle text-brand-textPrimary
    shadow-layered transition-float button-lift-dynamic
    hover:shadow-layered-lg hover:border-brand-accent/50">
    <Plus className="w-5 h-5 text-brand-accent" />
    Create
</button>
VI. COMPONENT PATTERNS
A. Levitated Tile (Universal Card)
tsx
<div className="levitated-tile rounded-2xl p-4">
    {/* Content */}
</div>
CSS Definition:

css
.levitated-tile {
    background-color: var(--color-tile);
    border: 1px solid var(--color-border-subtle);
    box-shadow: var(--shadow-layered-lg);
    transform: translateY(var(--elevation-tile-default, -4px));
    backdrop-filter: blur(var(--tile-blur, 0px));
    overflow: visible; /* CRITICAL: Prevents shadow/elevation clipping */
}
.levitated-tile:hover {
    transform: translateY(var(--elevation-tile-hover, -3px));
}
.levitated-tile.active {
    border-top: var(--horizon-border-top);
    border-left: var(--horizon-border-left);
    box-shadow: var(--active-inset-shadow, none), var(--shadow-layered-lg);
}
B. Nav Item
tsx
<button className={`nav-item ${isActive ? 'active' : ''}`}>
    <Icon />
    <span>Label</span>
</button>
C. Input Field
tsx
<input className="input-field" placeholder="Enter text..." />
<input className="input-field-sm" placeholder="Small input..." />
VII. BORDER RADIUS HIERARCHY
Level	Tailwind	Pixels	Usage
Container	rounded-2xl	16px	Modals, page sections
Card	rounded-xl	12px	Tiles, cards
Nested	rounded-lg	8px	Buttons, inputs
Micro	rounded-md	6px	Tags, pills
VIII. TASK TYPE COLORS
Type	Token	Color
Project	--type-project-color	Purple (#a855f7)
Assignment	--type-assignment-color	Blue (#3b82f6)
Task	--type-task-color	Green (#22c55e)
Subtask	--type-subtask-color	Orange (#f97316)
IX. STATUS COLORS
Status	Token	Color
In Progress	--color-status-progress	Emerald (#10B981)
Stuck/Help	--color-status-stuck	Red (#EF4444)
Question	--color-status-question	Amber (#D97706)
Complete	--color-status-complete	Blue (#3B82F6)
X. KEY REFACTORING RULES
❌ NEVER DO:
NO Hardcoded Colors: bg-[#1a1d24], text-[#94a3b8]
NO dark: Classes: dark:text-white, dark:bg-gray-900
NO Hardcoded Shadows: Arbitrary shadow strings
NO Manual Translations: hover:-translate-y-0.5
NO Static Blur Values: backdrop-blur-lg
✅ ALWAYS DO:
Use CSS Variables: bg-(--color-bg-tile), text-brand-textSecondary
Use Theme Classes: text-brand-textPrimary (auto-adapts to theme)
Use Shadow Classes: shadow-layered, shadow-layered-lg
Use Elevation Utilities: .lift-dynamic, .button-lift-dynamic
Use Blur Utilities: .tile-blur, blur(var(--tile-blur))
Apply Clipping Fix: pt-2 -mt-2 pb-2 for scrollable containers
XI. ACCESSIBILITY STANDARDS
Element	Minimum Size
Touch Targets	44px × 44px (--touch-target-min)
Focus Ring	2px solid accent with 2px offset
Contrast Ratio	4.5:1 minimum (AAA preferred)
tsx
// Touch-friendly button
<button className="touch-target btn-ghost">
    <Icon />
</button>
This complete file now includes all the patterns we've established. Copy and paste to replace your `ui.md`!