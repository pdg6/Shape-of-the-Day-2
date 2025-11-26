# Master Technical Specification: Shape of the Day (AI-Enhanced Edition)
Version: 2.0 (Final)
Target Stack: React (Vite), TypeScript, Tailwind, Firebase (Firestore/Auth/Functions/Genkit).

## 1. System Architecture & Dependencies

### 1.1 Core Environment
*   **Frontend**: React 18, TypeScript 5.0+, Vite.
*   **State Management**: zustand (Global store for Classroom Context and User Auth).
*   **Backend**: Google Firebase (BaaS).
*   **Database**: Cloud Firestore (NoSQL).
*   **Auth**: Firebase Auth (Email for Teachers, Anonymous for Students).
*   **AI Engine**: Firebase Genkit (Node.js) + Vertex AI (Gemini 1.5 Flash).
*   **Vector Search**: Firestore Vector Search (for RAG).

### 1.2 Critical Dependencies (Package.json)
```json
{
  "dependencies": {
    "firebase": "^10.x",
    "react-router-dom": "^6.x",
    "zustand": "^4.x",              // State Management
    "lucide-react": "^0.x",         // Icons
    "qrcode.react": "^3.x",         // Client-side QR Generation
    "papaparse": "^5.x",            // CSV Parsing
    "react-dropzone": "^14.x",      // File Drag-and-Drop
    "recharts": "^2.x",             // Analytics Charts
    "date-fns": "^2.x",             // Date Math
    "clsx": "^2.x",                 // Tailwind Class Merging
    "tailwind-merge": "^2.x",
    "framer-motion": "^10.x"        // Smooth Sidebar/Modal Animations
  },
  "devDependencies": {
    "@genkit-ai/firebase": "latest",
    "@genkit-ai/googleai": "latest",
    "@genkit-ai/flow": "latest"
  }
}
```

## 2. Comprehensive Data Schema (Firestore)

### 2.1 Collection: users (Teachers)
*   **ID**: `auth.uid`
*   **Fields**:
    *   `email` (string)
    *   `settings` (map): `{ theme: 'system', dashboardLayout: 'grid' }`

### 2.2 Collection: classrooms (Persistent Config)
*   **ID**: Auto-ID
*   **Fields**:
    *   `teacherId` (string): Indexable.
    *   `name` (string): "Period 1 - CS".
    *   `joinCode` (string): "H7K9L2" (Unique Index).
    *   `subject` (string): "Computer Science".
    *   `gradeLevel` (string): "Grade 10".
    *   `color` (string): Hex code `#3B82F6` (Used for Header UI).
    *   `presentationSettings` (map):
        *   `defaultView`: 'grid' | 'list'
        *   `showTimeEstimates`: boolean
        *   `allowStudentSorting`: boolean

### 2.3 Collection: tasks (Global Library & RAG Source)
*   **ID**: Auto-ID
*   **Fields**:
    *   `teacherId` (string)
    *   `title` (string)
    *   `description` (string): Markdown supported.
    *   `type` (string): 'assignment' | 'reading' | 'break' | 'video'.
    *   `duration` (number): Minutes.
    *   `embedding` (vector): 768-dimensional vector (Generated via text-embedding-004) for AI search.

### 2.4 Sub-Collection: classrooms/{id}/live_students (Ephemeral)
*   **Policy**: Use & Destroy. Documents exist only during the session.
*   **ID**: `auth.uid` (Anonymous ID).
*   **Fields**:
    *   `displayName` (string): Self-identified name (e.g., "Sarah").
    *   `joinedAt` (timestamp)
    *   `lastActive` (timestamp): Heartbeat.
    *   `globalStatus` (enum): 'idle' | 'working' | 'stuck' | 'question'.
    *   `activeTaskIds` (array string)
    *   `completedTaskCount` (number)
    *   `currentMessage` (string): "I don't understand the loop syntax."

