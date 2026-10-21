import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Mock browser tests must never proxy an unhandled request to a user's backend.
// Real HTTP integration tests use their own isolated production server instead.
export default defineConfig({
  // Keep optimized React modules stable across browser workers and separate
  // from a concurrently used developer server's dependency cache.
  cacheDir: 'node_modules/.vite-e2e',
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react-router-dom', 'recharts', 'lucide-react'] },
  plugins: [react(), {
    name: 'reject-unmocked-test-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = request.url.split('?')[0];
        if (pathname !== '/api' && !pathname.startsWith('/api/')) return next();
        response.statusCode = 503;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ success: false, message: `API não simulada no teste: ${pathname}` }));
      });
    }
  }]
});
