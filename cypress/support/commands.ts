// Cypress custom commands for E2E testing
// These commands help with Firebase authentication and data management

import '@testing-library/cypress/add-commands';

// Extend Cypress chainable interface
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Login as a teacher using Firebase Auth emulator
       */
      loginAsTeacher(email?: string, password?: string): Chainable<void>;
      
      /**
       * Login as a student (anonymous auth with display name)
       */
      loginAsStudent(displayName: string, joinCode?: string): Chainable<void>;
      
      /**
       * Clear all data from Firebase emulator
       */
      clearEmulator(): Chainable<void>;
      
      /**
       * Seed the emulator with test data
       */
      seedTestData(data?: TestData | string): Chainable<void>;
      
      /**
       * Create a classroom via the UI
       */
      createClassroom(name: string, subject?: string): Chainable<string>;
      
      /**
       * Create a task hierarchy (project -> assignment -> task -> subtask)
       */
      createTaskHierarchy(classroomId: string): Chainable<TaskHierarchy>;
      
      /**
       * Wait for Firebase data to sync
       */
      waitForFirebase(timeout?: number): Chainable<void>;
      
      /**
       * Get a task by title from the UI
       */
      getTaskByTitle(title: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

// Types for test data
interface TestData {
  classrooms?: Array<{
    id?: string;
    name: string;
    joinCode: string;
    teacherId: string;
    subject?: string;
  }>;
  tasks?: Array<{
    id?: string;
    title: string;
    description: string;
    type: 'project' | 'assignment' | 'task' | 'subtask';
    parentId?: string | null;
    selectedRoomIds: string[];
    teacherId: string;
  }>;
}

interface TaskHierarchy {
  projectId: string;
  assignmentId: string;
  taskId: string;
  subtaskId: string;
}

// Firebase emulator endpoints
const AUTH_EMULATOR = 'http://localhost:9099';
const FIRESTORE_EMULATOR = 'http://localhost:8080';

/**
 * Login as a teacher using email/password
 */
Cypress.Commands.add('loginAsTeacher', (
  email = 'teacher@test.com',
  password = 'testpassword123'
) => {
  cy.log('🔐 Logging in as teacher...');
  
  // First, create the user in the emulator if needed
  cy.request({
    method: 'POST',
    url: `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    body: {
      email,
      password,
      returnSecureToken: true
    },
    failOnStatusCode: false
  }).then((signUpResponse) => {
    // If user exists, sign in instead
    if (signUpResponse.status === 400) {
      cy.request({
        method: 'POST',
        url: `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
        body: {
          email,
          password,
          returnSecureToken: true
        }
      }).then((signInResponse) => {
        // Store the token for later use
        window.localStorage.setItem('firebase:authToken', signInResponse.body.idToken);
        window.localStorage.setItem('firebase:userId', signInResponse.body.localId);
      });
    } else {
      window.localStorage.setItem('firebase:authToken', signUpResponse.body.idToken);
      window.localStorage.setItem('firebase:userId', signUpResponse.body.localId);
    }
  });
  
  // Visit the app and wait for auth to initialize
  cy.visit('/');
  cy.waitForFirebase();
});

/**
 * Login as a student (anonymous auth)
 */