### 2.5 Collection: analytics_logs (Permanent Archive)
*   **Policy**: Strictly Anonymized.
*   **Fields**:
    *   `classroomId` (string)
    *   `date` (string): "2023-11-26"
    *   `totalSessionTime` (number)
    *   `taskPerformance` (array):
        *   `{ taskId: string, timeToComplete: number, wasStuck: boolean }`
    *   `interactionLog` (array):
        *   `{ timestamp: string, type: 'question', content: 'What is a variable?', taskId: string }`

## 3. Module Implementation Specifications

### Module 1: Classroom Manager & Context Switching
*   **Requirement**: Header dropdown to switch classes; CRUD interface.
*   **Global Store (`useClassroomStore.ts`)**:
    *   `activeClass`: The full object of the currently selected class.
    *   `setActiveClass(classId)`: Updates state and triggers a re-fetch of live students.
*   **Header Component (`HeaderSelector.tsx`)**:
    *   Displays `activeClass.name` centered.
    *   Dropdown: Lists all classes belonging to `auth.uid`.
    *   Logic: When a new class is selected, update the Global Store. This instantly changes the `live_students` listener path.
*   **Manager Page (`/teacher/manage`)**:
    *   Create/Edit Modal: Form fields for Name, Subject, Grade, Color.
    *   Action: `addDoc(collection(db, 'classrooms'), data)` or `updateDoc`.
    *   Delete Action: Must perform a recursive delete (or trigger a Cloud Function) to remove the `live_students` subcollection to prevent orphaned data.

### Module 2: The Login & Privacy Loop
*   **Requirement**: QR Code entry, Anonymous Auth, Data Scrubbing on exit.
*   **Sidebar (`ConnectionHub.tsx`)**:
    *   Use `qrcode.react` to render `https://app.com/join/${activeClass.joinCode}`.
    *   Listen to `classrooms/{activeClass.id}/live_students`.
    *   Render list of connected students (Name + Status).
*   **Student Join (`/join/:code`)**:
    *   Call `signInAnonymously(auth)`.
    *   Prompt for Name ("Sarah").
    *   Write: `setDoc(doc(db, ...), { displayName: 'Sarah', ... })`.
*   **The Scrub Function (`utils/scrubber.ts`)**:
    *   Trigger: Student clicks "Leave" OR Teacher clicks "End Class".
    *   Operation (Batch):
        1.  Read `live_student` doc.
        2.  Transform to `analytics_log` format (Strip Name, Calculate Durations).
        3.  `batch.set(analyticsRef, anonymizedData)`.
        4.  `batch.delete(liveStudentRef)`.
    *   Result: PII is gone; Metrics remain.

### Module 3: CSV Data Ingestion
*   **Requirement**: Bulk upload for Classes and Tasks.
*   **Component**: `DropzoneImport.tsx`.
*   **Parsing**:
    ```typescript
    Papa.parse(file, {
      header: true,
      complete: (results) => handleBatchUpload(results.data)
    })
    ```
*   **Mapping Logic**:
    *   Detect headers: Title -> title, Minutes -> duration.
    *   Validation: Reject rows with missing required fields.
    *   Security: Sanitize strings (remove HTML tags) before database write.

### Module 4: Real-Time Status & Dashboard
*   **Requirement**: "Stuck", "Question", "Done" states with immediate visual feedback.
*   **Student UI**:
    *   Question Workflow: Click "Question" -> Open Modal -> Input Text -> Save.
    *   Data Write: `updateDoc` on `live_student` with `{ globalStatus: 'question', currentMessage: '...' }`.
*   **Teacher UI**:
    *   Grid View: Map through `live_students`.
    *   Visual Priority:
        *   If `status === 'question'`: Card Bg = Red. Show `currentMessage`.
        *   If `status === 'stuck'`: Card Bg = Amber.
        *   If `status === 'working'`: Card Bg = Green/White.

