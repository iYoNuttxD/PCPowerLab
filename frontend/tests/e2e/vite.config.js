import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Mock browser tests must never proxy an unhandled request to a user's backend.
// Real HTTP integration tests use their own isolated production server instead.
export default defineConfig({
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
