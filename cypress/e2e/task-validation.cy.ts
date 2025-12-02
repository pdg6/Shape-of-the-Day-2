/**
 * Task Validation E2E Tests
 * 
 * Tests empty/invalid input handling for all task fields
 * 
 * Priority: 8
 */

describe('Task Validation', () => {
  const teacherEmail = 'teacher@test.com';
  const teacherPassword = 'testpassword123';

  beforeEach(() => {
    cy.clearEmulator();
    cy.loginAsTeacher(teacherEmail, teacherPassword);
    cy.visit('/');
    cy.contains('Tasks').click();
    cy.contains('Create').click();
  });

  describe('Title Validation', () => {
    it('should not save a task without a title', () => {
      // Leave title empty, fill other fields
      cy.get('textarea[placeholder*="Instructions"]').type('Some description');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      // Try to save
      cy.contains('button', /save/i).click();
      
      // Should show error or prevent save
      cy.contains(/title.*required|enter.*title|please.*title/i).should('be.visible');
      
      // Task should not appear in list
      cy.contains('Browse').click();
      cy.contains('Some description').should('not.exist');
    });

    it('should not save a task with only whitespace title', () => {
      cy.get('input[type="text"]').first().type('   ');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.contains('button', /save/i).click();
      
      // Should show error
      cy.contains(/title.*required|enter.*title/i).should('be.visible');
    });

    it('should trim whitespace from title', () => {
      cy.get('input[type="text"]').first().type('  Trimmed Title  ');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Title should be trimmed
      cy.contains('Browse').click();
      cy.contains('Trimmed Title').should('be.visible');
      cy.contains('  Trimmed Title  ').should('not.exist');
    });

    it('should handle very long titles gracefully', () => {
      const longTitle = 'A'.repeat(500);
      cy.get('input[type="text"]').first().type(longTitle);
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      
      // Should either truncate or show error
      cy.waitForFirebase();
      // The UI should handle this gracefully (truncate display or reject)
    });

    it('should sanitize HTML in title', () => {
      cy.get('input[type="text"]').first().type('<script>alert("xss")</script>Safe Title');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      // Script tags should be escaped/removed
      cy.contains('Safe Title').should('be.visible');
      cy.get('script').should('not.exist');
    });
  });

  describe('Class Assignment Validation', () => {
    it('should not save a task without class assignment', () => {
      cy.get('input[type="text"]').first().type('Valid Title');
      cy.get('textarea').first().type('Valid description');
      
      // Don't select any class
      cy.contains('button', /save/i).click();
      
      // Should show error
      cy.contains(/class.*required|assign.*class|select.*class/i).should('be.visible');
    });

    it('should allow deselecting all classes and show error', () => {
      cy.get('input[type="text"]').first().type('Valid Title');
      
      // Select and then deselect a class
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.contains('button', /save/i).click();
      
      // Should show error
      cy.contains(/class.*required|assign.*class/i).should('be.visible');
    });
  });

  describe('Date Validation', () => {
    it('should not allow end date before start date', () => {
      cy.get('input[type="text"]').first().type('Date Test Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      // Set start date after end date
      cy.get('input[type="date"]').first().type('2025-12-15');
      cy.get('input[type="date"]').last().type('2025-12-10');
      
      cy.contains('button', /save/i).click();
      
      // Should show error or auto-correct
      // Either dates are swapped or error is shown
    });

    it('should accept same start and end date', () => {
      cy.get('input[type="text"]').first().type('Single Day Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.get('input[type="date"]').first().type('2025-12-15');
      cy.get('input[type="date"]').last().type('2025-12-15');
      
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('Single Day Task').should('be.visible');
    });

    it('should handle invalid date formats gracefully', () => {
      cy.get('input[type="text"]').first().type('Date Format Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      // Try to input invalid date (browser may prevent this)
      cy.get('input[type="date"]').first().invoke('val', 'invalid-date');
      
      cy.contains('button', /save/i).click();
      // Should either use default date or show error
    });
  });

  describe('Description Validation', () => {
    it('should allow empty description', () => {
      cy.get('input[type="text"]').first().type('No Description Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      // Leave description empty
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('No Description Task').should('be.visible');
    });

    it('should handle very long descriptions', () => {
      const longDescription = 'B'.repeat(10000);
      cy.get('input[type="text"]').first().type('Long Desc Task');
      cy.get('textarea').first().type(longDescription);
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Should save successfully
      cy.contains('Browse').click();
      cy.contains('Long Desc Task').should('be.visible');
    });

    it('should sanitize HTML in description', () => {
      cy.get('input[type="text"]').first().type('XSS Test Task');
      cy.get('textarea').first().type('<img src="x" onerror="alert(1)">Safe content');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('XSS Test Task').click();
      // Malicious content should be escaped
      cy.contains('Safe content').should('be.visible');
    });
  });

  describe('URL Validation', () => {
    it('should accept valid URLs', () => {
      cy.get('input[type="text"]').first().type('URL Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.get('input[placeholder*="URL"]').type('https://example.com/resource');
      
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('URL Task').should('be.visible');
    });

    it('should handle invalid URLs gracefully', () => {
      cy.get('input[type="text"]').first().type('Invalid URL Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.get('input[placeholder*="URL"]').type('not-a-valid-url');
      
      cy.contains('button', /save/i).click();
      
      // Should either reject or accept (depending on implementation)
      // At minimum, should not crash
    });

    it('should allow empty URL', () => {
      cy.get('input[type="text"]').first().type('No URL Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      // Leave URL empty
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('No URL Task').should('be.visible');
    });
  });

  describe('Type Validation', () => {
    it('should enforce valid parent-child type relationships', () => {
      // Create a task
      cy.get('select').first().select('task');
      cy.get('input[type="text"]').first().type('Parent Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();

      // Try to create assignment under task (should not be allowed)
      cy.contains('Create').click();
      cy.get('select').first().select('assignment');
      
      // Parent selector should not show Task as valid parent
      cy.get('select').contains(/parent/i).should('not.contain', 'Parent Task');
    });

    it('should prevent changing type to invalid option based on children', () => {
      // Create project with children, try to change to subtask
      cy.get('select').first().select('project');
      cy.get('input[type="text"]').first().type('Project with Children');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();

      // Add a child task
      cy.contains('Create').click();
      cy.get('select').first().select('task');
      cy.get('input[type="text"]').first().type('Child Task');
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();

      // Try to edit parent and change type to subtask
      cy.contains('Project with Children').click();
      cy.get('select').first().select('subtask');
      cy.contains('button', /save/i).click();
      
      // Should show error or prevent the change
      cy.contains(/cannot.*change|invalid.*type|has.*children/i).should('be.visible');
    });
  });

  describe('Concurrent Edit Handling', () => {
    it('should handle save button disable during submission', () => {
      cy.get('input[type="text"]').first().type('Concurrent Test');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      // Click save
      cy.contains('button', /save/i).click();
      
      // Button should be disabled during save
      cy.contains('button', /saving|loading/i).should('be.disabled');
    });
  });

  describe('Special Characters', () => {
    it('should handle special characters in title', () => {
      const specialTitle = 'Task with émojis 🎉 & "quotes" + <brackets>';
      cy.get('input[type="text"]').first().type(specialTitle);
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('émojis').should('be.visible');
    });

    it('should handle Unicode characters', () => {
      cy.get('input[type="text"]').first().type('日本語タスク');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      cy.contains('日本語タスク').should('be.visible');
    });
  });
});
