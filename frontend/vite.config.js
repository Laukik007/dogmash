import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    emptyOutDir: true,
  },
  define: {
    'process.env': process.env,
  },
  server: {
    port: 3000,
    proxy: {
      '/list': 'http://localhost:5000',
      '/create': 'http://localhost:5000',
      '/update': 'http://localhost:5000',
      '/verify-admin': 'http://localhost:5000',
      '/admin/sessions': 'http://localhost:5000',
    },
  },
});
