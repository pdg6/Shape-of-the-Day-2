# E2E Test Suite Documentation

## Overview

This test suite provides comprehensive end-to-end testing for the Shape of the Day task management system using Cypress with Firebase Emulator integration.

## Test Files

| File | Priority | Description |
|------|----------|-------------|
| `task-hierarchy.cy.ts` | 1 | Tests hierarchical task creation (project→assignment→task→subtask) |
| `task-validation.cy.ts` | 2 | Tests form validation for empty/invalid inputs |
| `task-search.cy.ts` | 3 | Tests inventory search by title, description, date, attachments |
| `task-attachments.cy.ts` | 4 | Tests file upload, paste image, attachment display |
| `task-duplication.cy.ts` | 5 | Tests task duplication without question history |
| `permissions.cy.ts` | 6 | Tests student restrictions (only ask questions) |
| `student-questions.cy.ts` | 7 | Tests student questions saved to task history |
| `student-visibility.cy.ts` | 8 | Tests student calendar view and class-scoped visibility |
| `task-delete-cascade.cy.ts` | 9 | Tests parent deletion with children becoming standalone |

## Prerequisites

1. **Firebase Emulator Suite** must be running:
   ```powershell
   npm run emulators
   ```

2. **Development Server** must be running:
   ```powershell
   npm run dev
   ```

## Running Tests

### Interactive Mode (Recommended for Development)
```powershell
npm run cypress:open
```

### Headless Mode (For CI/CD)
```powershell
npm run cypress:run
```

### All-in-One (Starts server + runs tests)
```powershell
npm run test:e2e          # Interactive
npm run test:e2e:headless # Headless
npm run test:e2e:ci       # CI with Chrome
```

## Custom Cypress Commands

### `cy.loginAsTeacher(email, password)`
Logs in as a teacher with Firebase Auth.

### `cy.loginAsStudent(name, joinCode?)`
Logs in as a student and optionally joins a class.

### `cy.seedTestData(prefix?)`
Seeds the database with test classes and tasks.

### `cy.clearEmulator()`
Clears all Firebase Emulator data.

### `cy.createTask(taskData)`
Creates a task with the given properties.

### `cy.waitForFirebase(ms?)`
Waits for Firebase operations to complete.

## Test Coverage

### Task Hierarchy (task-hierarchy.cy.ts)
- ✅ Create projects, assignments, tasks, subtasks
- ✅ Enforce allowed parent-child relationships
- ✅ Prevent invalid hierarchies (e.g., subtask as parent)
- ✅ Multi-level nesting (project→assignment→task→subtask)

### Validation (task-validation.cy.ts)
- ✅ Require task title
- ✅ Require class assignment
- ✅ Validate date format
- ✅ Show inline error messages

### Search (task-search.cy.ts)
- ✅ Search by title
- ✅ Search by description
- ✅ Search by date
- ✅ Search by attachment filename
- ✅ Case-insensitive matching
- ✅ Partial word matching

### Attachments (task-attachments.cy.ts)
- ✅ Upload files (PDF, images, documents)
- ✅ Paste images into description
- ✅ Display attachments with icons
- ✅ Remove attachments
- ✅ Reject oversized files (>10MB)
- ✅ Reject unsupported file types
- ✅ Student visibility of attachments

### Duplication (task-duplication.cy.ts)
- ✅ Duplicate task with "(Copy)" suffix
- ✅ Preserve title, description, type, date
- ✅ **DO NOT copy question history**
- ✅ Copy attachments
- ✅ Reset status to pending
- ✅ Create independent copies

### Permissions (permissions.cy.ts)
- ✅ Students CANNOT create tasks
- ✅ Students CANNOT edit tasks
- ✅ Students CANNOT delete tasks
- ✅ Students CAN ask questions
- ✅ Students CAN update their own status
- ✅ Teachers have full access
- ✅ API-level security enforcement

### Student Questions (student-questions.cy.ts)
- ✅ Open question modal
- ✅ Submit questions successfully
- ✅ Save questions to task's questionHistory
- ✅ Include timestamp and student name
- ✅ Multiple questions from different students
- ✅ **Questions NOT duplicated when task is copied**
- ✅ Teacher sees question count badge

### Student Visibility (student-visibility.cy.ts)
- ✅ Students see tasks in calendar
- ✅ Tasks on correct date
- ✅ Class-scoped visibility
- ✅ Real-time updates
- ✅ Mini calendar indicators
- ✅ Status display and updates
- ✅ Overdue task highlighting

### Delete/Cascade (task-delete-cascade.cy.ts)
- ✅ Confirmation dialog
- ✅ Cancel deletion
- ✅ Delete removes from all views
- ✅ Children become standalone when parent deleted
- ✅ Preserve child content after parent deletion
- ✅ Delete attachments from storage
- ✅ Undo delete option
- ✅ Soft delete vs hard delete

## Environment Variables

The tests use these environment variables (set in `cypress.config.ts`):

```typescript
env: {
  FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
  FIRESTORE_EMULATOR_HOST: 'localhost:8080',
  FIREBASE_STORAGE_EMULATOR_HOST: 'localhost:9199',
}
```

## Firebase Emulator Ports

| Service | Port |
|---------|------|
| Auth | 9099 |
| Firestore | 8080 |
| Storage | 9199 |

## Troubleshooting

### Tests fail with "Firebase not connected"
Ensure Firebase Emulators are running: `npm run emulators`

### Tests timeout waiting for elements
- Check if the dev server is running
- Increase timeout in `cypress.config.ts`
- Verify selectors match the current UI

### Emulator data persists between runs
The `clearEmulator()` command should clear data. If not working:
```powershell
firebase emulators:start --clear
```

## Adding New Tests

1. Create a new file in `cypress/e2e/`
2. Use the existing patterns for setup/teardown
3. Use custom commands for common operations
4. Add test file to this documentation
