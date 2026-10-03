import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // En GitHub Pages el sitio vive en /<repositorio>/ (lo define el workflow).
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
});
