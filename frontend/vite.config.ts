import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In dev, /api is proxied to the Nest server so no CORS setup is needed.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': process.env.API_PROXY ?? 'http://localhost:3000' } },
});
