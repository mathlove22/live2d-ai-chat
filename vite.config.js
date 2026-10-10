import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Relative base path ensures GitHub Pages deployment works under any subfolder
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
