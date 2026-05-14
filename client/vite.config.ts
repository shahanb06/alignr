import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During dev we proxy /api requests to the Express server so the frontend can
// fetch from a same-origin path without CORS friction. In production the
// frontend can point to an absolute backend URL via VITE_API_BASE.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});
