import { defineConfig } from 'vite';

export default defineConfig({
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
});
