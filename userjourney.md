# User Journey

This document outlines the user journeys for both Teachers and Students within the "Shape of the Day" application. It focuses on the **functional flow** and **user experience** from login to daily usage.

> **Related Documents:**
> - [UI.md](file:///c:/Users/16047/Desktop/Antigravity/Shape%20of%20the%20Day%202/UI.md) - Design system and component specifications
> - [teacher-ui-blueprint.md](file:///c:/Users/16047/Desktop/Antigravity/Shape%20of%20the%20Day%202/teacher-ui-blueprint.md) - Pixel-perfect TeacherView specifications
> - [userflowchart.md](file:///c:/Users/16047/Desktop/Antigravity/Shape%20of%20the%20Day%202/userflowchart.md) - Technical diagrams and data flows

---

## Landing Page Experience

Both teachers and students begin at the same landing page, choosing their role via a tabbed interface.

### Landing Page UI Elements

| Element | Specification |
|---------|---------------|
| **Logo** | `w-16 h-16 md:w-20 md:h-20`, centered |
| **Title** | "Shape of the Day" - `text-2xl md:text-4xl font-bold` |
| **Subtitle** | "A digital organizer for teachers and students" |
| **Card Container** | `max-w-sm rounded-xl shadow-lg border-2` |
| **Role Tabs** | "Student" / "Teacher" with animated indicator pill |

### Tab Selection Behavior

| Tab | Active Color | Content |
|-----|--------------|---------|
| Student | `text-student-accent` (emerald) | Join Code input + Name input |
| Teacher | `text-teacher-accent` (blue) | Google Sign-In button |

---

## Teacher Journey

The teacher's experience is designed for classroom and content management, focusing on preparation, real-time monitoring, and reusability.

### 1. Authentication & Onboarding

**Entry Point:** Google Sign-In button on Landing Page (Teacher tab)

| Step | Action | UI Feedback |
|------|--------|-------------|
| 1 | Click "Sign in with Google" | Loading state on button |
| 2 | Google popup appears | Firebase Auth handling |
| 3 | Auth succeeds | Redirect to TeacherDashboard |
| 4 | First time? | Empty classroom state with "Create Class" CTA |

**Technical Context:**
- `AuthContext.tsx` manages auth state
- `signInWithPopup` from Firebase Auth
- User data stored in `users` collection

### 2. TeacherDashboard Overview

Upon login, teachers see the **TeacherDashboard** – a tabbed interface with:

**Desktop Layout (>768px):**
```
┌───────────────┬──────────────────────────────────────┬─────────────────┐
│   Sidebar     │           Main Content               │   Connection    │
│   w-64/w-20   │           (active tab)               │   Sidebar       │
│   - Classes   │                                      │   (QR + roster) │
│   - Tasks     │                                      │                 │
│   - Shape     │                                      │                 │
│   - Live      │                                      │                 │
│   - Reports   │                                      │                 │
└───────────────┴──────────────────────────────────────┴─────────────────┘
```

**Mobile Layout (<768px):**
```
┌─────────────────────────────────────────────────────┐
│              Main Content (full width)               │
│              Active tab renders here                 │
├─────────────────────────────────────────────────────┤
│ [Classes] [Tasks] [Shape] [Live] [More]             │
│           Bottom Navigation Bar (fixed)              │
└─────────────────────────────────────────────────────┘
```

### 3. Classroom Management (Classrooms Tab)

**Purpose:** Create, configure, and switch between classrooms.

| Action | UI Element | Result |
|--------|------------|--------|
| View classrooms | `ClassroomManager` main view | Grid of `ClassCard` components |
| Select classroom | Click ClassCard or sidebar item | Sets `currentClassId` in Zustand |
| Create classroom | "Create Class" button or sidebar "+" | Opens `ClassFormModal` |
| Edit classroom | ClassCard action menu | Opens `ClassFormModal` with data |
| View history | Toggle to "Reports" subtab | Shows analytics calendar |

**Key UI Details:**
- ClassCard shows: Name, student count, quick-look tasks, action buttons
- Selected class is highlighted with `border-brand-accent`
- Creating a class generates a unique 6-character join code

### 4. Content Creation (Tasks Tab → Create)

**Purpose:** Build hierarchical learning content.

#### Content Hierarchy Model
```
Project (purple)
└── Assignment (blue)
    └── Task (green)
        └── Subtask (orange)
```

#### Task Creation Form (`TaskManager`)

| Field | Component | Description |
|-------|-----------|-------------|
| Title | Text input with underline | Required, auto-focuses |
| Type | `Select` dropdown | Project/Assignment/Task/Subtask |
| Parent | `Select` dropdown | Links to parent item (if not root) |
| Description | `RichTextEditor` | Rich text with Markdown support |
| Date Range | `DateRangePicker` | Start/end dates for scheduling |
| Assigned Classes | `MultiSelect` | Which classrooms see this task |
| Attachments | Upload + drag-drop | Files stored in Firebase Storage |
| Resource Link | URL input | External resource link |

**Auto-Save Behavior:**
- Drafts saved after 2 seconds of inactivity
- "Draft" indicator shown in header
- Manual "Save" publishes task

**Task Summary (Right Panel):**
- Shows all tasks for selected date
- Click to edit, hover for actions
- Hierarchical numbering (1, 1.1, 1.2, 2, etc.)

### 5. Content Library (Tasks Tab → Inventory)

**Purpose:** Find, reuse, and manage existing content.

| Feature | Description |
|---------|-------------|
| Search | Filter by title/description |
| Filter by date | Show tasks in date range |
| Filter by class | Show tasks assigned to specific class |
| Hierarchical view | Collapsible tree structure |
| Edit | Click to load in TaskManager |
| Duplicate | Create copy for reuse |
| Delete | Cascade warning for items with children |

### 6. Daily Lesson Presentation (Shape of Day Tab)

**Purpose:** See and present today's schedule to students.

| Element | Function |
|---------|----------|
| Date Navigator | Browse days with arrow buttons |
| Task List | Ordered tasks for selected day |
| Task Numbers | Day-relative (1, 1.1, 2, etc.) |
| Quick Edit | Click task to edit in TaskManager |
| Join Code Button | Opens QR code modal |
| "Go Live" Button | Sets classroom.isLive = true |

**Presentation Mode:**
- Tasks display in presentation-friendly format
- Large task titles, clear numbering
- Resources and attachments visible

### 7. Live Class Monitoring (Live View Tab)

**Purpose:** Monitor student progress in real-time during class.

| View Mode | Display |
|-----------|---------|
| By Student | Grid of student cards with current status |
| By Task | Task cards with student progress counts |

**Status Indicators:**
| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| Active | 🟢 Green | — | Working normally |
| In Progress | 🟡 Yellow | — | Started task |
| Stuck | 🔴 Red | ⚠️ | Needs help |
| Done | ✅ Blue | ✓ | Completed task |
| Idle | ⚪ Gray | — | Disconnected |

**Real-time Updates:**
- Firestore `onSnapshot` listeners
- Instant UI refresh when student status changes
- "Send support" message option

### 8. Reports & Analytics (Reports Tab)

**Purpose:** Review historical session data and class performance.

| Subtab | Content |
|--------|---------|
| Calendar | Browse past sessions by date |
| Analytics | Charts: Time on Task, Friction Log, Class Pulse |

**Privacy Note:** Analytics use anonymized data—no student names stored after session ends.

### 9. Settings & Account (Settings Overlay)

**Accessed via:** Settings button in sidebar footer (desktop) or "More" button (mobile)

| Option | Function |
|--------|----------|
| Profile | View teacher name/email |
| Dark Mode Toggle | Switch light/dark theme |
| Show Join Code | Quick access to QR modal |
| View Reports | Jump to Reports tab |
| Sign Out | Logout and return to landing |

---

## Student Journey

The student's experience is ephemeral and session-based, designed to be simple, direct, and focused on the day's tasks.

### 1. Joining a Class

**Entry Point:** Landing Page (Student tab)

| Step | Action | UI Element |
|------|--------|------------|
| 1 | Enter join code | 6-character code input |
| 2 | Enter name | "What's your name?" input |
| 3 | Click "Join Class" | Green primary button |
| 4 | Validation | Code checked against Firestore |
| 5 | Success | Redirect to StudentView |

**Technical Note:** Students use Firebase Anonymous Auth. No persistent account.

### 2. Viewing Tasks (StudentView)

**Layout:** Focused task list, optimized for clarity.

| Element | Description |
|---------|-------------|
| Header | Class name, current date |
| Task List | Ordered by presentation order |
| Task Card | Number, title, description, attachments |
| Status Controls | "Start", "Done", "Stuck" buttons |

### 3. Updating Task Status

| Status | Action | Effect |
|--------|--------|--------|
| Start | Begin working on task | Updates `live_students` doc |
| Done | Complete task | Moves to next, updates teacher view |
| Stuck | Need help | Alerts teacher instantly |

### 4. Completing the Session

**Trigger:** Student clicks "Sign Out" or class period ends

| Step | Action |
|------|--------|
| 1 | `analyticsScrubber.ts` extracts metrics |
| 2 | Anonymized data → `analytics_logs` |
| 3 | `live_students` document DELETED |
| 4 | Session ends, student returns to landing |

**Privacy Guarantee:** Student name is never stored permanently. Only anonymized metrics (time on task, questions asked) are retained.

---

## Cross-References

- **Data Structure:** [DATA_STRUCTURE_PLAN.md](file:///c:/Users/16047/Desktop/Antigravity/Shape%20of%20the%20Day%202/DATA_STRUCTURE_PLAN.md)
- **Technical Flows:** [userflowchart.md](file:///c:/Users/16047/Desktop/Antigravity/Shape%20of%20the%20Day%202/userflowchart.md)
- **UI Components:** [teachercomponents.md](file:///c:/Users/16047/Desktop/Antigravity/Shape%20of%20the%20Day%202/teachercomponents.md)
- **Design System:** [UI.md](file:///c:/Users/16047/Desktop/Antigravity/Shape%20of%20the%20Day%202/UI.md)
