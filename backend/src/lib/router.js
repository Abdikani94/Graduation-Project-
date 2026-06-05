import { fail } from './http.js';

const splitPath = (path) => path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, path, handler) {
    this.routes.push({ method, path, parts: splitPath(path), handler });
  }

  get(path, handler) {
    this.add('GET', path, handler);
  }

  post(path, handler) {
    this.add('POST', path, handler);
  }

  patch(path, handler) {
    this.add('PATCH', path, handler);
  }

  delete(path, handler) {
    this.add('DELETE', path, handler);
  }

  async handle(req, res, pathname) {
    const requestParts = splitPath(pathname);
    for (const route of this.routes) {
      if (route.method !== req.method || route.parts.length !== requestParts.length) continue;
      const params = {};
      let matches = true;
      for (let index = 0; index < route.parts.length; index += 1) {
        const expected = route.parts[index];
        const actual = decodeURIComponent(requestParts[index]);
        if (expected.startsWith(':')) {
          params[expected.slice(1)] = actual;
          continue;
        }
        if (expected !== actual) {
          matches = false;
          break;
        }
      }
      if (!matches) continue;
      req.params = params;
      return route.handler(req, res);
    }
    fail(404, 'Route not found');
  }
}
