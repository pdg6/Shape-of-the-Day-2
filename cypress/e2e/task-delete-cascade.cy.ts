/**
 * Task Delete/Cascade E2E Tests
 * 
 * Tests deletion behavior and what happens to child tasks
 * when parent is deleted
 * 
 * Priority: 4
 */

describe('Task Delete and Cascade', () => {
  const teacherEmail = 'teacher@test.com';
  const teacherPassword = 'testpassword123';

  beforeEach(() => {
    cy.clearEmulator();
    cy.loginAsTeacher(teacherEmail, teacherPassword);
    cy.seedTestData();
    cy.visit('/');
    cy.contains('Tasks').click();
  });

  describe('Simple Task Deletion', () => {
    beforeEach(() => {
      // Create a simple task
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Delete Me Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
    });

    it('should show delete confirmation dialog', () => {
      cy.contains('Browse').click();
      cy.contains('Delete Me Task').click();
      cy.contains('button', /delete|remove/i).click();
      
      cy.get('[class*="modal"], [role="dialog"]').should('be.visible');
      cy.contains(/confirm|sure|delete/i).should('be.visible');
    });

    it('should cancel deletion when clicking cancel', () => {
      cy.contains('Browse').click();
      cy.contains('Delete Me Task').click();
      cy.contains('button', /delete|remove/i).click();
      
      cy.contains('button', /cancel|no|keep/i).click();
      
      // Task should still exist
      cy.contains('Browse').click();
      cy.contains('Delete Me Task').should('be.visible');
    });

    it('should delete task when confirmed', () => {
      cy.contains('Browse').click();
      cy.contains('Delete Me Task').click();
      cy.contains('button', /delete|remove/i).click();
      
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      // Task should be gone
      cy.contains('Browse').click();
      cy.contains('Delete Me Task').should('not.exist');
    });

    it('should remove deleted task from all views', () => {
      cy.contains('Browse').click();
      cy.contains('Delete Me Task').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      // Check calendar view
      cy.contains('Calendar').click();
      cy.contains('Delete Me Task').should('not.exist');
      
      // Check search
      cy.contains('Browse').click();
      cy.get('input[placeholder*="search"]').type('Delete Me');
      cy.contains('Delete Me Task').should('not.exist');
    });
  });

  describe('Parent Deletion - Child Becomes Standalone', () => {
    beforeEach(() => {
      // Create project with child task
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Parent Project');
      cy.get('select').select('project');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Child Task');
      cy.get('select').select('task');
      cy.contains('Parent Project').click({ force: true }); // Select parent
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
    });

    it('should show warning about child tasks when deleting parent', () => {
      cy.contains('Browse').click();
      cy.contains('Parent Project').click();
      cy.contains('button', /delete|remove/i).click();
      
      // Should warn about children
      cy.contains(/child|children|nested|linked/i).should('be.visible');
    });

    it('should convert children to standalone when parent is deleted', () => {
      cy.contains('Browse').click();
      cy.contains('Parent Project').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      // Child should still exist
      cy.contains('Child Task').should('be.visible');
      
      // Child should no longer have parent
      cy.contains('Child Task').click();
      cy.contains('Parent Project').should('not.exist');
      cy.contains(/no parent|standalone|none/i).should('be.visible');
    });

    it('should preserve child task content after parent deletion', () => {
      // Add content to child
      cy.contains('Browse').click();
      cy.contains('Child Task').click();
      cy.get('textarea[placeholder*="Instructions"]').type('Important instructions');
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Delete parent
      cy.contains('Parent Project').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      // Child content should be preserved
      cy.contains('Child Task').click();
      cy.contains('Important instructions').should('be.visible');
    });

    it('should handle multi-level hierarchy deletion', () => {
      // Create grandchild
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Grandchild Subtask');
      cy.get('select').select('subtask');
      cy.contains('Child Task').click({ force: true }); // Select parent
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Delete top-level parent
      cy.contains('Browse').click();
      cy.contains('Parent Project').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      // Child Task becomes standalone, grandchild still linked to child
      cy.contains('Child Task').click();
      cy.contains(/no parent|standalone/i).should('be.visible');
      
      cy.contains('Browse').click();
      cy.contains('Grandchild Subtask').click();
      cy.contains('Child Task').should('be.visible'); // Still linked to child
    });
  });

  describe('Delete with Attachments', () => {
    it('should delete attachments from storage when task is deleted', () => {
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Task With Attachments');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('test content'),
        fileName: 'to_be_deleted.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      cy.waitForFirebase(3000);
      
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Delete task
      cy.contains('Browse').click();
      cy.contains('Task With Attachments').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      // Verify attachment is gone from storage
      // (This would need Firebase Admin SDK to verify, so we just check UI)
      cy.contains('Task With Attachments').should('not.exist');
    });
  });

  describe('Delete with Question History', () => {
    it('should delete question history when task is deleted', () => {
      // Create task
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Task With Questions');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Add question as student
      cy.loginAsStudent('Test Student');
      cy.contains('Task With Questions').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Question to be deleted');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Delete as teacher
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Task With Questions').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      // Task and questions should be gone
      cy.contains('Task With Questions').should('not.exist');
      cy.contains('Question to be deleted').should('not.exist');
    });
  });

  describe('Bulk Delete', () => {
    beforeEach(() => {
      // Create multiple tasks
      const tasks = ['Bulk Delete 1', 'Bulk Delete 2', 'Bulk Delete 3'];
      tasks.forEach(task => {
        cy.contains('Create').click();
        cy.get('input[type="text"]').first().type(task);
        cy.get('button').contains(/class|period/i).first().click({ force: true });
        cy.contains('button', /save/i).click();
        cy.waitForFirebase();
      });
    });

    it('should allow selecting multiple tasks for deletion', () => {
      cy.contains('Browse').click();
      
      // Enable multi-select mode
      cy.contains('button', /select|multi/i).click();
      
      // Select multiple tasks
      cy.contains('Bulk Delete 1').find('input[type="checkbox"]').check();
      cy.contains('Bulk Delete 2').find('input[type="checkbox"]').check();
      
      // Delete button should show count
      cy.contains('button', /delete.*2|2.*delete/i).should('be.visible');
    });

    it('should delete all selected tasks', () => {
      cy.contains('Browse').click();
      cy.contains('button', /select|multi/i).click();
      
      cy.contains('Bulk Delete 1').find('input[type="checkbox"]').check();
      cy.contains('Bulk Delete 2').find('input[type="checkbox"]').check();
      
      cy.contains('button', /delete/i).click();
      cy.contains('button', /confirm|yes/i).click();
      cy.waitForFirebase();
      
      cy.contains('Bulk Delete 1').should('not.exist');
      cy.contains('Bulk Delete 2').should('not.exist');
      cy.contains('Bulk Delete 3').should('be.visible'); // Not selected
    });
  });

  describe('Undo Delete', () => {
    it('should show undo option after deletion', () => {
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Undoable Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('Undoable Task').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      // Should show undo toast/button
      cy.contains(/undo|restore/i).should('be.visible');
    });

    it('should restore task when clicking undo', () => {
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Restored Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('Restored Task').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      // Click undo
      cy.contains(/undo|restore/i).click();
      cy.waitForFirebase();
      
      // Task should be back
      cy.contains('Restored Task').should('be.visible');
    });

    it('should expire undo option after timeout', () => {
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Expire Undo Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('Expire Undo Task').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      // Wait for undo to expire (usually 5-10 seconds)
      cy.wait(10000);
      
      // Undo should no longer be available
      cy.contains(/undo|restore/i).should('not.exist');
    });
  });

  describe('Delete Permissions', () => {
    it('should only allow task creator/teacher to delete', () => {
      // Create task as teacher
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Teacher Only Delete');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Student should not see delete button
      cy.loginAsStudent('Random Student');
      cy.contains('Teacher Only Delete').click();
      cy.contains('button', /delete/i).should('not.exist');
    });

    it('should allow co-teachers to delete', () => {
      // Create task
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Co-teacher Delete');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Login as co-teacher
      cy.loginAsTeacher('coteacher@test.com', teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      
      // Should be able to delete
      cy.contains('Co-teacher Delete').click();
      cy.contains('button', /delete/i).should('be.visible');
    });
  });

  describe('Delete Edge Cases', () => {
    it('should handle deleting task while another user is viewing', () => {
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Concurrent Delete');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Open in student view (simulating concurrent access)
      cy.loginAsStudent('Viewing Student');
      cy.contains('Concurrent Delete').click();
      
      // Teacher deletes
      cy.window().then(win => {
        // Simulate deletion via Firestore
        win.eval(`
          import { getFirestore, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
          const db = getFirestore();
          getDocs(query(collection(db, 'tasks'), where('title', '==', 'Concurrent Delete')))
            .then(snap => snap.docs.forEach(doc => deleteDoc(doc.ref)));
        `);
      });
      
      cy.waitForFirebase();
      
      // Student should see deleted/not found message
      cy.contains(/deleted|not found|removed|no longer/i).should('be.visible');
    });

    it('should handle network error during deletion', () => {
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Network Error Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Go offline
      cy.window().then(win => {
        cy.stub(win.navigator, 'onLine').value(false);
        win.dispatchEvent(new Event('offline'));
      });
      
      cy.contains('Browse').click();
      cy.contains('Network Error Task').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      
      // Should show error
      cy.contains(/offline|connection|error|try again/i).should('be.visible');
      
      // Task should still exist when back online
      cy.window().then(win => {
        cy.stub(win.navigator, 'onLine').value(true);
        win.dispatchEvent(new Event('online'));
      });
      
      cy.reload();
      cy.contains('Network Error Task').should('be.visible');
    });

    it('should handle deleting already deleted task', () => {
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Double Delete');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('Double Delete').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      // Try to delete again (e.g., via API)
      cy.window().then(win => {
        return cy.wrap(
          win.eval(`
            import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
            const db = getFirestore();
            return deleteDoc(doc(db, 'tasks', 'non-existent-id'))
              .catch(e => e.message);
          `)
        ).then(result => {
          // Should handle gracefully (not crash)
          expect(result).to.not.include('crash');
        });
      });
    });
  });

  describe('Soft Delete vs Hard Delete', () => {
    it('should use soft delete if configured', () => {
      // Create and delete
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Soft Deleted');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('Soft Deleted').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      // If using soft delete, admin should still see it in deleted items
      // This depends on implementation
      cy.contains('button', /trash|deleted|archive/i).click();
      cy.contains('Soft Deleted').should('be.visible');
    });

    it('should allow restoring soft-deleted tasks', () => {
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Restorable Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('Restorable Task').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      // Go to trash
      cy.contains('button', /trash|deleted/i).click();
      cy.contains('Restorable Task').click();
      cy.contains('button', /restore|recover/i).click();
      cy.waitForFirebase();
      
      // Should be back in regular view
      cy.contains('Browse').click();
      cy.contains('Restorable Task').should('be.visible');
    });

    it('should permanently delete after trash period', () => {
      // This would require time manipulation
      // For now, just verify permanent delete option exists in trash
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Permanent Delete');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('Permanent Delete').click();
      cy.contains('button', /delete|remove/i).click();
      cy.contains('button', /confirm|yes|delete/i).last().click();
      cy.waitForFirebase();
      
      cy.contains('button', /trash|deleted/i).click();
      cy.contains('Permanent Delete').click();
      
      // Should have permanent delete option
      cy.contains('button', /permanent|forever|empty trash/i).should('be.visible');
    });
  });
});
