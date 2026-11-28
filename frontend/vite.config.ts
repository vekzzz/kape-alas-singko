import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv, type Plugin } from 'vite';
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

/**
 * VITE_API_URL is baked into the build. If it is missing, the site would deploy fine and then show every
 * customer "We couldn't load the menu", so stop the build on the host instead. (Render sets RENDER=true.)
 */
function requireApiUrlOnHost(mode: string): Plugin {
  return {
    name: 'require-api-url',
    apply: 'build',
    buildStart() {
      const env = loadEnv(mode, process.cwd(), 'VITE_');
      if (process.env.RENDER && !env.VITE_API_URL) {
        throw new Error('VITE_API_URL is not set. Set it on the static site to the API address, for example https://kape-api.onrender.com, then deploy again.');
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), staffRoute(), requireApiUrlOnHost(mode)],
  build: {
    rollupOptions: {
      // Two pages: the customer app, and the bar's order board.
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        staff: fileURLToPath(new URL('./staff.html', import.meta.url)),
      },
    },
  },
}));
