console.log('jest.setup.js executed');
Object.defineProperty(global, 'import.meta', {
  value: {
    env: {
      VITE_RECAPTCHA_SITE_KEY: '',
    },
  },
});