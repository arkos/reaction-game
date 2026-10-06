import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the same build works on GitHub Pages sub-paths, Netlify and Vercel.
  base: './',
  build: {
    target: 'es2020',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
