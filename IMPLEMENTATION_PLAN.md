# Implementation Plan: Shape of the Day (Privacy Edition)

This plan outlines the three-stage implementation strategy for the Teacher Components and Privacy Architecture described in `teachercomponents.md`.

## Stage 1: Foundation & Real-Time Connection
**Goal:** Establish the core data models, install dependencies, and build the "Connection Sidebar" to allow students to join a session and appear in the teacher's roster in real-time.

### Tasks:
1.  **Dependencies & Setup**:
    *   Install required packages: `npm install react-router-dom lucide-react qrcode.react recharts date-fns uuid framer-motion zustand firebase`.
    *   Verify Firebase configuration in `src/firebase.ts`.

2.  **Data Modeling (Firestore)**:
    *   Define TypeScript interfaces for `Classroom`, `LiveStudent`, and `AnalyticsLog` in `src/types/index.ts`.
    *   Create a helper function to initialize a static `classrooms` document for testing (e.g., "7X99L").

3.  **Teacher Sidebar (Connection Hub)**:
    *   Create `src/components/teacher/ConnectionSidebar.tsx`.
    *   Implement the **Collapsed State**: Show QR icon and live student count.
    *   Implement the **Expanded State**: Render the QR code (using `qrcode.react`) and the scrollable roster list.
    *   Add a Firestore listener (`onSnapshot`) to the `live_students` sub-collection to update the roster in real-time.

4.  **Student Join Flow (Basic)**:
    *   Update `src/components/shared/JoinRoom.tsx` (or create `src/pages/student/JoinClass.tsx` if preferred) to:
        *   Accept a "Display Name".
        *   Authenticate anonymously via Firebase (`signInAnonymously`).
        *   Write a new document to `classrooms/{classId}/live_students/{uid}` with the display name and `joinedAt` timestamp.

**Deliverable:** A teacher can open the sidebar, see a QR code, and watch as students join the session and appear in the list instantly.

---

## Stage 2: The "Live Session" & Data Flow
**Goal:** Enable the actual classroom workflow where students perform tasks, update their status, and this data is reflected live on the teacher's dashboard.

### Tasks:
1.  **Student Task Interaction**:
    *   Update `StudentView.tsx` to write status changes (e.g., "todo" -> "in_progress", "stuck") to the student's document in Firestore (`live_students/{uid}`).
    *   Ensure the `currentTask` and `realTimeProgress` fields are being updated as the student works.

2.  **Teacher Live View**:
    *   Update `src/components/teacher/LiveView.tsx` to consume the real-time data from `live_students`.
    *   Display student cards showing their current task and status (e.g., a red border if they are "stuck").

3.  **State Management**:
    *   Set up a simple Zustand store (`src/store/classStore.ts`) to manage the `currentClassId` and `isSidebarOpen` state globally, avoiding prop drilling.

**Deliverable:** Students can mark tasks as "stuck" or "done", and the teacher sees these updates immediately on their dashboard.

---

## Stage 3: Privacy "Scrubbing" & Analytics
**Goal:** Implement the "Use & Destroy" privacy policy and the persistent analytics dashboard.

### Tasks:
1.  **The Scrubber Utility**:
    *   Create `src/utils/analyticsScrubber.ts`.
    *   Implement `scrubAndSaveSession(studentId, classId, liveData)`:
        *   Extract non-PII data (task durations, stuck points).
        *   Write to `analytics_logs` collection.
        *   **DELETE** the document from `live_students` to enforce privacy.

2.  **Triggering the Scrub**:
    *   Add a "Sign Out" button to `StudentView.tsx` that calls `scrubAndSaveSession`.
    *   Add an "End Class" button to `TeacherDashboard.tsx` that iterates through all active students and runs the scrubber for each.

3.  **Analytics Dashboard**:
    *   Create `src/components/teacher/AnalyticsDashboard.tsx` (or update the placeholder).
    *   **Pane A (Bar Chart)**: Use `recharts` to visualize average time per task.
    *   **Pane B (Friction Log)**: Display a list of anonymous questions/stuck points.
    *   **Pane C (Class Pulse)**: Render a Pie Chart showing the overall success/friction ratio.

4.  **Security Rules**:
    *   Draft and apply Firestore security rules to ensure students can only write to their own document and `analytics_logs` is write-only for them.

**Deliverable:** A fully privacy-compliant system where student data is ephemeral, but valuable teaching insights are preserved anonymously.
