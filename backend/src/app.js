import { Router } from './lib/router.js';
import {
  parseRequestBody,
  sendError,
  serveUpload,
  setCorsHeaders
} from './lib/http.js';
import { registerRoutes } from './routes/index.js';

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

      if (url.pathname.startsWith('/uploads/')) {
        await serveUpload(res, url.pathname);
        return;
      }

      req.body = await parseRequestBody(req);

      await router.handle(req, res, url.pathname);
    } catch (error) {
      sendError(res, error);
    }
  };
};

const app = createApp();

export default app;