Cypress.Commands.add('loginAsStudent', (displayName: string, joinCode?: string) => {
  cy.log(`🎒 Logging in as student: ${displayName}${joinCode ? ` with join code: ${joinCode}` : ''}`);
  
  // Create anonymous user
  cy.request({
    method: 'POST',
    url: `${AUTH_EMULATOR}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    body: {
      returnSecureToken: true
    }
  }).then((response) => {
    window.localStorage.setItem('firebase:authToken', response.body.idToken);
    window.localStorage.setItem('firebase:userId', response.body.localId);
    window.localStorage.setItem('studentName', displayName);
    if (joinCode) {
      window.localStorage.setItem('studentJoinCode', joinCode);
    }
  });
  
  cy.visit('/');
  cy.waitForFirebase();
});

/**
 * Clear all emulator data
 */
Cypress.Commands.add('clearEmulator', () => {
  cy.log('🧹 Clearing emulator data...');
  
  // Clear Firestore
  cy.request({
    method: 'DELETE',
    url: `${FIRESTORE_EMULATOR}/emulator/v1/projects/shape-of-the-day/databases/(default)/documents`,
    failOnStatusCode: false
  });
  
  // Clear Auth users
  cy.request({
    method: 'DELETE',
    url: `${AUTH_EMULATOR}/emulator/v1/projects/shape-of-the-day/accounts`,
    failOnStatusCode: false
  });
  
  // Clear localStorage
  cy.clearLocalStorage();
});

/**
 * Seed test data into the emulator
 */
Cypress.Commands.add('seedTestData', (dataOrPrefix?: TestData | string) => {
  cy.log('🌱 Seeding test data...');
  
  const projectId = 'shape-of-the-day';
  
  // Handle string prefix (for naming)
  const prefix = typeof dataOrPrefix === 'string' ? dataOrPrefix : '';
  
  // Use default data if none provided or if string was provided
  const data: TestData = typeof dataOrPrefix === 'object' ? dataOrPrefix : {
    classrooms: [
      { id: 'period-1', name: `${prefix ? prefix + ' ' : ''}Period 1`, joinCode: 'period-1-join-code', teacherId: 'teacher-1' },
      { id: 'period-2', name: `${prefix ? prefix + ' ' : ''}Period 2`, joinCode: 'period-2-join-code', teacherId: 'teacher-1' },
      { id: 'period-3', name: `${prefix ? prefix + ' ' : ''}Period 3`, joinCode: 'period-3-join-code', teacherId: 'teacher-1' },
    ],
    tasks: []
  };
  
  // Seed classrooms
  if (data.classrooms) {
    data.classrooms.forEach((classroom) => {
      const docId = classroom.id || `classroom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      cy.request({
        method: 'POST',
        url: `${FIRESTORE_EMULATOR}/v1/projects/${projectId}/databases/(default)/documents/classrooms?documentId=${docId}`,
        body: {
          fields: {
            name: { stringValue: classroom.name },
            joinCode: { stringValue: classroom.joinCode },
            teacherId: { stringValue: classroom.teacherId },
            subject: { stringValue: classroom.subject || '' },
          }
        },
        failOnStatusCode: false
      });
    });
  }
  
  // Seed tasks
  if (data.tasks) {
    data.tasks.forEach((task) => {
      const docId = task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      cy.request({
        method: 'POST',
        url: `${FIRESTORE_EMULATOR}/v1/projects/${projectId}/databases/(default)/documents/tasks?documentId=${docId}`,
        body: {
          fields: {
            title: { stringValue: task.title },
            description: { stringValue: task.description },
            type: { stringValue: task.type },
            parentId: task.parentId ? { stringValue: task.parentId } : { nullValue: null },
            selectedRoomIds: { 
              arrayValue: { 
                values: task.selectedRoomIds.map(id => ({ stringValue: id }))
              }
            },
            teacherId: { stringValue: task.teacherId },
            status: { stringValue: 'todo' },
          }
        },
        failOnStatusCode: false
      });
    });
  }
});

/**
 * Create a classroom via the UI
 */
Cypress.Commands.add('createClassroom', (name: string, subject?: string) => {
  cy.log(`📚 Creating classroom: ${name}`);
  
  // Navigate to classrooms section
  cy.get('[data-testid="nav-classrooms"]').click();
  cy.get('[data-testid="add-classroom-btn"]').click();
  
  // Fill in the form
  cy.get('[data-testid="classroom-name-input"]').type(name);
  if (subject) {
    cy.get('[data-testid="classroom-subject-input"]').type(subject);
  }
  
  // Submit
  cy.get('[data-testid="save-classroom-btn"]').click();
  
  // Wait for creation and return the classroom ID
  cy.waitForFirebase();
  
  // Get the newly created classroom ID from the list
  return cy.get(`[data-testid="classroom-card"]`).contains(name)
    .parents('[data-testid="classroom-card"]')
    .invoke('attr', 'data-classroom-id');
});

