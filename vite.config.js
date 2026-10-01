import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.SITE_BASE_PATH || '/CatDynasty/',
  server: { port: 4173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
