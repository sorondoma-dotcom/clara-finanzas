import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // En desarrollo, /api se reenvía a la API de FastAPI (uvicorn local o contenedor `api`).
  const apiTarget = env.VITE_API_PROXY || `http://127.0.0.1:${env.API_PORT || 8000}`;
  return {
    server: { proxy: { '/api': apiTarget } },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules') && /recharts|d3-|victory-vendor|react-smooth|reselect|redux|immer/.test(id)) return 'charts';
            if (id.includes('node_modules') && /react-dom|\/react\//.test(id)) return 'react';
          },
        },
      },
    },
  };
});