### Module 5: AI-Augmented Scheduling (RAG)
*   **Requirement**: "Generate a 50 min Math lesson" using my tasks.
*   **Backend (Genkit Flow)**:
    *   File: `functions/src/flows/generateSchedule.ts`.
    *   Step 1: Receive topic ("Fractions") and duration (50).
    *   Step 2: `db.collection('tasks').findNearest(...)` (Vector Search). Retrieve top 10 relevant tasks.
    *   Step 3: Pass tasks + constraints to Gemini 1.5 Flash.
    *   Prompt: "Select tasks from this list to create a 50-minute flow. Return JSON."
*   **Frontend Hook**:
    *   UI: "Magic Generate" button.
    *   Action: Call Cloud Function.
    *   Result: Populate the "Draft Schedule" area with the AI's selection.

## 4. Security & Robustness Plan

### 4.1 Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Teachers: Full control over their own classrooms
    match /classrooms/{classId} {
      allow read, write: if request.auth != null && resource.data.teacherId == request.auth.uid;
      
      // Students: Can join if they know the ID (or we query by code)
      allow read: if true; 
      
      // Live Students Subcollection
      match /live_students/{studentId} {
        // Teacher can read/delete all
        allow read, delete: if get(/databases/$(database)/documents/classrooms/$(classId)).data.teacherId == request.auth.uid;
        // Students can only read/write their OWN doc
        allow read, write: if request.auth.uid == studentId;
      }
    }
    
    // Analytics: Write-only for students, Read-only for teachers
    match /analytics_logs/{logId} {
      allow create: if request.auth != null; // Student writing on exit
      allow read: if request.auth != null;   // Teacher analysis
    }
  }
}
```

### 4.2 Handling Edge Cases
*   **The "Ghost Student"**:
    *   Issue: Student closes laptop without clicking "Leave". Data remains in `live_students`.
    *   Fix: Scheduled Cloud Function (cron: every 60 mins).
    *   Logic: Delete any `live_student` doc where `lastActive` > 2 hours. (Note: Analytics might be lost here, acceptable trade-off for privacy/cleanup).
*   **Connection Drop**:
    *   Feature: `offline-persistence` enabled in Firestore SDK.
    *   UI: Show "Reconnecting..." toast if `navigator.onLine` is false.

## 5. Deployment Checklist
1.  **Firebase Console**:
    *   Enable Auth (Email/Pass + Anonymous).
    *   Create Firestore Database.
    *   Enable Vertex AI API (for Genkit).
    *   Deploy Firestore Indexes (defined in `firestore.indexes.json` for sorting).
2.  **Environment Variables (.env)**:
    *   `VITE_FIREBASE_API_KEY`
    *   `VITE_FIREBASE_AUTH_DOMAIN`
    *   `VITE_FIREBASE_PROJECT_ID`
3.  **Build**: `npm run build` -> `firebase deploy`.

## 6. UI/UX Standards (Stage 1 Freeze)
**Note:** The following UI/UX settings have been established in Stage 1 and must be maintained in all future updates.

*   **Borders**:
    *   **Teacher Components**: All main containers (TaskManager, ShapeOfDay, etc.) and sidebar elements (QR code, student list) use `border-[3px]`.
    *   **Student Components**: All main containers (TaskCard, MiniCalendar, etc.) and interactive elements (inputs, buttons) use `border-[3px]`.
    *   **Shared Components**: Login buttons, Join inputs, and Landing Page cards use `border-[3px]`.
*   **Theme Toggle**:
    *   Located in the Teacher Sidebar footer.
    *   Centered icon when collapsed, left-aligned with text when expanded.
    *   Icon reflects *current* state (Moon for Dark Mode, Sun for Light Mode).
*   **Color Palette**:
    *   Strict adherence to `brand-*` utility classes defined in `tailwind.config.js` and `index.css`.
    *   Dark mode support is mandatory for all new components.
