import { defineConfig } from 'vite';
export default defineConfig({root: 'app', base: '/Board/', build: {outDir: '../dist', emptyOutDir: true, assetsDir: 'assets', sourcemap: false}});
