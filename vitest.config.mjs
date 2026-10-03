export default {
  test: {
    environment: 'jsdom',
    globals: {
      '@testing-library/react': true
    },
    css: true,
    setupFiles: ['./vitest.setup.mjs']
  }
};
