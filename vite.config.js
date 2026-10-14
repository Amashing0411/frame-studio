import { defineConfig } from 'vite';
import classicScripts from './tools/vite-classic-scripts.js';
import classicConfig from './classic.config.js';

export default defineConfig({
  plugins: [classicScripts(classicConfig)],
  build: {
    // Step 1 ships the original CSS and scripts unchanged. Minification comes with the performance step.
    cssMinify: false,
  },
});
