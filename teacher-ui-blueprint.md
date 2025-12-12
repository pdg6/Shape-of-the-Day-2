# TeacherView Desktop UI Blueprint

> A pixel-perfect specification for rebuilding the TeacherView desktop application from scratch.

---

## Overview

The TeacherView is a desktop-first interface for teachers to manage classrooms, create content, present daily schedules, and monitor student progress in real-time. This document provides exhaustive specifications for every UI element, layout pattern, and interaction.

### Key Files
| Component | File | Size |
|-----------|------|------|
| TeacherDashboard | `src/components/teacher/TeacherDashboard.tsx` | 567 lines |
| TaskManager | `src/components/teacher/TaskManager.tsx` | 1570 lines |
| TaskInventory | `src/components/teacher/TaskInventory.tsx` | 60KB |
| ShapeOfDay | `src/components/teacher/ShapeOfDay.tsx` | 30KB |
| LiveView | `src/components/teacher/LiveView.tsx` | 18KB |
| ClassroomManager | `src/components/teacher/ClassroomManager.tsx` | 42KB |
| ConnectionSidebar | `src/components/teacher/ConnectionSidebar.tsx` | 10KB |
| SettingsOverlay | `src/components/teacher/SettingsOverlay.tsx` | 7KB |
| JoinCodeOverlay | `src/components/teacher/JoinCodeOverlay.tsx` | 7KB |

---

## Application Shell Structure

### Global Layout

The TeacherDashboard uses a horizontal three-region layout:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Root Container: flex h-full overflow-hidden                                  │
│                 bg-brand-lightSurface dark:bg-brand-darkSurface              │
│                 text-brand-textDarkPrimary dark:text-brand-textPrimary       │
├──────────────┬──────────────────────────────────────┬───────────────────────┤
│   Sidebar    │         Main Content Area            │   Connection          │
│   (Left)     │         (Center)                     │   Sidebar (Right)     │
│   w-64/w-20  │         flex-1                       │   Variable            │
│   Desktop    │                                      │   Desktop only        │
│   only       │                                      │                       │
└──────────────┴──────────────────────────────────────┴───────────────────────┘
```

### Root Container Classes
```jsx
className="flex h-full bg-brand-lightSurface dark:bg-brand-darkSurface 
           text-brand-textDarkPrimary dark:text-brand-textPrimary 
           overflow-hidden transition-colors duration-300"
```

---

## Left Sidebar Navigation (Desktop Only)

### Container Specifications

| Property | Value | Notes |
|----------|-------|-------|
| Display | `hidden md:flex md:static` | Hidden on mobile, visible on desktop |
| Width (Expanded) | `w-64` (256px) | Full navigation with labels |
| Width (Collapsed) | `w-20` (80px) | Icon-only navigation |
| Background | `bg-brand-lightSurface dark:bg-brand-darkSurface` | Matches content area |
| Transition | `transition-all duration-300 ease-in-out` | Smooth collapse animation |
| Layout | `flex-col h-full overflow-hidden` | Vertical flex, full height |
| Z-Index | `z-sidebar` | Above content, below modals |

### Sidebar Structure (Top to Bottom)

```
┌──────────────────────────────────────────────────┐
│ Header Block (h-16, 64px fixed)                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ Logo + Branding + Date                       │ │
│ │ px-4, flex items-center                      │ │
│ └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│ Navigation Area (flex-1, scrollable)             │
│ px-4 pb-4 pt-4 overflow-y-auto custom-scrollbar  │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │ Nav Button: Classrooms (with submenu)      │  │
│  │ Nav Button: Tasks (with submenu)           │  │
│  │ Nav Button: Shape of Day                   │  │
│  │ Nav Button: Live View (with submenu)       │  │
│  │ Nav Button: Reports (with submenu)         │  │
│  └────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│ Footer Block (px-4 pb-1 pt-4, flex-shrink-0)     │
│  ┌────────────────────────────────────────────┐  │
│  │ Collapse/Expand Button                     │  │
│  │ ─────────── (Divider) ─────────────        │  │
│  │ Join Code Button                           │  │
│  │ Settings Button                            │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### Header Block Specifications

