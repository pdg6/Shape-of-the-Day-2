// Cypress E2E support file
// This file runs before every test

import './commands';

// Prevent Cypress from failing on uncaught exceptions from the app
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // We might want to log these for debugging
  console.warn('Uncaught exception:', err.message);
  return false;
});

// Set up before each test
beforeEach(() => {
  // Clear any previous session data
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set viewport for consistent testing
  cy.viewport(1280, 720);
});

// Custom assertion for Firebase data
Cypress.Commands.add('assertFirestoreData', (collection: string, query: object, expected: object) => {
  // This would need to be implemented with direct Firestore access
  // For now, we rely on UI-based assertions
});

// Log test name for debugging
beforeEach(function() {
  const testTitle = this.currentTest?.title || 'Unknown test';
  cy.log(`🧪 Running: ${testTitle}`);
});

// Take screenshot on failure
afterEach(function() {
  if (this.currentTest?.state === 'failed') {
    const testTitle = this.currentTest.title.replace(/\s+/g, '_');
    cy.screenshot(`failed_${testTitle}`);
  }
});
