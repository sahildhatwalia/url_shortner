import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, /api is proxied to the Express server so no CORS setup is needed.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: { '/api': env.API_PROXY_TARGET || 'http://localhost:5000' },
    },
  };
});
