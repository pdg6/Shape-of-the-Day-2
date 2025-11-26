# UX/UI Review & Improvement Plan

## Executive Summary
The codebase demonstrates a solid foundation with a consistent design system using Tailwind CSS and a defined color palette (`brand` colors). However, there are opportunities to enhance accessibility, unify layout constraints, and clean up placeholder/mock code. This plan outlines specific steps to elevate the user experience and code quality.

## 1. Code Cleanup & Optimization

### Unused & Placeholder Code
- **`StudentView.jsx`**: The `syncToTeacher` function is currently a console logger. It should be marked for implementation or connected to a real service.
- **Teacher Components**: `TaskManager`, `ShapeOfDay`, `LiveView`, `StudentRoster`, and `ClassPlanner` are currently placeholder components. These should be identified as "To Be Implemented" or fleshed out if they are part of the immediate scope.
- **Imports**: Ensure all imported components in `TeacherDashboard` are actually used (they currently are, but as placeholders).

### Action Items
- [ ] Review `syncToTeacher` in `StudentView.jsx` and document the expected API integration.
- [ ] Add `TODO` comments or create tickets for the implementation of placeholder teacher components.

## 2. Styling Alignment & Consistency

### Layout Constraints
- **Inconsistency**: `StudentView.jsx` uses a custom width constraint (`w-[85%] md:w-[70%]`), whereas `TeacherDashboard.jsx` uses `max-w-7xl`.
- **Recommendation**: Standardize the main content container width across the application. `max-w-7xl` is a standard Tailwind class that works well for responsive designs.

### Component Styling
- **`JoinRoom.jsx`**: The input field uses `tracking-[0.5em]` which is a nice stylistic choice for codes, but ensure it doesn't negatively impact readability on smaller screens.
- **Dark Mode**: The codebase consistently uses `dark:` modifiers, which is excellent. Ensure that all new components follow this pattern.

### Action Items
- [ ] Refactor `StudentView.jsx` to use `max-w-7xl` (or a consistent `max-w-*` class) for the main container to match `TeacherDashboard`.
- [ ] Verify that `tracking-[0.5em]` in `JoinRoom.jsx` degrades gracefully on mobile.

## 3. Usability & Accessibility (A11y)

### Missing ARIA Labels
Several interactive elements lack descriptive labels for screen readers.

- **`StudentView.jsx`**:
    - "Good Morning" button: Acts as a name edit trigger. Needs `aria-label="Edit student name"`.
    - "Live/Idle" indicator: Visual only. Needs `aria-label` or hidden text to convey status.
    - Progress text: Consider using `role="progressbar"` with `aria-valuenow`.

- **`TeacherDashboard.jsx`**:
    - Sidebar toggle button: Needs `aria-label="Toggle sidebar"`.
    - Mobile menu trigger: Needs `aria-label="Open menu"`.
    - Sidebar navigation buttons: Icons are decorative, but the buttons themselves are labeled. Ensure the collapsed state still conveys meaning (currently uses `title`, which is okay but `aria-label` is better).

- **`MiniCalendar.jsx`**:
    - Navigation arrows (`ChevronLeft`/`Right`): Need `aria-label="Previous days"` and `aria-label="Next days"`.
    - Date buttons: Need `aria-label` (e.g., "Select November 26th").
    - Selected state: Use `aria-pressed` or `aria-selected="true"` for the currently selected date.

- **`JoinRoom.jsx`**:
    - Input field: Needs `aria-label="Class Code"`.
    - Error message: Should be linked to the input using `aria-describedby`.

- **`App.jsx`**:
    - Navigation "Sign Out" button: Has `title` but needs `aria-label`.
    - Tab buttons (Student/Teacher): Need `role="tab"` and `aria-selected` attributes to properly convey the tab interface semantics.

### Interaction Design
- **`StudentView.jsx`**: The "Good Morning" button is a clever way to allow name editing, but it might not be immediately obvious. Consider adding a small "pencil" icon that appears on hover to indicate editability.
- **`MiniCalendar.jsx`**: The drag-to-scroll is a great feature. Ensure it works well on touch devices (touch events might need to be handled explicitly if not covered by mouse events).

### Action Items
- [ ] Add `aria-label` to all icon-only buttons.
- [ ] Add `aria-describedby` to form inputs with error states.
- [ ] Implement `role="progressbar"` for the task progress indicator.
- [ ] Add a visual cue (icon) to the "Good Morning" editable area.
- [ ] Standardize container widths.
- [ ] Add `role="tab"` and `aria-selected` to App tabs.

## 4. Implementation Roadmap

1.  **Phase 1: Accessibility Fixes** (High Priority) - Add missing ARIA attributes and labels.
2.  **Phase 2: Layout Standardization** - Unify container widths and spacing.
3.  **Phase 3: Visual Polish** - Add hover cues for editable fields and refine animations.
4.  **Phase 4: Code Cleanup** - Document placeholders and mock functions.
