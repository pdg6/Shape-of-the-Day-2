/**
 * Permissions E2E Tests
 * 
 * Tests that students can only ask questions, not create/edit/delete tasks
 * and that teachers have full access
 * 
 * Priority: 6
 */

describe('Permissions', () => {
  const teacherEmail = 'teacher@test.com';
  const teacherPassword = 'testpassword123';
  const studentName = 'Restricted Student';

  beforeEach(() => {
    cy.clearEmulator();
    cy.loginAsTeacher(teacherEmail, teacherPassword);
    cy.seedTestData();
    
    // Create a task for permission testing
    cy.visit('/');
    cy.contains('Tasks').click();
    cy.contains('Create').click();
    
    cy.get('input[type="text"]').first().type('Permission Test Task');
    cy.get('textarea[placeholder*="Instructions"]').type('Test task for permissions');
    cy.get('button').contains(/class|period/i).first().click({ force: true });
    cy.contains('button', /save/i).click();
    cy.waitForFirebase();
  });

  describe('Student Restrictions', () => {
    beforeEach(() => {
      cy.loginAsStudent(studentName);
    });

    it('should NOT show create task button to students', () => {
      cy.contains('button', /create.*task|new.*task|add.*task/i).should('not.exist');
    });

    it('should NOT show task creation form to students', () => {
      // Try to navigate directly
      cy.visit('/tasks/create');
      
      // Should redirect or show error
      cy.url().should('not.include', '/tasks/create');
    });

    it('should NOT show edit button on tasks for students', () => {
      cy.contains('Permission Test Task').click();
      
      cy.contains('button', /edit/i).should('not.exist');
      cy.get('[data-testid="edit-task"]').should('not.exist');
    });

    it('should NOT show delete button on tasks for students', () => {
      cy.contains('Permission Test Task').click();
      
      cy.contains('button', /delete|remove/i).should('not.exist');
      cy.get('[data-testid="delete-task"]').should('not.exist');
    });

    it('should NOT show duplicate button to students', () => {
      cy.contains('Permission Test Task').click();
      
      cy.contains('button', /duplicate|copy|clone/i).should('not.exist');
    });

    it('should NOT allow editing task title', () => {
      cy.contains('Permission Test Task').click();
      
      // Title should not be editable
      cy.get('input[value="Permission Test Task"]').should('not.exist');
      cy.contains('Permission Test Task')
        .should('not.have.attr', 'contenteditable', 'true');
    });

    it('should NOT allow editing task description', () => {
      cy.contains('Permission Test Task').click();
      
      // Description should not be editable
      cy.get('textarea').filter(':visible').should('have.length', 0);
    });

    it('should NOT allow changing task due date', () => {
      cy.contains('Permission Test Task').click();
      
      cy.get('input[type="date"]').should('not.exist');
    });

    it('should NOT allow changing task type', () => {
      cy.contains('Permission Test Task').click();
      
      cy.get('select').filter('[name*="type"]').should('not.exist');
    });

    it('should NOT allow changing task parent', () => {
      cy.contains('Permission Test Task').click();
      
      cy.get('select').filter('[name*="parent"]').should('not.exist');
      cy.contains('button', /change.*parent|select.*parent/i).should('not.exist');
    });

    it('should NOT allow uploading attachments', () => {
      cy.contains('Permission Test Task').click();
      
      cy.get('input[type="file"]').should('not.exist');
      cy.contains('button', /upload|attach/i).should('not.exist');
    });

    it('should NOT allow removing attachments', () => {
      // Teacher adds attachment first
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Permission Test Task').click();
      
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('test'),
        fileName: 'student_cant_remove.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      cy.waitForFirebase(3000);
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Student view
      cy.loginAsStudent(studentName);
      cy.contains('Permission Test Task').click();
      
      // Should see attachment but not remove button
      cy.contains('student_cant_remove.pdf').should('be.visible');
      cy.contains('student_cant_remove.pdf')
        .parent()
        .find('button, [class*="remove"]')
        .should('not.exist');
    });

    it('should ONLY show ask question button', () => {
      cy.contains('Permission Test Task').click();
      
      // Question button should be the only action
      cy.contains('button', /ask.*question|question|help/i).should('be.visible');
      
      // Count action buttons - should only be question and status related
      cy.get('[class*="actions"] button, [data-testid*="action"]')
        .each($btn => {
          const text = $btn.text().toLowerCase();
          expect(text).to.match(/question|help|status|complete|done|started/i);
        });
    });

    it('should allow changing own task status', () => {
      cy.contains('Permission Test Task').click();
      
      // Status dropdown/button should be available
      cy.get('select[name*="status"], [data-testid="status-selector"]')
        .should('be.visible');
    });

    it('should NOT allow accessing task manager route', () => {
      cy.visit('/tasks/manage');
      
      // Should redirect
      cy.url().should('not.include', '/manage');
      cy.contains(/unauthorized|access denied|students/i).should('be.visible');
    });

    it('should NOT allow accessing class settings', () => {
      cy.visit('/settings');
      
      cy.url().should('not.include', '/settings');
    });

    it('should NOT show inventory/browse as student', () => {
      cy.contains('Browse').should('not.exist');
      cy.contains('Inventory').should('not.exist');
    });
  });

  describe('Teacher Permissions', () => {
    beforeEach(() => {
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.visit('/');
    });

    it('should show create task button', () => {
      cy.contains('Tasks').click();
      cy.contains('button', /create/i).should('be.visible');
    });

    it('should show edit button on tasks', () => {
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Permission Test Task').click();
      
      cy.contains('button', /edit/i).should('be.visible');
    });

    it('should show delete button on tasks', () => {
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Permission Test Task').click();
      
      cy.contains('button', /delete|remove/i).should('be.visible');
    });

    it('should show duplicate button', () => {
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Permission Test Task').click();
      
      cy.contains('button', /duplicate|copy|clone/i).should('be.visible');
    });

    it('should allow editing all task fields', () => {
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Permission Test Task').click();
      
      // Title editable
      cy.get('input[type="text"]').first().should('be.visible');
      
      // Description editable
      cy.get('textarea').should('be.visible');
      
      // Date editable
      cy.get('input[type="date"]').should('be.visible');
      
      // Type selectable
      cy.get('select').should('be.visible');
    });

    it('should allow uploading attachments', () => {
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Permission Test Task').click();
      
      cy.get('input[type="file"], [data-testid="file-upload-input"]').should('exist');
    });

    it('should allow removing attachments', () => {
      // First add an attachment
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Permission Test Task').click();
      
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('test'),
        fileName: 'removable.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      cy.waitForFirebase(3000);
      
      // Should have remove button
      cy.contains('removable.pdf')
        .parent()
        .find('button, [class*="remove"]')
        .should('be.visible');
    });

    it('should show question history from all students', () => {
      // Student asks question first
      cy.loginAsStudent(studentName);
      cy.contains('Permission Test Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Teacher should see this');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Teacher view
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Permission Test Task').click();
      
      cy.contains('Teacher should see this').should('be.visible');
      cy.contains(studentName).should('be.visible');
    });

    it('should access class settings', () => {
      cy.contains('Settings').click();
      
      cy.url().should('include', '/settings');
      cy.contains(/class.*settings|settings/i).should('be.visible');
    });

    it('should access inventory/browse', () => {
      cy.contains('Tasks').click();
      cy.contains('Browse').should('be.visible').click();
      
      cy.url().should('include', '/browse');
    });
  });

  describe('API Security', () => {
    it('should reject student task creation at API level', () => {
      cy.loginAsStudent(studentName);
      
      // Try to create task directly via Firestore
      cy.window().then(win => {
        return cy.wrap(
          win.eval(`
            import { getFirestore, collection, addDoc } from 'firebase/firestore';
            const db = getFirestore();
            return addDoc(collection(db, 'tasks'), {
              title: 'Hacked Task',
              classroomId: 'test-class'
            }).catch(e => e.message);
          `)
        ).then(result => {
          expect(result).to.include('permission');
        });
      });
    });

    it('should reject student task deletion at API level', () => {
      cy.loginAsStudent(studentName);
      
      cy.window().then(win => {
        return cy.wrap(
          win.eval(`
            import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
            const db = getFirestore();
            return deleteDoc(doc(db, 'tasks', 'some-task-id'))
              .catch(e => e.message);
          `)
        ).then(result => {
          expect(result).to.include('permission');
        });
      });
    });

    it('should reject student task update at API level', () => {
      cy.loginAsStudent(studentName);
      
      cy.window().then(win => {
        return cy.wrap(
          win.eval(`
            import { getFirestore, doc, updateDoc } from 'firebase/firestore';
            const db = getFirestore();
            return updateDoc(doc(db, 'tasks', 'some-task-id'), {
              title: 'Hacked Title'
            }).catch(e => e.message);
          `)
        ).then(result => {
          expect(result).to.include('permission');
        });
      });
    });

    it('should allow student status update at API level', () => {
      // Students should be able to update their own status
      cy.loginAsStudent(studentName);
      
      // This should succeed for student status updates
      cy.contains('Permission Test Task').click();
      cy.get('select[name*="status"], [data-testid="status-selector"]')
        .select('in-progress');
      cy.waitForFirebase();
      
      // Reload and verify
      cy.reload();
      cy.contains('Permission Test Task').click();
      cy.get('select[name*="status"], [data-testid="status-selector"]')
        .should('have.value', 'in-progress');
    });
  });

  describe('Role Switching', () => {
    it('should maintain permissions after page reload', () => {
      cy.loginAsStudent(studentName);
      
      cy.reload();
      
      // Still should not have create button
      cy.contains('button', /create.*task|new.*task/i).should('not.exist');
    });

    it('should update permissions when role changes', () => {
      // Start as student
      cy.loginAsStudent(studentName);
      cy.contains('button', /create.*task/i).should('not.exist');
      
      // Switch to teacher
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      
      // Now should have create button
      cy.contains('button', /create/i).should('be.visible');
    });

    it('should show correct UI for each role', () => {
      // Teacher UI
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.get('[class*="teacher"], [data-role="teacher"]').should('exist');
      
      // Student UI
      cy.loginAsStudent(studentName);
      cy.get('[class*="student"], [data-role="student"]').should('exist');
    });
  });

  describe('Multi-class Permissions', () => {
    it('should only allow teacher to see their own classes', () => {
      // Create a second teacher
      const teacher2Email = 'teacher2@test.com';
      
      cy.loginAsTeacher(teacher2Email, teacherPassword);
      cy.seedTestData('teacher2-class');
      
      // Should not see first teacher's classes
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('teacher2-class').should('not.exist');
    });

    it('should restrict student to joined classes only', () => {
      // Create class and don't add student
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Create').click();
      
      cy.get('input[type="text"]').first().type('Private Class Task');
      cy.contains('button', 'Private Class').click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Student not in Private Class
      cy.loginAsStudent(studentName, 'other-class-code');
      
      cy.contains('Private Class Task').should('not.exist');
    });
  });

  describe('Unauthenticated Users', () => {
    it('should redirect to login when not authenticated', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      
      cy.visit('/');
      
      cy.url().should('include', '/login');
    });

    it('should not allow API access when not authenticated', () => {
      cy.clearCookies();
      cy.clearLocalStorage();
      
      cy.window().then(win => {
        return cy.wrap(
          win.eval(`
            import { getFirestore, collection, getDocs } from 'firebase/firestore';
            const db = getFirestore();
            return getDocs(collection(db, 'tasks'))
              .catch(e => e.message);
          `)
        ).then(result => {
          expect(result).to.include('permission');
        });
      });
    });
  });
});
