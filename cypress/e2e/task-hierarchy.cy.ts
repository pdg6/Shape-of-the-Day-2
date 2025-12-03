/**
 * Task Hierarchy E2E Tests
 * 
 * Tests the creation and management of hierarchical tasks:
 * Project → Task → Subtask (projects contain tasks directly)
 * Assignment → Task → Subtask (assignments are standalone, not under projects)
 * 
 * Priority: 1 (Highest)
 */

describe('Task Hierarchy', () => {
  const teacherEmail = 'teacher@test.com';
  const teacherPassword = 'testpassword123';

  beforeEach(() => {
    cy.clearEmulator();
    cy.loginAsTeacher(teacherEmail, teacherPassword);
  });

  describe('Parent-Child Relationships', () => {
    it('should create a Project as a top-level item', () => {
      // Navigate to task creation
      cy.visit('/');
      cy.contains('Tasks').click();
      cy.contains('Create').click();

      // Select Project type
      cy.get('select').first().select('project');
      
      // Fill in project details
      cy.get('input[placeholder*="Math Unit"]').type('Math Unit 5: Fractions');
      cy.get('textarea[placeholder*="Instructions"]').type('This project covers fraction fundamentals');
      
      // Select a class (if available)
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      // Save the project
      cy.contains('button', /save/i).click();
      
      // Verify project appears in the list
      cy.waitForFirebase();
      cy.contains('Math Unit 5: Fractions').should('be.visible');
      cy.contains('Project').should('be.visible');
    });

    it('should create an Assignment as a standalone item', () => {
      // Assignments are now standalone (not nested under projects)
      cy.visit('/');
      cy.contains('Tasks').click();
      cy.contains('Create').click();
      
      cy.get('select').first().select('assignment');
      cy.get('input[type="text"]').first().type('Lab Report Assignment');
      cy.get('textarea').first().type('Write a lab report on the experiment');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      
      cy.waitForFirebase();
      cy.contains('Lab Report Assignment').should('be.visible');
      cy.contains('Assignment').should('be.visible');
    });

    it('should create a Task under an Assignment', () => {
      // Create standalone assignment -> task hierarchy
      cy.visit('/');
      cy.contains('Tasks').click();
      
      // Create Assignment (standalone)
      cy.contains('Create').click();
      cy.get('select').first().select('assignment');
      cy.get('input[type="text"]').first().type('Research Paper');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();

      // Create Task under Assignment
      cy.contains('Create').click();
      cy.get('select').first().select('task');
      cy.get('input[type="text"]').first().type('Find 3 Primary Sources');
      cy.get('textarea').first().type('Locate at least 3 primary sources for your paper');
      cy.contains('button', /save/i).click();
      
      cy.waitForFirebase();
      cy.contains('Find 3 Primary Sources').should('be.visible');
      cy.contains('Task').should('be.visible');
    });

    it('should create a Subtask under a Task', () => {
      cy.visit('/');
      cy.contains('Tasks').click();
      
      // Create standalone task first
      cy.contains('Create').click();
      cy.get('select').first().select('task');
      cy.get('input[type="text"]').first().type('Main Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();

      // Create subtask under it
      cy.contains('Create').click();
      cy.get('select').first().select('subtask');
      cy.get('input[type="text"]').first().type('Step 1: Preparation');
      cy.get('textarea').first().type('Prepare materials for the main task');
      cy.contains('button', /save/i).click();
      
      cy.waitForFirebase();
      cy.contains('Step 1: Preparation').should('be.visible');
      cy.contains('Subtask').should('be.visible');
    });

    it('should enforce hierarchy rules - subtask cannot have children', () => {
      cy.visit('/');
      cy.contains('Tasks').click();
      cy.contains('Create').click();
      
      // When subtask is selected, there should be no option to add children
      cy.get('select').first().select('subtask');
      
      // The "Add Child" button should not be visible or should be disabled
      cy.get('button').contains(/add child/i).should('not.exist');
    });

    it('should enforce hierarchy rules - project cannot have a parent', () => {
      cy.visit('/');
      cy.contains('Tasks').click();
      cy.contains('Create').click();
      
      cy.get('select').first().select('project');
      
      // Parent selector should not be visible or should show "None"
      cy.get('select').contains(/parent/i).should('have.value', '');
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('should display breadcrumb path for nested items', () => {
      // This test assumes we have a hierarchy already created
      cy.visit('/');
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      
      // Look for breadcrumb display showing path
      // e.g., "Project → Assignment → Task"
      cy.get('[class*="breadcrumb"], [class*="path"]').should('exist');
    });

    it('should update path when parent changes', () => {
      // Create two projects and move a task between them
      cy.visit('/');
      cy.contains('Tasks').click();
      
      // Create Project A
      cy.contains('Create').click();
      cy.get('select').first().select('project');
      cy.get('input[type="text"]').first().type('Project A');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();

      // Create Project B
      cy.contains('Create').click();
      cy.get('select').first().select('project');
      cy.get('input[type="text"]').first().type('Project B');
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();

      // Create Task under Project A
      cy.contains('Create').click();
      cy.get('select').first().select('task');
      cy.get('input[type="text"]').first().type('Movable Task');
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();

      // Edit the task and change parent to Project B
      cy.contains('Movable Task').click();
      cy.get('select').contains(/parent/i).select('Project B');
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();

      // Verify the path updated
      cy.contains('Movable Task').parents('[class*="task"]')
        .should('contain', 'Project B');
    });
  });

  describe('Tree View Display', () => {
    it('should expand/collapse parent nodes', () => {
      cy.visit('/');
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      
      // Find an expandable node (project with children)
      cy.get('[aria-label="Expand"], [class*="chevron"]').first().click();
      
      // Verify children are visible
      cy.get('[class*="child"], [class*="nested"]').should('be.visible');
      
      // Collapse
      cy.get('[aria-label="Collapse"], [class*="chevron"]').first().click();
      
      // Verify children are hidden
      cy.get('[class*="child"], [class*="nested"]').should('not.be.visible');
    });

    it('should show correct icons for each type', () => {
      cy.visit('/');
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      
      // Projects should have folder icon
      cy.contains('Project').parents('[class*="task"]')
        .find('[class*="folder"], svg').should('exist');
      
      // Assignments should have file icon
      cy.contains('Assignment').parents('[class*="task"]')
        .find('[class*="file"], svg').should('exist');
      
      // Tasks should have checkbox icon
      cy.contains('Task').parents('[class*="task"]')
        .find('[class*="check"], svg').should('exist');
    });
  });

  describe('Multi-Class Assignment', () => {
    it('should assign a project to multiple classes', () => {
      cy.visit('/');
      cy.contains('Tasks').click();
      cy.contains('Create').click();
      
      cy.get('select').first().select('project');
      cy.get('input[type="text"]').first().type('Cross-Class Project');
      
      // Select multiple classes
      cy.get('button').contains(/period 1|class 1/i).click({ force: true });
      cy.get('button').contains(/period 2|class 2/i).click({ force: true });
      
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Verify the project shows in both class contexts
      cy.contains('Cross-Class Project').should('be.visible');
    });

    it('should inherit class assignment from parent', () => {
      cy.visit('/');
      cy.contains('Tasks').click();
      
      // Create project assigned to specific class
      cy.contains('Create').click();
      cy.get('select').first().select('project');
      cy.get('input[type="text"]').first().type('Parent Project');
      cy.get('button').contains(/period 1|class 1/i).click({ force: true });
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();

      // Create child task - should inherit class
      cy.contains('Create').click();
      cy.get('select').first().select('task');
      cy.get('input[type="text"]').first().type('Child Task');
      
      // Verify class is pre-selected
      cy.get('button').contains(/period 1|class 1/i)
        .should('have.class', 'selected');
      
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
    });
  });

  describe('Progress Tracking', () => {
    it('should show progress bar for parent items', () => {
      // Create parent with multiple children
      cy.visit('/');
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      
      // Look for progress indicator on parent items
      cy.get('[class*="progress"]').should('exist');
    });

    it('should update progress when child is completed', () => {
      cy.visit('/');
      cy.contains('Tasks').click();
      cy.contains('Browse').click();
      
      // Find a task and mark it complete
      cy.contains('Task').first().click();
      cy.get('select').contains(/status/i).select('done');
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Verify parent's progress updated
      cy.get('[class*="progress"]').first()
        .should('contain', /1.*\/|completed/i);
    });
  });
});
