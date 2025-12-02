/**
 * Student Questions E2E Tests
 * 
 * Tests that students can ask questions on tasks,
 * questions are saved to task history, and
 * questions are NOT duplicated when tasks are duplicated
 * 
 * Priority: 7
 */

describe('Student Questions', () => {
  const teacherEmail = 'teacher@test.com';
  const teacherPassword = 'testpassword123';
  const studentName = 'Question Student';
  const anotherStudent = 'Another Student';

  beforeEach(() => {
    cy.clearEmulator();
    cy.loginAsTeacher(teacherEmail, teacherPassword);
    cy.seedTestData();
    cy.visit('/');
    
    // Create a task for students to ask questions about
    cy.contains('Tasks').click();
    cy.contains('Create').click();
    
    cy.get('input[type="text"]').first().type('Question Target Task');
    cy.get('textarea[placeholder*="Instructions"]').type('Complete the worksheet on page 42');
    cy.get('button').contains(/class|period/i).first().click({ force: true });
    cy.contains('button', /save/i).click();
    cy.waitForFirebase();
  });

  describe('Ask Question Feature', () => {
    it('should show question button for students', () => {
      cy.loginAsStudent(studentName);
      
      cy.contains('Question Target Task').click();
      
      cy.contains('button', /ask.*question|question|help/i).should('be.visible');
    });

    it('should open question modal when clicking ask question', () => {
      cy.loginAsStudent(studentName);
      
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      
      // Modal should open
      cy.get('[class*="modal"], [role="dialog"]').should('be.visible');
      cy.contains(/ask.*question|submit.*question/i).should('be.visible');
    });

    it('should have textarea for question input', () => {
      cy.loginAsStudent(studentName);
      
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .should('be.visible');
    });

    it('should submit question successfully', () => {
      cy.loginAsStudent(studentName);
      
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('I do not understand problem 3. Can you explain?');
      
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Should close modal or show success
      cy.contains(/sent|submitted|success/i).should('be.visible');
    });

    it('should show error for empty question', () => {
      cy.loginAsStudent(studentName);
      
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      
      // Try to submit empty
      cy.contains('button', /submit|send|ask/i).click();
      
      cy.contains(/required|empty|enter.*question/i).should('be.visible');
    });

    it('should allow cancel without submitting', () => {
      cy.loginAsStudent(studentName);
      
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('This question will be cancelled');
      
      cy.contains('button', /cancel|close|nevermind/i).click();
      
      // Modal should close
      cy.get('[class*="modal"], [role="dialog"]').should('not.exist');
    });
  });

  describe('Question History Saved to Task', () => {
    it('should save question to task history', () => {
      cy.loginAsStudent(studentName);
      
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('What is the due date for this?');
      
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Teacher should see the question
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      
      // Question history should be visible
      cy.contains('What is the due date for this?').should('be.visible');
      cy.contains(studentName).should('be.visible');
    });

    it('should include timestamp in question history', () => {
      cy.loginAsStudent(studentName);
      
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Timestamped question');
      
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      
      // Should show when question was asked
      cy.contains(/today|just now|am|pm/i).should('be.visible');
    });

    it('should include student name in question history', () => {
      cy.loginAsStudent(studentName);
      
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Who asked this?');
      
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      
      cy.contains(studentName).should('be.visible');
    });

    it('should preserve multiple questions from different students', () => {
      // First student asks
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('First student question');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Second student asks
      cy.loginAsStudent(anotherStudent);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Second student question');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Teacher sees both
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      
      cy.contains('First student question').should('be.visible');
      cy.contains('Second student question').should('be.visible');
      cy.contains(studentName).should('be.visible');
      cy.contains(anotherStudent).should('be.visible');
    });

    it('should preserve question order (newest first or oldest first)', () => {
      cy.loginAsStudent(studentName);
      
      // Ask first question
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Question One');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Ask second question
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Question Two');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      
      // Both should be visible
      cy.contains('Question One').should('be.visible');
      cy.contains('Question Two').should('be.visible');
    });
  });

  describe('Questions NOT Duplicated on Task Duplication', () => {
    it('should NOT copy questions when duplicating task', () => {
      // Student asks a question
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Original question - should not duplicate');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Teacher duplicates the task
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      
      // Duplicate the task
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // Check the duplicated task
      cy.contains('Question Target Task (Copy)').click();
      
      // Should NOT have the question
      cy.contains('Original question - should not duplicate').should('not.exist');
    });

    it('should have empty question history on duplicated task', () => {
      // Add question to original
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Question for original');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Duplicate as teacher
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // New task should have no questions
      cy.contains('Question Target Task (Copy)').click();
      
      // Check question history section is empty
      cy.get('[class*="question-history"], [data-testid="question-history"]')
        .should('be.empty');
    });

    it('should allow new questions on duplicated task', () => {
      // First add to original
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Original task question');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Duplicate
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // Ask question on copy
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task (Copy)').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('New question for copied task');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Verify copy has only new question
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task (Copy)').click();
      
      cy.contains('New question for copied task').should('be.visible');
      cy.contains('Original task question').should('not.exist');
    });

    it('should preserve original task questions after duplication', () => {
      // Add question
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Preserved question');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Duplicate
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      cy.contains('button', /duplicate|copy|clone/i).click();
      cy.waitForFirebase();
      
      // Original should still have question
      cy.contains('Question Target Task').first().click();
      cy.contains('Preserved question').should('be.visible');
    });
  });

  describe('Question Visibility', () => {
    it('should show question history to teacher only', () => {
      // Student asks
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Private to teacher?');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Same student should not see all question history
      cy.contains('Question Target Task').click();
      
      // Student should see their own question at most
      // But not a full history section like teacher
      cy.get('[class*="all-questions"], [data-testid="all-questions"]')
        .should('not.exist');
    });

    it('should let student see their own submitted questions', () => {
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('My question to review');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Student should see confirmation or their own question
      cy.contains(/submitted|your question|my question/i).should('be.visible');
    });

    it('should show question count badge to teacher', () => {
      // Multiple students ask
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Question 1');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      cy.loginAsStudent(anotherStudent);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Question 2');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      // Teacher sees badge
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      
      cy.contains('Question Target Task')
        .parents('[class*="task"]')
        .find('[class*="badge"], [class*="question-count"]')
        .should('contain.text', '2');
    });
  });

  describe('Question Status', () => {
    it('should mark questions with pending status initially', () => {
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Pending status question');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      
      cy.contains('Pending status question')
        .parent()
        .should('contain.text', 'pending');
    });

    it('should allow teacher to mark question as answered', () => {
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Mark me as answered');
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      
      cy.contains('Mark me as answered')
        .parent()
        .find('button, [class*="status"]')
        .click();
      
      cy.contains(/answered|resolved/i).click();
      cy.waitForFirebase();
      
      // Should show as answered
      cy.contains('Mark me as answered')
        .parent()
        .should('contain.text', 'answered');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long questions', () => {
      const longQuestion = 'A'.repeat(1000);
      
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type(longQuestion);
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      
      // Should show truncated or full question
      cy.contains('AAAA').should('be.visible');
    });

    it('should handle special characters in questions', () => {
      const specialQuestion = 'What about <script>alert("xss")</script> and & symbols?';
      
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type(specialQuestion);
      cy.contains('button', /submit|send|ask/i).click();
      cy.waitForFirebase();
      
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      
      // Should be escaped/safe
      cy.contains('What about').should('be.visible');
      cy.contains('<script>').should('not.exist');
    });

    it('should handle rapid question submissions', () => {
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      
      // Rapid submissions
      for (let i = 1; i <= 3; i++) {
        cy.contains('button', /ask.*question|question|help/i).click();
        cy.get('textarea[placeholder*="question"], textarea[name="question"]')
          .type(`Rapid question ${i}`);
        cy.contains('button', /submit|send|ask/i).click();
        cy.waitForFirebase(500);
      }
      
      cy.loginAsTeacher(teacherEmail, teacherPassword);
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      cy.contains('Question Target Task').click();
      
      // All should be saved
      cy.contains('Rapid question 1').should('be.visible');
      cy.contains('Rapid question 2').should('be.visible');
      cy.contains('Rapid question 3').should('be.visible');
    });

    it('should handle offline question submission gracefully', () => {
      cy.loginAsStudent(studentName);
      cy.contains('Question Target Task').click();
      cy.contains('button', /ask.*question|question|help/i).click();
      
      // Go offline
      cy.window().then(win => {
        cy.stub(win.navigator, 'onLine').value(false);
        win.dispatchEvent(new Event('offline'));
      });
      
      cy.get('textarea[placeholder*="question"], textarea[name="question"]')
        .type('Offline question');
      cy.contains('button', /submit|send|ask/i).click();
      
      // Should show offline message or queue
      cy.contains(/offline|connection|try again/i).should('be.visible');
    });
  });
});
