import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Serves staff.html at /staff, in dev and in `vite preview`. On Render the same is done with a rewrite rule. */
function staffRoute(): Plugin {
  const rewrite = (url: string | undefined) => (url === '/staff' || url?.startsWith('/staff?') ? '/staff.html' + url.slice('/staff'.length) : url);
  return {
    name: 'staff-route',
    configureServer: (server) => {
      server.middlewares.use((req, _res, next) => {
        req.url = rewrite(req.url);
        next();
      });
    },
    configurePreviewServer: (server) => {
      server.middlewares.use((req, _res, next) => {
        req.url = rewrite(req.url);
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), staffRoute()],
  build: {
    rollupOptions: {
      // Two pages: the customer app, and the bar's order board.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        staff: fileURLToPath(new URL('./staff.html', import.meta.url)),
      },
    },
  },
});
