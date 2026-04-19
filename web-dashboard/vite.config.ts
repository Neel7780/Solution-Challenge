import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
      '/simulation': {
        target: 'http://localhost:8060',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(/^\/simulation/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2020',
  },
});
