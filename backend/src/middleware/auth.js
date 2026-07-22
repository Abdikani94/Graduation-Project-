import { readDb } from '../lib/db.js';
import { fail } from '../lib/http.js';
import { verifyToken } from '../lib/crypto.js';

export const requireAuth = (handler, roles = []) => async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = verifyToken(token);
  if (!payload?.sub) fail(401, 'Authentication is required');

  const db = await readDb();
  const user = db.users.find((item) => item.id === payload.sub && item.status === 'Active');
  if (!user) fail(401, 'Authenticated user is not active');
  if (roles.length && !roles.includes(user.role)) fail(403, 'You do not have permission for this action');

  req.user = user;
  return handler(req, res);
};
