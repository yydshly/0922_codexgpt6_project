import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/0922_codexgpt6_project/' : '/',
  plugins: [react()],
  server: { port: 5173 },
  build: { chunkSizeWarningLimit: 900 },
});
