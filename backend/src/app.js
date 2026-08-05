import { Router } from './lib/router.js';
import {
  parseRequestBody,
  sendError,
  serveUpload,
  setCorsHeaders
} from './lib/http.js';
import { registerRoutes } from './routes/index.js';

const normalizeApiPath = (pathname) => {
  if (pathname === '/api' || pathname === '/api/') return '/';
  if (pathname.startsWith('/api/')) return pathname.slice('/api'.length);
  return pathname;
};

export const createApp = () => {
  const router = new Router();

  registerRoutes(router);

  return async function app(req, res) {
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    try {
      const url = new URL(
        req.url,
        `http://${req.headers.host || 'localhost'}`
      );

      req.query = Object.fromEntries(url.searchParams.entries());

      const pathname = normalizeApiPath(url.pathname);

      if (pathname.startsWith('/uploads/')) {
        await serveUpload(res, pathname);
        return;
      }

      req.body = await parseRequestBody(req);

      await router.handle(req, res, pathname);
    } catch (error) {
      sendError(res, error);
    }
  };
};

const app = createApp();

export default app;
