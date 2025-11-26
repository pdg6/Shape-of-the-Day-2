# Data Handling & Interaction Plan: Shape of the Day

This document outlines the comprehensive data structure, variable requirements, and interaction flows between the Teacher Dashboard and Student Views. It is designed to support a robust, real-time classroom management application.

## 1. Core Data Models

### 1.1 User (Teacher)
*Stored in `users` collection*
- `uid` (string): Unique identifier from Auth provider (Firebase Auth).
- `email` (string): Contact email.
- `displayName` (string): Teacher's full name (e.g., "Mrs. Smith").
- `photoURL` (string): Profile picture URL.
- `createdAt` (timestamp): Account creation date.
- `settings` (map):
    - `theme` (string): 'light' | 'dark' | 'system'.
    - `notifications` (boolean): Global notification toggle.

### 1.2 Classroom
*Stored in `classrooms` collection*
- `id` (string): Unique classroom ID.
- `teacherId` (string): Reference to the owner User `uid`.
- `name` (string): Friendly name (e.g., "Grade 5 - Room 101").
- `code` (string): 6-character alphanumeric join code (unique, indexed).
- `isLive` (boolean): Master switch for "Class is in session".
- `currentDayId` (string): Reference to the active `DaySchedule` ID.
- `settings` (map):
    - `allowGuestJoin` (boolean): If true, students can join without permanent accounts.
    - `requireApproval` (boolean): If true, teacher must approve join requests.
- `activeStudents` (number): Counter of currently connected students (computed/real-time).

### 1.3 Student (Session/Profile)
*Stored in `students` collection (or subcollection of `classrooms`)*
- `id` (string): Unique student ID (or device fingerprint for guests).
- `classroomId` (string): Reference to current `Classroom`.
- `displayName` (string): Student's chosen name.
- `status` (string): 'active' | 'idle' | 'offline'.
- `lastActive` (timestamp): For presence detection.
- `joinedAt` (timestamp): When they entered the room.
- `sentiment` (string): Optional mood indicator (e.g., 'happy', 'confused', 'tired').

### 1.4 Task / Activity Definition
*Stored in `tasks` (Global or Teacher-specific library)*
- `id` (string): Unique task ID.
- `teacherId` (string): Owner.
- `title` (string): Short headline (e.g., "Math Worksheet").
- `description` (string): Detailed instructions (Markdown supported).
- `type` (string): 'assignment' | 'reading' | 'break' | 'video' | 'group_work'.
- `estimatedDuration` (number): Minutes.
- `resources` (array of maps):
    - `type`: 'link' | 'file'.
    - `url`: Resource location.
    - `label`: Display text.

### 1.5 Day Schedule (The "Shape")
*Stored in `schedules` or subcollection of `classrooms`*
- `id` (string): Unique schedule ID (usually date-based, e.g., `2023-10-27`).
- `classroomId` (string): Reference.
- `date` (string): ISO Date string (YYYY-MM-DD).
- `items` (array of maps): *Ordered list of activities for the day*
    - `taskId` (string): Reference to Task Definition.
    - `instanceId` (string): Unique ID for this specific occurrence.
    - `startTime` (string): "09:00".
    - `endTime` (string): "09:45".
    - `isLocked` (boolean): If true, student cannot see/start yet.
    - `state` (string): 'upcoming' | 'active' | 'completed'.

### 1.6 Student Progress (The Interaction)
*Stored in `progress` subcollection under `DaySchedule` or `Classroom`*
- `id` (string): Composite key (`studentId_instanceId`).
- `studentId` (string): Reference.
- `instanceId` (string): Reference to Schedule Item.
- `status` (string): 'todo' | 'in_progress' | 'stuck' | 'done' | 'question'.
- `updatedAt` (timestamp): Last change time.
- `startedAt` (timestamp): When status moved from 'todo'.
- `completedAt` (timestamp): When status moved to 'done'.
- `studentComment` (string): Optional note from student ("I don't get #4").
- `teacherFeedback` (string): Optional reply from teacher.

---

## 2. Data Flow & Interaction Variables

