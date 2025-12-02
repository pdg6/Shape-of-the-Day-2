/**
 * Task Duplication E2E Tests
 * 
 * Tests that task duplication works correctly and
 * specifically that question history is NOT copied
 * 
 * Priority: 5
 */

describe('Task Duplication', () => {
  const teacherEmail = 'teacher@test.com';
  const teacherPassword = 'testpassword123';

  beforeEach(() => {
    cy.clearEmulator();
    cy.loginAsTeacher(teacherEmail, teacherPassword);
    cy.seedTestData();
    cy.visit('/');
    cy.contains('Tasks').click();
    
    // Create a base task
    cy.contains('Create').click();
    cy.get('input[type="text"]').first().type('Original Task');
    cy.get('textarea[placeholder*="Instructions"]').type('Original description content');
    cy.get('button').contains(/class|period/i).first().click({ force: true });
    cy.contains('button', /save/i).click();
    cy.waitForFirebase();
  });

  describe('Basic Duplication', () => {
    it('should show duplicate button for tasks', () => {
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      
      cy.contains('button', /duplicate|copy|clone/i).should('be.visible');
    });

    it('should create a copy with "(Copy)" suffix', () => {
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      cy.contains('Original Task (Copy)').should('be.visible');
    });

    it('should preserve task title in duplicate', () => {
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      cy.contains('Original Task (Copy)').click();
      cy.get('input[type="text"]').first().should('have.value', 'Original Task (Copy)');
    });

    it('should preserve task description in duplicate', () => {
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      cy.contains('Original Task (Copy)').click();
      cy.contains('Original description content').should('be.visible');
    });

    it('should preserve task type in duplicate', () => {
      // Create project type
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Project to Copy');
      cy.get('select').select('project');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('Project to Copy').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      cy.contains('Project to Copy (Copy)').click();
      cy.get('select').should('have.value', 'project');
    });

    it('should create duplicate with new ID', () => {
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      
      // Get original ID
      cy.url().then(url1 => {
        cy.contains('button', /duplicate|copy|clone/i).click();
        cy.waitForFirebase();
        
        cy.contains('Original Task (Copy)').click();
        
        cy.url().then(url2 => {
          expect(url1).to.not.equal(url2);
        });
      });
    });
  });

  describe('Duplicate Without Question History', () => {
    it('should NOT copy question history when duplicating', () => {
      // Add question to original
      cy.loginAsStudent('Question Student');
      cy.contains('Original Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('This should NOT be in the copy');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Duplicate as teacher
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // Check the duplicate
      cy.contains('Original Task (Copy)').click();
      
      // Question should NOT exist
      cy.contains('This should NOT be in the copy').should('not.exist');
    });

    it('should have empty questionHistory array in duplicate', () => {
      // Add multiple questions
      const students = ['Student A', 'Student B'];
      students.forEach((student, i) => {
        cy.loginAsStudent(student);
        cy.contains('Original Task').click();
        cy.contains('button', /ask.*question|question|help/i).click();
        cy.get('textarea[placeholder*="question"], textarea[name="question"]')
          .type(`Question ${i + 1} from ${student}`);
        cy.contains('button', /submit|send|ask/i).click();
        cy.waitForFirebase();
      });
      
      // Duplicate
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // Verify no questions in duplicate
      cy.contains('Original Task (Copy)').click();
      cy.get('[class*="question"], [data-testid*="question"]').should('not.exist');
    });

    it('should preserve original question history after duplication', () => {
      // Add question
      cy.loginAsStudent('Preserve Student');
      cy.contains('Original Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Original question stays');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Duplicate
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // Original should still have question
      cy.contains('Original Task').first().click();
      cy.contains('Original question stays').should('be.visible');
    });

    it('should allow adding new questions to duplicated task', () => {
      // Duplicate first
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // Add question to copy
      cy.loginAsStudent('New Question Student');
      cy.contains('Original Task (Copy)').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('New question on copy');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Verify it was added to copy only
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      
      cy.contains('Original Task (Copy)').click();
      cy.contains('New question on copy').should('be.visible');
      
      cy.contains('Browse').click();
      cy.contains('Original Task').first().click();
      cy.contains('New question on copy').should('not.exist');
    });
  });

  describe('Duplicate With Attachments', () => {
    beforeEach(() => {
      // Add attachment to original
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('attachment content'),
        fileName: 'original_attachment.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      cy.waitForFirebase(3000);
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
    });

    it('should copy attachments when duplicating', () => {
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      cy.contains('Original Task (Copy)').click();
      cy.contains('original_attachment.pdf').should('be.visible');
    });

    it('should create independent attachment copies', () => {
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // Remove attachment from copy
      cy.contains('Original Task (Copy)').click();
      cy.contains('original_attachment.pdf')
        .parent()
        .find('button, [class*="remove"]')
        .click();
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Original should still have attachment
      cy.contains('Browse').click();
      cy.contains('Original Task').first().click();
      cy.contains('original_attachment.pdf').should('be.visible');
    });
  });

  describe('Duplicate Hierarchy', () => {
    it('should NOT copy parent relationship', () => {
      // Create parent
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Parent Project');
      cy.get('select').select('project');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Create child
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Child Task');
      cy.get('select').select('task');
      cy.contains('Parent Project').click({ force: true }); // Select parent
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Duplicate child
      cy.contains('Browse').click();
      cy.contains('Child Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // Duplicate should be standalone
      cy.contains('Child Task (Copy)').click();
      cy.contains(/no parent|standalone|none/i).should('be.visible');
    });

    it('should allow setting new parent for duplicate', () => {
      // Create structure
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Project A');
      cy.get('select').select('project');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Project B');
      cy.get('select').select('project');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Duplicate original and assign to Project B
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      cy.contains('Original Task (Copy)').click();
      cy.contains('button', /set parent|assign parent/i).click();
      cy.contains('Project B').click();
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Verify parent is Project B
      cy.contains('Original Task (Copy)').click();
      cy.contains('Project B').should('be.visible');
    });
  });

  describe('Duplicate to Different Class', () => {
    it('should allow duplicating to different class', () => {
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      
      // Should show class selector
      cy.get('[data-testid="duplicate-modal"], [class*="modal"]')
        .find('select, [class*="class-selector"]')
        .should('be.visible');
    });

    it('should duplicate to selected class', () => {
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      
      // Select different class
      cy.get('[data-testid="duplicate-modal"], [class*="modal"]')
        .find('select')
        .select('Period 2');
      
      cy.contains('button', /confirm|duplicate|ok/i).click();
      cy.waitForFirebase();
      
      // Filter by Period 2 to find duplicate
      cy.get('select[name*="class"]').select('Period 2');
      cy.contains('Original Task (Copy)').should('be.visible');
    });
  });

  describe('Duplicate Due Date', () => {
    it('should preserve due date in duplicate', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split('T')[0];
      
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.get('input[type="date"]').clear().type(dateStr);
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      cy.contains('Original Task (Copy)').click();
      cy.get('input[type="date"]').should('have.value', dateStr);
    });

    it('should allow changing due date on duplicate', () => {
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      const newDate = new Date();
      newDate.setDate(newDate.getDate() + 14);
      const dateStr = newDate.toISOString().split('T')[0];
      
      cy.contains('Original Task (Copy)').click();
      cy.get('input[type="date"]').clear().type(dateStr);
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Original Task (Copy)').click();
      cy.get('input[type="date"]').should('have.value', dateStr);
    });
  });

  describe('Multiple Duplications', () => {
    it('should handle duplicating a duplicate', () => {
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // Duplicate the duplicate
      cy.contains('Original Task (Copy)').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      cy.contains('Original Task (Copy) (Copy)').should('be.visible');
    });

    it('should keep all duplicates independent', () => {
      // Create multiple duplicates
      for (let i = 0; i < 3; i++) {
        cy.contains('Browse').click();
        cy.contains('Original Task').first().click();
        cy.contains('button', /duplicate|copy|clone/i).click();
        cy.waitForFirebase();
      }
      
      // Modify one duplicate
      cy.contains('Browse').click();
      cy.contains(/Original Task.*Copy/).first().click();
      cy.get('input[type="text"]').first().clear().type('Modified Copy');
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Others should be unchanged
      cy.contains('Browse').click();
      cy.get('[class*="task"]').contains('Original Task (Copy)').should('exist');
    });
  });

  describe('Duplicate Status', () => {
    it('should reset status to pending on duplicate', () => {
      // Set original to completed
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      cy.get('select[name*="status"]').select('completed');
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Duplicate
      cy.contains('Original Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // Should be pending
      cy.contains('Original Task (Copy)').click();
      cy.get('select[name*="status"]').should('have.value', 'pending');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long task names', () => {
      const longName = 'A'.repeat(200);
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type(longName);
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains(longName.substring(0, 50)).click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // Should truncate or handle gracefully
      cy.contains(`${longName.substring(0, 50)}`).should('exist');
    });

    it('should handle special characters in task name', () => {
      const specialName = 'Task <script> & "quotes"';
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type(specialName);
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // Should escape properly
      cy.contains('(Copy)').should('be.visible');
    });

    it('should handle network error during duplication', () => {
      cy.contains('Browse').click();
      cy.contains('Original Task').click();
      
      // Go offline
      cy.window().then(win => {
        cy.stub(win.navigator, 'onLine').value(false);
        win.dispatchEvent(new Event('offline'));
      });
      
      cy.contains('button', /duplicate|copy|clone/i).click();
      
      // Should show error
      cy.contains(/offline|connection|error/i).should('be.visible');
    });
  });
});
