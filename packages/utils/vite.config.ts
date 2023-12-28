import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Define your test configuration here:
    globals: true,
    environment: 'node', // or 'node' if you're not testing browser environments
    // ... other options ...
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'), // Adjust this alias as needed
    },
  },
  // Include any other Vite plugins or configurations you need
});