/**
 * Create a full task hierarchy
 */
Cypress.Commands.add('createTaskHierarchy', (classroomId: string) => {
  cy.log('🏗️ Creating task hierarchy...');
  
  const hierarchy: TaskHierarchy = {
    projectId: '',
    assignmentId: '',
    taskId: '',
    subtaskId: ''
  };
  
  // Navigate to task creation
  cy.get('[data-testid="nav-tasks"]').click();
  cy.get('[data-testid="create-task-btn"]').click();
  
  // Create Project
  cy.get('[data-testid="type-selector"]').select('project');
  cy.get('[data-testid="title-input"]').type('Test Project');
  cy.get('[data-testid="description-input"]').type('A test project for E2E testing');
  cy.get(`[data-testid="class-toggle-${classroomId}"]`).click();
  cy.get('[data-testid="save-task-btn"]').click();
  cy.waitForFirebase();
  
  // Store project ID and create assignment as child
  cy.get('[data-testid="task-list"]').contains('Test Project')
    .parents('[data-testid="task-item"]')
    .invoke('attr', 'data-task-id')
    .then((projectId) => {
      hierarchy.projectId = projectId as string;
      
      // Create Assignment under Project
      cy.get('[data-testid="create-task-btn"]').click();
      cy.get('[data-testid="type-selector"]').select('assignment');
      cy.get('[data-testid="parent-selector"]').select(projectId as string);
      cy.get('[data-testid="title-input"]').type('Test Assignment');
      cy.get('[data-testid="description-input"]').type('A test assignment');
      cy.get('[data-testid="save-task-btn"]').click();
      cy.waitForFirebase();
    });
  
  // Continue with task and subtask creation
  cy.get('[data-testid="task-list"]').contains('Test Assignment')
    .parents('[data-testid="task-item"]')
    .invoke('attr', 'data-task-id')
    .then((assignmentId) => {
      hierarchy.assignmentId = assignmentId as string;
      
      // Create Task under Assignment
      cy.get('[data-testid="create-task-btn"]').click();
      cy.get('[data-testid="type-selector"]').select('task');
      cy.get('[data-testid="parent-selector"]').select(assignmentId as string);
      cy.get('[data-testid="title-input"]').type('Test Task');
      cy.get('[data-testid="description-input"]').type('A test task');
      cy.get('[data-testid="save-task-btn"]').click();
      cy.waitForFirebase();
    });
  
  cy.get('[data-testid="task-list"]').contains('Test Task')
    .parents('[data-testid="task-item"]')
    .invoke('attr', 'data-task-id')
    .then((taskId) => {
      hierarchy.taskId = taskId as string;
      
      // Create Subtask under Task
      cy.get('[data-testid="create-task-btn"]').click();
      cy.get('[data-testid="type-selector"]').select('subtask');
      cy.get('[data-testid="parent-selector"]').select(taskId as string);
      cy.get('[data-testid="title-input"]').type('Test Subtask');
      cy.get('[data-testid="description-input"]').type('A test subtask');
      cy.get('[data-testid="save-task-btn"]').click();
      cy.waitForFirebase();
    });
  
  cy.get('[data-testid="task-list"]').contains('Test Subtask')
    .parents('[data-testid="task-item"]')
    .invoke('attr', 'data-task-id')
    .then((subtaskId) => {
      hierarchy.subtaskId = subtaskId as string;
    });
  
  return cy.wrap(hierarchy);
});

/**
 * Wait for Firebase operations to complete
 */
Cypress.Commands.add('waitForFirebase', (timeout = 2000) => {
  cy.wait(timeout);
});

/**
 * Get a task element by its title
 */
Cypress.Commands.add('getTaskByTitle', (title: string) => {
  return cy.contains('[data-testid="task-item"]', title);
});

export {};
