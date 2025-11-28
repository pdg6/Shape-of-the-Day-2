# UI/UX Audit Report - Shape of the Day

**Date:** November 28, 2025
**Scope:** Comprehensive analysis of 23 components across student, teacher, and shared UI layers
**Reference:** `UI.md` design system specification

---

## User Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Student Theme | Enforce emerald green throughout | Per UI.md specification |
| Border Width | Keep 3px everywhere | Better visibility for educational environments |
| Scope | Comprehensive cleanup | Fix all issues (Critical + High + Medium + Low) |

---

## Executive Summary

This audit analyzed **23 components** against the design system defined in `UI.md`. The codebase has a solid foundation but reveals **significant inconsistencies** in theme colors, focus states, and accessibility patterns.

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 1 | Broken styles - missing CSS definitions |
| 🟠 High | 3 | Theme violations, inconsistent focus states |
| 🟡 Medium | 7 | Accessibility, dark mode bugs, hover states |
| 🟢 Low | 4 | Code quality, documentation |
| **Total** | **15** | |

---

## 🔴 Critical Issues

### 1. Missing Utility Classes - BROKEN STYLES

The classes `.input-base` and `.input-focus` are used in **7+ files** but **never defined** in CSS.

**Affected Files:**
- [JoinRoom.tsx](src/components/shared/JoinRoom.tsx)
- [TaskManager.tsx](src/components/teacher/TaskManager.tsx)
- [ClassroomManager.tsx](src/components/teacher/ClassroomManager.tsx)
- [StudentNameModal.tsx](src/components/student/StudentNameModal.tsx)

**Required Fix:** Add to `src/index.css`:

```css
@layer components {
    .input-base {
        @apply w-full px-4 py-2.5 rounded-xl border-[3px] transition-all duration-200;
        @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
        @apply text-brand-textDarkPrimary dark:text-brand-textPrimary;
        @apply border-gray-200 dark:border-gray-700;
        @apply placeholder-gray-400 dark:placeholder-gray-500 font-medium;
    }

    .input-focus {
        @apply focus:outline-none focus:border-brand-accent;
        @apply focus:ring-2 focus:ring-brand-accent/20;
    }

    .card-base {
        @apply bg-brand-lightSurface dark:bg-brand-darkSurface;
        @apply border-[3px] border-gray-200 dark:border-gray-700;
        @apply rounded-xl transition-colors;
    }
}
```

---

## 🟠 High Priority Issues

### 2. Student Theme Color Mismatch

UI.md specifies **emerald green** for student components, but implementation uses **blue (brand-accent)** inconsistently.

| Component | Expected | Actual | Status |
|-----------|----------|--------|--------|
| StudentView mobile tabs | emerald-500 | brand-accent (blue) | ❌ WRONG |
| MiniCalendar | emerald-500 | emerald-500 | ✅ Correct |
| StudentNameModal | emerald-500 | emerald-500 | ✅ Correct |
| DayTaskPreview | emerald-500 | green-500 | ❌ WRONG (different green) |
| CurrentTaskList | emerald-500 | brand-accent (blue) | ❌ WRONG |

