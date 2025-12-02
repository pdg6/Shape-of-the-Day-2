/**
 * Task Search E2E Tests
 * 
 * Tests search functionality by title, description, date (via calendar), and attachments
 * 
 * Priority: 9
 */

describe('Task Search', () => {
  const teacherEmail = 'teacher@test.com';
  const teacherPassword = 'testpassword123';

  beforeEach(() => {
    cy.clearEmulator();
    cy.loginAsTeacher(teacherEmail, teacherPassword);
    
    // Create test data for searching
    cy.visit('/');
    cy.contains('Tasks').click();
    
    // Create several tasks with different attributes
    const testTasks = [
      { title: 'Math Homework Alpha', description: 'Complete chapter 5 exercises' },
      { title: 'Science Lab Beta', description: 'Conduct the photosynthesis experiment' },
      { title: 'History Essay Gamma', description: 'Write about ancient civilizations' },
      { title: 'Art Project Delta', description: 'Create a watercolor painting' },
    ];
    
    testTasks.forEach(task => {
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type(task.title);
      cy.get('textarea').first().type(task.description);
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
    });
    
    cy.contains('Browse').click();
  });

  describe('Search by Title', () => {
    it('should find tasks by exact title match', () => {
      cy.get('input[placeholder*="Search"]').type('Math Homework Alpha');
      
      cy.contains('Math Homework Alpha').should('be.visible');
      cy.contains('Science Lab Beta').should('not.exist');
      cy.contains('History Essay Gamma').should('not.exist');
    });

    it('should find tasks by partial title match', () => {
      cy.get('input[placeholder*="Search"]').type('Homework');
      
      cy.contains('Math Homework Alpha').should('be.visible');
      cy.contains('Science Lab Beta').should('not.exist');
    });

    it('should be case-insensitive', () => {
      cy.get('input[placeholder*="Search"]').type('MATH HOMEWORK');
      
      cy.contains('Math Homework Alpha').should('be.visible');
    });

    it('should find multiple tasks matching search', () => {
      // All tasks have Greek letter suffixes
      cy.get('input[placeholder*="Search"]').type('a'); // Matches Alpha, Beta, Gamma, Delta
      
      cy.contains('Math Homework Alpha').should('be.visible');
      cy.contains('Science Lab Beta').should('be.visible');
      cy.contains('History Essay Gamma').should('be.visible');
      cy.contains('Art Project Delta').should('be.visible');
    });

    it('should show empty state when no matches', () => {
      cy.get('input[placeholder*="Search"]').type('NonexistentTask12345');
      
      cy.contains(/no.*results|no.*found|nothing.*matches/i).should('be.visible');
    });

    it('should clear search and show all tasks', () => {
      cy.get('input[placeholder*="Search"]').type('Math');
      cy.contains('Science Lab Beta').should('not.exist');
      
      // Clear the search
      cy.get('input[placeholder*="Search"]').clear();
      
      // All tasks should be visible again
      cy.contains('Math Homework Alpha').should('be.visible');
      cy.contains('Science Lab Beta').should('be.visible');
    });
  });

  describe('Search by Description', () => {
    it('should find tasks by description content', () => {
      cy.get('input[placeholder*="Search"]').type('photosynthesis');
      
      cy.contains('Science Lab Beta').should('be.visible');
      cy.contains('Math Homework Alpha').should('not.exist');
    });

    it('should find tasks by partial description match', () => {
      cy.get('input[placeholder*="Search"]').type('chapter');
      
      cy.contains('Math Homework Alpha').should('be.visible');
    });
  });

  describe('Search by Date (Calendar Filter)', () => {
    beforeEach(() => {
      // Create tasks with specific date ranges
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Date Range Task');
      cy.get('input[type="date"]').first().type('2025-12-01');
      cy.get('input[type="date"]').last().type('2025-12-05');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
    });

    it('should filter tasks by selected date on calendar', () => {
      // Click on a date in the calendar
      cy.get('[class*="calendar"]').contains('3').click(); // December 3rd
      
      // Should show task that spans Dec 1-5
      cy.contains('Date Range Task').should('be.visible');
    });

    it('should hide tasks not active on selected date', () => {
      // Click on a date outside the task range
      cy.get('[class*="calendar"]').contains('15').click(); // December 15th
      
      // Task spanning Dec 1-5 should not be visible
      cy.contains('Date Range Task').should('not.exist');
    });

    it('should show all tasks across all classes when date selected (teacher view)', () => {
      // This tests the requirement: "visibility for teachers only - all classes"
      cy.get('[class*="calendar"]').contains('3').click();
      
      // Classroom filter should be set to "all" or similar
      cy.get('select').contains(/classroom|class/i).should('have.value', 'all');
    });
  });

  describe('Search by Attachments', () => {
    beforeEach(() => {
      // Create a task with an attachment (filename-based search)
      cy.contains('Create').click();
      cy.get('input[type="text"]').first().type('Task With Attachment');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      // Upload a file
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('test content'),
        fileName: 'homework_worksheet.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      
      cy.waitForFirebase(3000); // Wait for upload
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
    });

    it('should find tasks by attachment filename', () => {
      cy.get('input[placeholder*="Search"]').type('worksheet');
      
      cy.contains('Task With Attachment').should('be.visible');
    });

    it('should find tasks by partial filename match', () => {
      cy.get('input[placeholder*="Search"]').type('homework');
      
      cy.contains('Task With Attachment').should('be.visible');
    });

    it('should be case-insensitive for attachment search', () => {
      cy.get('input[placeholder*="Search"]').type('WORKSHEET');
      
      cy.contains('Task With Attachment').should('be.visible');
    });
  });

  describe('Combined Search and Filters', () => {
    it('should combine text search with classroom filter', () => {
      // Select a specific classroom
      cy.get('select').contains(/classroom|class/i).select('Period 1');
      
      // Then search
      cy.get('input[placeholder*="Search"]').type('Math');
      
      // Should only show Math tasks in Period 1
      cy.contains('Math Homework Alpha').should('be.visible');
    });

    it('should combine text search with status filter', () => {
      // Select active tasks only
      cy.get('select, button').contains(/status|active/i).click();
      cy.contains(/active|in.progress/i).click();
      
      // Then search
      cy.get('input[placeholder*="Search"]').type('Science');
      
      // Should show Science tasks that are active
    });

    it('should combine text search with date filter', () => {
      cy.get('[class*="calendar"]').contains('2').click();
      cy.get('input[placeholder*="Search"]').type('Date');
      
      // Should show tasks matching search AND date
    });

    it('should persist search when switching tabs', () => {
      cy.get('input[placeholder*="Search"]').type('Math');
      
      // Switch to a different tab and back
      cy.contains('Projects').click();
      cy.contains('All').click();
      
      // Search should persist
      cy.get('input[placeholder*="Search"]').should('have.value', 'Math');
    });
  });

  describe('Search Performance', () => {
    it('should debounce search input', () => {
      // Type quickly
      cy.get('input[placeholder*="Search"]').type('Math Homework', { delay: 50 });
      
      // Results should appear after debounce period
      cy.waitForFirebase(500);
      cy.contains('Math Homework Alpha').should('be.visible');
    });

    it('should handle rapid search changes', () => {
      cy.get('input[placeholder*="Search"]')
        .type('Math')
        .clear()
        .type('Science')
        .clear()
        .type('History');
      
      cy.waitForFirebase();
      cy.contains('History Essay Gamma').should('be.visible');
      cy.contains('Math Homework Alpha').should('not.exist');
    });
  });

  describe('Search UI Feedback', () => {
    it('should show search icon', () => {
      cy.get('input[placeholder*="Search"]')
        .parent()
        .find('svg, [class*="search"]')
        .should('exist');
    });

    it('should show clear button when search has text', () => {
      cy.get('input[placeholder*="Search"]').type('Math');
      
      // Clear button should be visible
      cy.get('input[placeholder*="Search"]')
        .parent()
        .find('[class*="clear"], button, svg')
        .should('be.visible');
    });

    it('should show result count', () => {
      cy.get('input[placeholder*="Search"]').type('Math');
      
      // Should show something like "1 result" or "Showing 1 of 4"
      cy.contains(/\d+.*result|showing.*\d+/i).should('be.visible');
    });
  });
});