### 2.1 Teacher Dashboard -> Backend
**Queries & Mutations:**
- **Create/Edit Schedule**:
    - Inputs: `date`, list of `taskIds`, time ranges.
    - Validation: No overlapping times, valid task IDs.
- **Go Live**:
    - Action: Set `classroom.isLive = true`.
    - Action: Set specific schedule item `state = 'active'`.
- **Monitor Progress**:
    - Query: Listen to `progress` collection where `instanceId` is in current schedule.
    - Metrics: Count of 'done', 'stuck', 'question' per task.

### 2.2 Student View -> Backend
**Queries & Mutations:**
- **Join Room**:
    - Input: `code`, `displayName`.
    - Output: `classroomId`, `sessionToken`.
- **Fetch "My Day"**:
    - Query: Get `DaySchedule` for `classroomId` + `today`.
    - Filter: Only show items where `isLocked == false`.
- **Update Status**:
    - Action: Update `progress` doc.
    - Payload: `{ status: 'stuck', studentComment: 'Help!' }`.
    - Trigger: Updates teacher dashboard in real-time.

---

## 3. Missing / Recommended Variables & Types

The current codebase has basic structures. To reach a "Senior" level, the following are needed:

### 3.1 Missing Data Fields
1.  **`Task.priority` / `Task.difficulty`**: To help teachers balance the day's load.
2.  **`Student.deviceType`**: 'tablet' | 'desktop' | 'mobile' (helps with UI rendering logic).
3.  **`ScheduleItem.transitionTime`**: Buffer time between tasks (e.g., 5 mins clean up).
4.  **`Progress.history`**: Array of status changes to track *how long* a student was stuck.
    - `[{ status: 'stuck', timestamp: 123456 }, { status: 'in_progress', timestamp: 123499 }]`
5.  **`Classroom.announcement`**: A global sticky message (e.g., "Remember to bring permission slips!").

### 3.2 Missing System States
1.  **`ConnectionState`**: 'connected' | 'reconnecting' | 'disconnected'. Vital for reliable classroom usage.
2.  **`SyncStatus`**: 'synced' | 'pending' | 'error'. For optimistic UI updates.

---

## 4. Secure Data Transfer & Reliability Plan

To ensure secure and reliable transfer between Backend (Firebase) and Frontend:

### 4.1 Security Rules (Firestore Security Rules)
*   **Authentication**:
    *   Teachers must be authenticated via Firebase Auth.
    *   Students can be anonymous (Auth) or custom token based, but must have a valid session.
*   **Authorization**:
    *   `classrooms`: Read (Public if code matches), Write (Teacher only).
    *   `tasks`: Read (Students in class), Write (Teacher only).
    *   `progress`: Read (Teacher & Owner Student), Write (Owner Student only).
    *   **Strict Validation**: Ensure `studentId` in the payload matches the `request.auth.uid`.

### 4.2 Data Integrity & Reliability
1.  **Optimistic UI Updates**:
    *   Frontend should update state *immediately* upon user action (e.g., clicking "Done").
    *   Background process syncs to Firestore.
    *   Rollback mechanism if sync fails (Toast: "Could not save progress").
2.  **Offline Support**:
    *   Enable `enableIndexedDbPersistence()` in Firebase config.
    *   Allows students to continue working if Wi-Fi drops; syncs when reconnected.
3.  **Debouncing Writes**:
    *   For text inputs (like comments), debounce writes (wait 500ms-1s after typing stops) to save reads/writes and reduce jitter.
4.  **Error Handling**:
    *   Global Error Boundary in React.
    *   Specific service-level try/catch blocks with user-friendly error messages (not "Error 500", but "Check your internet connection").

### 4.3 Real-time Optimization
*   **Snapshots vs. One-time Gets**:
    *   Use `onSnapshot` (Real-time) for: `activeSchedule`, `studentProgress`, `classroom.isLive`.
    *   Use `getDocs` (One-time) for: `taskLibrary`, `pastSchedules`, `studentRoster` (unless strictly needed live).
*   **Unsubscribing**:
    *   Strictly enforce `useEffect` cleanup functions to unsubscribe from listeners to prevent memory leaks and excessive billing.
