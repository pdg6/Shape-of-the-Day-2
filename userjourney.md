# User Journey

This document outlines the user journeys for both Teachers and Students within the "Shape of the Day" application.
 
## Teacher Journey

The teacher's experience is designed for classroom and content management, focusing on preparation, real-time monitoring, and reusability.

1.  **Authentication & Onboarding**:
    *   Teachers log in using their Google account via Firebase Authentication (`AuthContext.tsx`).
    *   The system recognizes their role and directs them to the `TeacherDashboard`, their central hub.

2.  **Classroom Management**:
    *   From the dashboard, teachers can create new classrooms using the `ClassFormModal`.
    *   They can select an active classroom to manage. This selection is stored globally (`useClassStore`) and dictates the context for all other actions.

3.  **Content Creation (Task Manager)**:
    *   The `TaskManager` is a powerful interface for creating hierarchical learning content. Teachers can build complex structures with:
        *   **Projects**: Top-level containers for large units of work.
        *   **Assignments**: Mid-level tasks within projects.
        *   **Tasks**: The smallest, individual unit of work.
    *   This tool allows for rich content definition, including scheduling, adding attachments, and setting dependencies between tasks.

4.  **Content Library (Task Inventory)**:
    *   The `TaskInventory` serves as the teacher's personal library of all previously created content.
    *   It provides a hierarchical, searchable, and filterable view, allowing teachers to easily find, reuse, duplicate, and edit tasks for different classes or school years. This promotes efficiency and consistency.

5.  **Daily Lesson Presentation (Shape of the Day)**:
    *   The `ShapeOfDay` component is the primary presentation view intended for display during a live class.
    *   It automatically displays the sequence of tasks scheduled for the current day and selected class.
    *   Most importantly, it generates and displays a unique **Join Code** and a **QR Code**, which students use to enter the live session.

6.  **Live Class Monitoring (Live View)**:
    *   During a class, the `LiveView` provides a real-time dashboard of student progress.
    *   It listens to live updates from the `live_students` Firestore collection.
    *   Teachers can instantly see which students have joined, which task they are currently working on, and who is "stuck" or has completed the work. This enables immediate, targeted support.

## Student Journey

The student's experience is ephemeral and session-based, designed to be simple, direct, and focused on the day's tasks.

1.  **Joining a Class**:
    *   Students do not have persistent accounts.
    *   They navigate to the application's landing page (`LandingPage.tsx`).
    *   They use the **Join Code** (or QR code) provided by the teacher to enter the classroom session.
    *   They are prompted to enter their name, which identifies them for the duration of the live session.

2.  **Viewing Tasks (Student View)**:
    *   Upon joining, the `StudentView` is rendered.
    *   This view displays a clean, ordered list of the day's tasks, exactly as arranged by the teacher in the `ShapeOfDay`.

3.  **Interacting with Tasks**:
    *   Students work through the tasks sequentially.
    *   The UI provides simple controls for them to update their status on the current task (e.g., "In Progress," "Completed").
    *   A key feature is the ability to mark themselves as "Stuck" or "Needs Help."

4.  **Real-time Feedback to Teacher**:
    *   Every status change a student makes (e.g., starting a task, getting stuck, completing it) is instantly sent to Firestore.
    *   This data feeds directly into the teacher's `LiveView`, closing the feedback loop and enabling real-time classroom management.

5.  **Completing the Session**:
    *   Once the student finishes all tasks or the class period ends, their session is effectively over. The data from their session is primarily used for the live classroom experience and is not stored in a persistent student profile.
