/**
 * Task Attachments E2E Tests
 * 
 * Tests file upload, paste image, and attachment display functionality
 * 
 * Priority: 10
 */

describe('Task Attachments', () => {
  const teacherEmail = 'teacher@test.com';
  const teacherPassword = 'testpassword123';

  beforeEach(() => {
    cy.clearEmulator();
    cy.loginAsTeacher(teacherEmail, teacherPassword);
    cy.visit('/');
    cy.contains('Tasks').click();
    cy.contains('Create').click();
  });

  describe('File Upload', () => {
    it('should upload a PDF file', () => {
      cy.get('input[type="text"]').first().type('Task with PDF');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      // Create a fake PDF file
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('%PDF-1.4 test content'),
        fileName: 'document.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      
      cy.waitForFirebase(3000);
      
      // Verify file appears in attachments list
      cy.contains('document.pdf').should('be.visible');
    });

    it('should upload an image file', () => {
      cy.get('input[type="text"]').first().type('Task with Image');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      // Create a fake image file
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('fake image data'),
        fileName: 'photo.png',
        mimeType: 'image/png'
      }, { force: true });
      
      cy.waitForFirebase(3000);
      
      // Verify file appears
      cy.contains('photo.png').should('be.visible');
    });

    it('should upload multiple files at once', () => {
      cy.get('input[type="text"]').first().type('Task with Multiple Files');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.get('[data-testid="file-upload-input"]').selectFile([
        {
          contents: Cypress.Buffer.from('file 1 content'),
          fileName: 'file1.pdf',
          mimeType: 'application/pdf'
        },
        {
          contents: Cypress.Buffer.from('file 2 content'),
          fileName: 'file2.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
      ], { force: true });
      
      cy.waitForFirebase(3000);
      
      cy.contains('file1.pdf').should('be.visible');
      cy.contains('file2.docx').should('be.visible');
    });

    it('should reject files that are too large', () => {
      cy.get('input[type="text"]').first().type('Large File Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      // Create a file larger than 10MB limit
      const largeContent = new Uint8Array(11 * 1024 * 1024); // 11MB
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: largeContent,
        fileName: 'large_file.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      
      // Should show error
      cy.contains(/too large|maximum.*size|file.*limit/i).should('be.visible');
    });

    it('should reject unsupported file types', () => {
      cy.get('input[type="text"]').first().type('Invalid File Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('executable content'),
        fileName: 'malware.exe',
        mimeType: 'application/x-msdownload'
      }, { force: true });
      
      // Should show error
      cy.contains(/not allowed|unsupported|invalid.*type/i).should('be.visible');
    });

    it('should show upload progress indicator', () => {
      cy.get('input[type="text"]').first().type('Progress Test');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('test content'),
        fileName: 'test.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      
      // Should show uploading state
      cy.contains(/uploading|loading/i).should('be.visible');
    });
  });

  describe('Paste Image', () => {
    it('should accept pasted images in description field', () => {
      cy.get('input[type="text"]').first().type('Paste Image Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      // Focus the description textarea
      cy.get('textarea[placeholder*="Instructions"]').focus();
      
      // Simulate pasting an image
      // Note: This is tricky to test in Cypress - we'll simulate the event
      cy.get('textarea[placeholder*="Instructions"]').trigger('paste', {
        clipboardData: {
          items: [{
            type: 'image/png',
            getAsFile: () => new File(['fake image'], 'pasted-image.png', { type: 'image/png' })
          }]
        }
      });
      
      cy.waitForFirebase(3000);
      
      // Should show the pasted image as attachment
      cy.contains(/pasted|image.*uploaded/i).should('be.visible');
    });

    it('should show hint about paste functionality', () => {
      // Description field should indicate paste is supported
      cy.get('label').contains(/description/i).should('contain.text', 'paste');
    });
  });

  describe('Attachment Display', () => {
    beforeEach(() => {
      // Upload a file first
      cy.get('input[type="text"]').first().type('Display Test Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('test content'),
        fileName: 'display_test.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      
      cy.waitForFirebase(3000);
    });

    it('should display filename for attachments', () => {
      cy.contains('display_test.pdf').should('be.visible');
    });

    it('should show appropriate icon for file type', () => {
      // PDF should have document icon
      cy.contains('display_test.pdf')
        .parent()
        .find('svg')
        .should('exist');
    });

    it('should allow downloading/opening attachment', () => {
      cy.contains('display_test.pdf')
        .should('have.attr', 'href')
        .and('include', 'firebase');
    });

    it('should open attachment in new tab', () => {
      cy.contains('display_test.pdf')
        .should('have.attr', 'target', '_blank');
    });
  });

  describe('Remove Attachments', () => {
    beforeEach(() => {
      cy.get('input[type="text"]').first().type('Remove Test Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('test content'),
        fileName: 'to_remove.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      
      cy.waitForFirebase(3000);
    });

    it('should show remove button for each attachment', () => {
      cy.contains('to_remove.pdf')
        .parent()
        .find('button, [class*="remove"], [class*="delete"]')
        .should('be.visible');
    });

    it('should remove attachment when clicking remove button', () => {
      cy.contains('to_remove.pdf')
        .parent()
        .find('button, [class*="remove"], [class*="delete"]')
        .click();
      
      cy.waitForFirebase();
      
      cy.contains('to_remove.pdf').should('not.exist');
    });

    it('should persist removal after saving task', () => {
      // Remove attachment
      cy.contains('to_remove.pdf')
        .parent()
        .find('button, [class*="remove"], [class*="delete"]')
        .click();
      
      // Save task
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Reload and verify
      cy.contains('Browse').click();
      cy.contains('Remove Test Task').click();
      
      cy.contains('to_remove.pdf').should('not.exist');
    });
  });

  describe('Attachments After Save', () => {
    it('should persist attachments when task is saved', () => {
      cy.get('input[type="text"]').first().type('Persist Test');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('persist test'),
        fileName: 'persistent.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      
      cy.waitForFirebase(3000);
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Navigate away and back
      cy.contains('Browse').click();
      cy.contains('Persist Test').click();
      
      // Attachment should still be there
      cy.contains('persistent.pdf').should('be.visible');
    });

    it('should show attachments in task view/inventory', () => {
      cy.get('input[type="text"]').first().type('Inventory Display');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('test'),
        fileName: 'inventory_file.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      
      cy.waitForFirebase(3000);
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      cy.contains('Browse').click();
      
      // Should show attachment indicator or the filename
      cy.contains('Inventory Display')
        .parents('[class*="task"]')
        .find('[class*="attachment"], [class*="paperclip"]')
        .should('exist');
    });
  });

  describe('Student View of Attachments', () => {
    it('should show attachments to students', () => {
      // Create task with attachment as teacher
      cy.get('input[type="text"]').first().type('Student Visible');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('student content'),
        fileName: 'for_students.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      
      cy.waitForFirebase(3000);
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Switch to student view
      cy.loginAsStudent('Test Student');
      
      // Find the task
      cy.contains('Student Visible').click();
      
      // Student should see the attachment
      cy.contains('for_students.pdf').should('be.visible');
    });

    it('should allow students to download attachments', () => {
      // Create task as teacher
      cy.get('input[type="text"]').first().type('Downloadable Task');
      cy.get('button').contains(/class|period/i).first().click({ force: true });
      
      cy.get('[data-testid="file-upload-input"]').selectFile({
        contents: Cypress.Buffer.from('download content'),
        fileName: 'download_me.pdf',
        mimeType: 'application/pdf'
      }, { force: true });
      
      cy.waitForFirebase(3000);
      cy.contains('button', /save/i).click();
      cy.waitForFirebase();
      
      // Switch to student
      cy.loginAsStudent('Download Student');
      cy.contains('Downloadable Task').click();
      
      // Should have clickable download link
      cy.contains('download_me.pdf')
        .should('have.attr', 'href');
    });
  });

  describe('Attachment Types', () => {
    const testFiles = [
      { name: 'image.jpg', type: 'image/jpeg', icon: 'image' },
      { name: 'image.png', type: 'image/png', icon: 'image' },
      { name: 'document.pdf', type: 'application/pdf', icon: 'file' },
      { name: 'spreadsheet.xlsx', type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', icon: 'file' },
      { name: 'presentation.pptx', type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', icon: 'file' },
      { name: 'text.txt', type: 'text/plain', icon: 'file' },
    ];

    testFiles.forEach(file => {
      it(`should accept ${file.type} files`, () => {
        cy.get('input[type="text"]').first().type(`${file.name} Task`);
        cy.get('button').contains(/class|period/i).first().click({ force: true });
        
        cy.get('[data-testid="file-upload-input"]').selectFile({
          contents: Cypress.Buffer.from('content'),
          fileName: file.name,
          mimeType: file.type
        }, { force: true });
        
        cy.waitForFirebase(3000);
        cy.contains(file.name).should('be.visible');
      });
    });
  });
});