**Files to Fix:**
- [StudentView.tsx:410-440](src/components/student/StudentView.tsx#L410-L440) - Mobile tab focus rings
- [DayTaskPreview.tsx](src/components/student/DayTaskPreview.tsx) - Import button focus
- [CurrentTaskList.tsx](src/components/student/CurrentTaskList.tsx) - Textarea focus

### 3. Focus Ring Inconsistencies

Multiple conflicting focus ring patterns across components:

| Pattern | Usage | Issue |
|---------|-------|-------|
| `focus:ring-2 focus:ring-brand-accent` | Mobile nav, forms | Blue instead of theme |
| `focus:ring-4 focus:ring-brand-accent/20` | Desktop sidebar | Different size & opacity |
| `focus:ring-2 focus:ring-emerald-200` | Student inputs | Correct for students |
| `focus:ring-2 focus:ring-green-500` | DayTaskPreview | Wrong green shade |
| `focus:ring-2 focus:ring-inset` | Calendar days | Uses inset variant |

**Recommendation:** Standardize to `focus:ring-2 focus:ring-offset-2` with theme-appropriate color.

### 4. Status Indicator Colors

Live status uses `green-500` instead of `emerald-500` throughout:
- [StudentView.tsx:241-245](src/components/student/StudentView.tsx#L241-L245)
- [ConnectionSidebar.tsx](src/components/teacher/ConnectionSidebar.tsx)

---

## 🟡 Medium Priority Issues

### 5. Dark Mode Bug in CurrentTaskList

```tsx
// Line ~200 in CurrentTaskList.tsx - QuestionOverlay
bg-brand-darkSurface dark:bg-brand-darkSurface  // Same value for both modes!
```

**Should be:** `bg-brand-lightSurface dark:bg-brand-darkSurface`

### 6. Hover State Inconsistencies

Four different hover patterns used without consistency:

| Pattern | Used In | Effect |
|---------|---------|--------|
| `hover:border-emerald-400` | StudentNameModal | Border color change |
| `hover:bg-gray-100` | Most buttons | Background change |
| `hover:shadow-md` | Student cards | Shadow addition |
| `hover:brightness-95` | DayTaskPreview | Filter change |

**Recommendation:** Standardize to border color change (per UI.md) + subtle background for feedback.

### 7. Touch Target Sizes

| Current | WCAG Recommended | Gap |
|---------|------------------|-----|
| 44×44px | 48×48px minimum | 4px |

**Files Affected:**
- [TeacherDashboard.tsx:368-422](src/components/teacher/TeacherDashboard.tsx#L368-L422) - Mobile nav
- [StudentView.tsx:406-440](src/components/student/StudentView.tsx#L406-L440) - Mobile nav

### 8. Missing ARIA Labels

| Component | Element | Issue |
|-----------|---------|-------|
| StudentNameModal | Close button | Missing `aria-label` |
| MiniCalendar | Scroll buttons | Missing `aria-label` |
| ConnectionSidebar | Student list items | No keyboard access |
| JoinCodeOverlay | Student list items | No keyboard access |
| TaskManager | File upload area | No keyboard access |

### 9. Modal Focus Traps Missing

No modal implements focus trapping:
- [Modal.tsx](src/components/shared/Modal.tsx)
- [ClassFormModal.tsx](src/components/teacher/ClassFormModal.tsx)
- [StudentNameModal.tsx](src/components/student/StudentNameModal.tsx)

Users can tab outside modals, breaking accessibility.

### 10. Form Label Associations

Inputs lack proper `<label>` associations:
- [ClassFormModal.tsx](src/components/teacher/ClassFormModal.tsx) - Color picker
- [JoinRoom.tsx](src/components/shared/JoinRoom.tsx) - Uses `sr-only` labels (good)

### 11. Border Width Documentation

UI.md currently specifies 2px for interactive elements, but the actual implementation uses 3px consistently throughout. Per user decision, **update UI.md** to document 3px as the standard for all elements.

---

## 🟢 Low Priority Issues

### 12. Z-Index Inconsistencies

Mixed usage of named tokens vs numeric values:
- ✅ Named: `z-modal`, `z-sidebar`, `z-dropdown` (correct)
- ❌ Numeric: `z-20`, `z-50`, `z-9999` (should use tokens)

### 13. Inline Styles in DummyDataControls

[DummyDataControls.tsx](src/components/shared/DummyDataControls.tsx) uses inline styles instead of Tailwind classes.

### 14. Font Inconsistency

StudentNameModal uses `font-mono` for student name input - unusual choice for names.

---

## Implementation Plan

### Phase 1: Critical Fixes (Immediate)

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Add missing `.input-base`, `.input-focus`, `.card-base` utility classes | `src/index.css` | ⬜ |
| 2 | Fix dark mode bug in QuestionOverlay | `CurrentTaskList.tsx` | ⬜ |

### Phase 2: Theme Consistency (High Priority)

| # | Task | File | Status |
|---|------|------|--------|
| 3 | Fix mobile tab focus rings to emerald | `StudentView.tsx` | ⬜ |
| 4 | Change green-500 to emerald-500 | `DayTaskPreview.tsx` | ⬜ |
| 5 | Fix textarea focus to emerald | `CurrentTaskList.tsx` | ⬜ |
| 6 | Fix status indicator colors | Multiple files | ⬜ |
| 7 | Create consistent focus ring pattern | Global | ⬜ |

### Phase 3: Accessibility (Medium Priority)

| # | Task | File | Status |
|---|------|------|--------|
| 8 | Add ARIA labels to close buttons | `StudentNameModal.tsx` | ⬜ |
| 9 | Add ARIA labels to scroll buttons | `MiniCalendar.tsx` | ⬜ |
| 10 | Add keyboard access to student lists | `ConnectionSidebar.tsx`, `JoinCodeOverlay.tsx` | ⬜ |
| 11 | Implement focus trapping in modals | `Modal.tsx` | ⬜ |
| 12 | Increase touch targets to 48px | `TeacherDashboard.tsx`, `StudentView.tsx` | ⬜ |

### Phase 4: Polish (Low Priority)

| # | Task | File | Status |
|---|------|------|--------|
| 13 | Standardize hover patterns | Multiple files | ⬜ |
| 14 | Update border width documentation | `UI.md` | ⬜ |
| 15 | Clean up z-index to use tokens | Multiple files | ⬜ |
| 16 | Refactor inline styles | `DummyDataControls.tsx` | ⬜ |
| 17 | Remove font-mono from name input | `StudentNameModal.tsx` | ⬜ |

---

## Files Requiring Changes

| File | Changes Needed | Priority |
|------|----------------|----------|
| `src/index.css` | Add utility classes | Critical |
| `src/components/student/StudentView.tsx` | Fix focus colors, touch targets, status colors | High |
| `src/components/student/CurrentTaskList.tsx` | Fix dark mode, focus colors | High |
| `src/components/student/DayTaskPreview.tsx` | Fix green-500 to emerald-500 | High |
| `src/components/student/MiniCalendar.tsx` | Add aria-labels | Medium |
| `src/components/student/StudentNameModal.tsx` | Add aria-label, remove font-mono | Medium |
| `src/components/teacher/TeacherDashboard.tsx` | Fix touch targets | Medium |
| `src/components/teacher/TaskManager.tsx` | Add keyboard access to upload | Medium |
| `src/components/teacher/ConnectionSidebar.tsx` | Add keyboard access, fix status color | Medium |
| `src/components/teacher/JoinCodeOverlay.tsx` | Add keyboard access | Medium |
| `src/components/shared/Modal.tsx` | Add focus trap | Medium |
| `src/components/shared/DummyDataControls.tsx` | Refactor inline styles | Low |
| `UI.md` | Update border width spec to 3px | Low |

---

## Appendix: Design System Quick Reference

### Color Tokens

| Context | Primary | Focus Ring | Hover |
|---------|---------|------------|-------|
| **Student** | `emerald-500` | `emerald-500/20` | `emerald-400` |
| **Teacher** | `brand-accent` (blue) | `brand-accent/20` | `brand-accent` |
| **Status: Live** | `emerald-500` | - | - |
| **Status: Idle** | `gray-400` | - | - |

### Focus Ring Standard

```css
/* Student components */
focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500

/* Teacher components */
focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent
```

### Touch Target Standard

```css
min-w-[48px] min-h-[48px]
```

---

*Report generated by Claude Code*