| Element | Specification |
|---------|---------------|
| Container | `h-16 flex-shrink-0 flex items-center px-4` |
| Logo Size | `w-10 h-10` (40x40px) |
| Logo Classes | `flex-shrink-0 aspect-square object-contain` |
| App Name | `font-bold text-base whitespace-nowrap leading-tight` |
| Date Display | `text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap leading-tight` |
| Date Format | `weekday: 'short', month: 'short', day: 'numeric'` (e.g., "Wed, Dec 11") |

### Navigation Menu Items

| Item | Icon (Lucide) | Label | Has Submenu |
|------|---------------|-------|-------------|
| Classrooms | `School` | "Classrooms" | Yes (click toggle) |
| Tasks | `ListTodo` | "Tasks" | Yes (auto-expand) |
| Shape of Day | `Presentation` | "Shape of Day" | No |
| Live View | `Activity` | "Live View" | Yes (auto-expand) |
| Reports | `BarChart2` | "Reports" | Yes (auto-expand) |

### Navigation Button Specifications

#### Primary Nav Button Classes (Expanded)
```jsx
className={`
  group relative flex items-center rounded-lg transition-all duration-200 
  font-bold border-2 overflow-hidden w-full h-12
  bg-brand-lightSurface dark:bg-brand-darkSurface
  focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 
  focus-visible:ring-offset-2 dark:focus-visible:ring-offset-brand-darkSurface
  ${isActive
    ? 'border-brand-accent text-brand-accent bg-brand-accent/5 shadow-sm'
    : 'border-transparent text-gray-500 hover:border-gray-600 dark:hover:border-gray-400'
  }
`}
```

#### Primary Nav Button Classes (Collapsed)
```jsx
className="w-12 h-12 justify-center"
// Icon container: flex items-center justify-center w-12
// Label: w-0 opacity-0 (hidden via transition)
```

| Property | Expanded | Collapsed |
|----------|----------|-----------|
| Width | `w-full` | `w-12` (48px) |
| Height | `h-12` (48px) | `h-12` (48px) |
| Icon Size | `size={20}` (20px) | `size={20}` (20px) |
| Icon Container | `w-12` centered | `w-12` centered |
| Label Visibility | `opacity-100` | `opacity-0 w-0` |
| Border Radius | `rounded-lg` | `rounded-lg` |
| Border Width | `border-2` | `border-2` |

### Submenu Specifications

Submenus use grid-based animation for smooth expand/collapse:

```jsx
className={`
  grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
  ${isExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0'}
`}
```

#### Submenu Container (Classrooms)
```jsx
// With left border indicator for classroom selection
className="min-h-0 overflow-hidden ml-4 border-l-2 border-gray-200 dark:border-gray-700 
           pl-4 space-y-1 list-none m-0 p-0"
```

#### Submenu Container (Other)
```jsx
// Without left border, more indent
className="min-h-0 overflow-hidden ml-9 space-y-1 list-none m-0 p-0"
```

#### Submenu Item Button
```jsx
className={`
  w-full text-left p-2 text-sm rounded-lg font-medium transition-colors 
  focus:outline-none focus:text-brand-accent
  ${isActive 
    ? 'text-brand-accent' 
    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
  }
`}
```

### Submenu Structure by Tab

| Tab | Submenu Items | Expansion Behavior |
|-----|---------------|-------------------|
| Classrooms | Dynamic classroom list + "Add Class" | Toggle on click |
| Tasks | "Create", "Inventory" | Auto-expand when tab active |
| Live View | "By Task", "By Student" | Auto-expand when tab active |
| Reports | "Calendar", "Analytics" | Auto-expand when tab active |

### Footer Action Buttons

| Button | Icon | Label | Purpose |
|--------|------|-------|---------|
| Menu Toggle | `Menu` / `ChevronRight` | "Menu" | Collapse/expand sidebar |
| Join Code | `QrCode` | "Join Code" | Open QR code modal |
| Settings | `Settings` | "Settings" | Open settings overlay |

#### Footer Button Classes
```jsx
className={`
  group relative flex items-center h-12 rounded-lg transition-all duration-200 
  font-bold overflow-hidden border-2 border-transparent 
  hover:border-gray-600 dark:hover:border-gray-400 
  focus:outline-none focus:ring-2 focus:ring-brand-accent/20
  ${isCollapsed ? 'w-12 justify-center' : 'w-full'}
`}
```

---

## Main Content Area

### Container Specifications

```jsx
// Main element
<main className="flex-1 flex flex-col min-w-0 relative">
  {/* Content body */}
  <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden">
    {/* Scrollable content */}
    <div className="h-full w-full overflow-y-auto overflow-x-hidden px-6 pb-[84px] md:pb-6">
      {/* Tab content renders here */}
    </div>
  </div>
</main>
```

| Property | Value | Notes |
|----------|-------|-------|
| Width | `flex-1` | Fills remaining horizontal space |
| Layout | `flex flex-col min-w-0` | Vertical flex, min-width for text truncation |
| Horizontal Padding | `px-6` (24px) | Consistent content margins |
| Bottom Padding | `pb-6` (desktop) / `pb-[84px]` (mobile) | Mobile accounts for bottom nav |
| Overflow | `overflow-y-auto overflow-x-hidden` | Vertical scroll only |

---

## Content Page Headers

All content pages (except LiveView) use a standardized header pattern:

### Header Container
```jsx
<div className="h-16 flex-shrink-0 flex items-center justify-between">
  <div className="flex items-baseline gap-3">
    <span className="text-fluid-xl font-black text-brand-textDarkPrimary dark:text-brand-textPrimary">
      TabName:
    </span>
    <span className="text-fluid-xl font-black text-brand-accent">
      {currentClass?.name}
    </span>
  </div>
  {/* Right-side actions (optional) */}
</div>
```

| Property | Value |
|----------|-------|
| Height | `h-16` (64px) - matches sidebar header |
| Typography | `text-fluid-xl font-black` |
| Label Color | `text-brand-textDarkPrimary dark:text-brand-textPrimary` |
| Class Name Color | `text-brand-accent` |
| Alignment | `items-baseline` for text alignment |

### Page Content Spacing

```jsx
<div className="flex flex-col space-y-3">
  {/* h-16 header */}
  {/* Content area */}
</div>
```

| Exception | Spacing |
|-----------|---------|
| Most tabs | `space-y-3` (12px) |
| LiveView | `space-y-6` (24px) - different content density |

---

## Connection Sidebar (Right, Desktop Only)

The ConnectionSidebar shows when a class is selected, displaying the join code, QR code, and live student roster.

### Position & Container

```jsx
// Rendered inside main content area
{currentClass && (
  <ConnectionSidebar
    classCode={currentClass.joinCode}
    classId={currentClass.id}
  />
)}
```

### States

| State | Width | Contents |
|-------|-------|----------|
| Collapsed | `60px` | QR icon, rotated class code, student count badge |
| Expanded | `350px` | Full QR, join code with copy button, live roster |

---

## Mobile Bottom Navigation (iOS/Android Style)

### Container Specifications

```jsx
<nav 
  aria-label="Mobile navigation" 
  className="md:hidden fixed bottom-0 inset-x-0 h-24 footer-fade z-sidebar safe-area-pb"
>
  <ul className="flex justify-around items-center h-16 px-2 list-none m-0 p-0 mt-4">
    {/* Nav items */}
  </ul>
</nav>
```

| Property | Value | Notes |
|----------|-------|-------|
| Display | `md:hidden` | Mobile only, hidden on desktop |
| Position | `fixed bottom-0 inset-x-0` | Full width, stuck to bottom |
| Height | `h-24` (96px) overall, `h-16` (64px) nav buttons |
| Background | Gradient fade via `footer-fade` class | Content fades behind |
| Z-Index | `z-sidebar` | Above content |
| Safe Area | `safe-area-pb` | iOS notch/home indicator padding |

### Mobile Nav Button Specifications

```jsx
className={`
  flex flex-col items-center justify-center gap-1 p-2
  w-16 h-16 rounded-xl border-2 transition-all duration-200
  bg-brand-lightSurface dark:bg-brand-darkSurface
  focus:outline-none focus:ring-2 focus:ring-brand-accent/20
  ${isActive
    ? 'border-brand-accent text-brand-accent'
    : 'border-transparent hover:border-gray-600 dark:hover:border-gray-400 text-gray-500 dark:text-gray-400'
  }
`}
```

| Property | Value |
|----------|-------|
| Size | `w-16 h-16` (64x64px) |
| Icon Size | `w-6 h-6` (24x24px) |
| Label Size | `text-fluid-xs font-bold` (12-14px) |
| Gap | `gap-1` (4px) |
| Padding | `p-2` (8px) |
| Border Radius | `rounded-xl` |

### Mobile Nav Items

| Position | Icon | Label | Action |
|----------|------|-------|--------|
| 1 | `School` | "Classes" | Opens Classrooms tab |
| 2 | `ListTodo` | "Tasks" | Opens Tasks tab |
| 3 | `Presentation` | "Shape" | Opens Shape of Day tab |
| 4 | `Activity` | "Live" | Opens Live View tab |
| 5 | `Home` | "More" | Opens Settings overlay |

---

## Tab Content Components

### Tab Routing Logic

```typescript
const renderContent = () => {
  switch (activeTab) {
    case 'tasks':
      return tasksSubTab === 'create'
        ? <TaskManager initialTask={editingTask} />
        : <TaskInventory onEditTask={(task) => {...}} />;
    case 'shape': 
      return <ShapeOfDay onNavigate={handleDeepNavigation} />;
    case 'live': 
      return <LiveView activeView={liveViewSubTab} />;
    case 'classrooms': 
      return <ClassroomManager activeView="classes" onNavigate={handleDeepNavigation} />;
    case 'reports': 
      return <ClassroomManager 
               activeView={reportsSubTab === 'calendar' ? 'history' : 'analytics'} 
               onNavigate={handleDeepNavigation} />;
    default: 
      return <TaskManager />;
  }
};
```

---

## Modal Overlays

### Settings Modal

```jsx
<Modal
  isOpen={isSettingsOpen}
  onClose={() => setIsSettingsOpen(false)}
  title="Menu"
>
  <SettingsOverlay
    isOpen={true}
    onClose={() => setIsSettingsOpen(false)}
    onLogout={logout}
    onShowJoinCode={() => setIsJoinCodeOpen(true)}
    onShowData={() => setActiveTab('reports')}
    teacherName={user?.displayName || user?.email || 'Teacher'}
    className={currentClass?.name}
  />
</Modal>
```

### Join Code Modal

```jsx
<Modal
  isOpen={isJoinCodeOpen}
  onClose={() => setIsJoinCodeOpen(false)}
  title="Join Code"
>
  <JoinCodeOverlay
    isOpen={true}
    onClose={() => setIsJoinCodeOpen(false)}
    classCode={currentClass.joinCode}
    classId={currentClass.id}
  />
</Modal>
```

### Class Form Modal

```jsx
<ClassFormModal /> // Rendered at dashboard level, uses global store `isClassModalOpen`
```

---

## Icon Library

All icons are from **Lucide React** (`lucide-react`).

### Navigation Icons
| Icon | Usage |
|------|-------|
| `Activity` | Live View tab |
| `School` | Classrooms tab |
| `ListTodo` | Tasks tab |
| `Presentation` | Shape of Day tab |
| `BarChart2` | Reports tab |
| `Menu` | Sidebar collapse button (expanded state) |
| `ChevronRight` | Sidebar expand button (collapsed state) |
| `ChevronLeft` | Sidebar collapse indicator |
| `QrCode` | Join Code button |
| `Settings` | Settings button |
| `Home` | Mobile "More" button |
| `Plus` | Add Class button |
| `X` | Close/dismiss actions |

### Task Type Icons
| Type | Icon | Color |
|------|------|-------|
| Project | `FolderOpen` | `#a855f7` (purple-500) |
| Assignment | `FileText` | `#3b82f6` (blue-500) |
| Task | `ListChecks` | `#22c55e` (green-500) |
| Subtask | `CheckSquare` | `#f97316` (orange-500) |

---

## State Management

### Zustand Store (`useClassStore`)

The sidebar and content area share state via Zustand:

```typescript
const {
  classrooms,           // All teacher's classrooms
  currentClassId,       // Selected classroom ID
  setCurrentClassId,    // Setter for selected classroom
  isSidebarOpen,        // Mobile sidebar visibility
  setSidebarOpen,       // Toggle mobile sidebar
  setIsClassModalOpen   // Open/close class creation modal
} = useClassStore();
```

### Local Component State

| State | Type | Initial | Purpose |
|-------|------|---------|---------|
| `activeTab` | `MenuItem['id']` | `'tasks'` | Currently active main tab |
| `tasksSubTab` | `'create' \| 'browse'` | `'create'` | Tasks subtab selection |
| `liveViewSubTab` | `'tasks' \| 'students'` | `'students'` | Live View subtab selection |
| `reportsSubTab` | `'calendar' \| 'analytics'` | `'analytics'` | Reports subtab selection |
| `isClassroomsMenuOpen` | `boolean` | `false` | Classrooms submenu expanded |
| `isCollapsed` | `boolean` | `false` | Sidebar collapse state |
| `isSettingsOpen` | `boolean` | `false` | Settings modal visibility |
| `isJoinCodeOpen` | `boolean` | `false` | Join code modal visibility |
| `editingTask` | `Task \| null` | `null` | Task being edited in TaskManager |

---

## Animation & Transition Standards

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| Sidebar collapse | `300ms` | `ease-in-out` | Width transition |
| Nav button state | `200ms` | default | Border, background, text color |
| Submenu expand | `300ms` | `ease-in-out` | Grid rows + opacity |
| Label fade | `300ms` | `ease-in-out` | Opacity + width transition |
| Modal enter | `200ms` | default | Fade + scale via Modal component |

---

## Accessibility Features

### ARIA Attributes

| Element | Attributes |
|---------|------------|
| Desktop sidebar nav | `aria-label="Main navigation"` |
| Mobile bottom nav | `aria-label="Mobile navigation"` |
| Collapsible buttons | `aria-expanded`, `aria-controls` pointing to submenu ID |
| Collapse toggle | `aria-expanded={!isCollapsed}`, `aria-label="Expand/Collapse navigation menu"` |
| All nav buttons | `aria-label="{item.label}"` |

### Keyboard Navigation

- All buttons are focusable
- Focus rings: `focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30`
- Escape key closes modals
- Tab order follows visual order

### Skip Link

(Defined in App.tsx but available globally)
```jsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
```

---

## TaskManager Component Specification

The TaskManager is the primary content creation interface. It uses a two-column layout on desktop.

### Layout Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Content Area (from TeacherDashboard)                                          │
├──────────────────────────────────────┬───────────────────────────────────────┤
│          Editor Panel                │        Summary Panel                  │
│          (flex-1, min 60%)           │        (w-80, 320px)                  │
│                                      │                                       │
│  ┌────────────────────────────────┐  │  ┌─────────────────────────────────┐  │
│  │ Title Input (underline style)  │  │  │ Selected Date Header            │  │
│  └────────────────────────────────┘  │  │ (Edit icon to change date)      │  │
│  ┌────────────────────────────────┐  │  └─────────────────────────────────┘  │
│  │ Type Select + Parent Select    │  │  ┌─────────────────────────────────┐  │
│  │ (flex row, gap-4)              │  │  │ Task Card (for each task)       │  │
│  └────────────────────────────────┘  │  │  - Number | Title               │  │
│  ┌────────────────────────────────┐  │  │  - Hover: Edit/Add subtask      │  │
│  │ Date Range Picker              │  │  └─────────────────────────────────┘  │
│  └────────────────────────────────┘  │  ┌─────────────────────────────────┐  │
│  ┌────────────────────────────────┐  │  │ Task Card...                    │  │
│  │ Assign to Classes (MultiSelect)│  │  └─────────────────────────────────┘  │
│  └────────────────────────────────┘  │                                       │
│  ┌────────────────────────────────┐  │                                       │
│  │ Description (RichTextEditor)   │  │                                       │
│  │ - Toolbar at top               │  │                                       │
│  │ - Drag/drop zone               │  │                                       │
│  │ - Placeholder text             │  │                                       │
│  └────────────────────────────────┘  │                                       │
│  ┌────────────────────────────────┐  │                                       │
│  │ Attachments + Link URL         │  │                                       │
│  │ (Upload button, chips)         │  │                                       │
│  └────────────────────────────────┘  │                                       │
│  ┌────────────────────────────────┐  │                                       │
│  │ Save / Delete Buttons          │  │                                       │
│  │ (min-w-[120px], outline style) │  │                                       │
│  └────────────────────────────────┘  │                                       │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

### Task Type System

| Type | Icon | Color | Allowed Children |
|------|------|-------|------------------|
| Project | `FolderOpen` | `#a855f7` (purple) | Assignment, Task |
| Assignment | `FileText` | `#3b82f6` (blue) | Task |
| Task | `ListChecks` | `#22c55e` (green) | Subtask |
| Subtask | `CheckSquare` | `#f97316` (orange) | None |

### Form Fields Specifications

#### Title Input
```jsx
className="text-fluid-xl font-bold bg-transparent border-b-2 border-gray-300 
           dark:border-gray-600 focus:border-brand-accent focus:outline-none
           w-full py-2"
// Placeholder: "Title..."
```

#### Type Select
- Uses shared `Select` component
- Options include type icon with color
- Width: equal to Parent select (flex-1)

#### Parent Select
- Shows hierarchical path of parent
- "Quick Create" action to create parent on-the-fly
- Disabled when editing (parent is locked)

#### Description (RichTextEditor)
```jsx
<RichTextEditor
  value={formData.description}
  onChange={(val) => updateField('description', val)}
  onFileDrop={handleFileDrop}
/>
```

| Feature | Description |
|---------|-------------|
| Toolbar | Bold, Italic, Lists, Link |
| Placeholder | Multi-line with primary/secondary text |
| Drag-drop | Shows dashed border overlay |
| Focus state | Ring + shadow elevation |

#### Attachments Display
- Chips with filename + delete button
- Shows file size on hover
- Subtle scale animation on hover

### Button Specifications

| Button | Style | Min Width | Classes |
|--------|-------|-----------|---------|
| Save | Outline, Brand Accent | `120px` | `border-brand-accent text-brand-accent` |
| Delete | Outline, Red | `120px` | `border-red-500 text-red-500` |
| New Task | Ghost variant | auto | `border-transparent hover:border-gray-600` |

### Summary Panel (Right)

#### Header
```jsx
<div className="flex items-center justify-between mb-4">
  <span className="text-fluid-lg font-bold">
    {formatDate(selectedDate)}
  </span>
  <button onClick={openCalendar}>
    <CalendarIcon size={20} />
  </button>
</div>
```

#### Task Card
```jsx
className={`
  p-3 rounded-lg border-2 transition-all cursor-pointer
  ${isEditing 
    ? 'border-brand-accent bg-brand-accent/5' 
    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
  }
`}
```

| Element | Style |
|---------|-------|
| Number | `text-gray-500 font-mono` |
| Title | `font-medium truncate` |
| Type Icon | Colored circle with icon |
| Edit Button | Appears on hover |
| Add Subtask | "+" button, appears on hover |
| Reorder | Up/Down arrows for siblings |

### Auto-Save & Status

| Indicator | Condition | Display |
|-----------|-----------|---------|
| Draft | Auto-saved or unsaved changes | "Draft" badge in header |
| Saving | During save operation | Spinner icon |
| Saved | Post-save success | Brief checkmark |

---

## References

- [UI.md](file:///c:/Users/16047/Desktop/Antigravity/Shape%20of%20the%20Day%202/UI.md) - Design system tokens and patterns
- [TeacherDashboard.tsx](file:///c:/Users/16047/Desktop/Antigravity/Shape%20of%20the%20Day%202/src/components/teacher/TeacherDashboard.tsx) - Source implementation
- [userflowchart.md](file:///c:/Users/16047/Desktop/Antigravity/Shape%20of%20the%20Day%202/userflowchart.md) - User flow diagrams
