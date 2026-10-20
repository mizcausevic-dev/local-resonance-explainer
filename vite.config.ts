import { defineConfig } from 'vite'

export default defineConfig({
  // Relative URLs work both at a user/org root and under a GitHub Pages repo path.
  base: './',
  build: { target: 'es2022' }
})
