import { readDb, updateDb } from '../lib/db.js';
import { fail, sendJson } from '../lib/http.js';
import { signToken, verifyPassword } from '../lib/crypto.js';
import { toPublicUser } from '../lib/query.js';
import { checkRateLimit } from '../lib/rateLimit.js';

export const login = async (req, res) => {
  const clientKey = req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(`login:${clientKey}`, { max: 10, windowMs: 15 * 60 * 1000 })) {
    fail(429, 'Too many login attempts. Please try again in a few minutes.');
  }

  const { username, email, password } = req.body || {};
  const loginName = username || email;
  if (!loginName || !password) fail(422, 'Username and password are required');

  const result = await updateDb((db) => {
    const normalizedLogin = String(loginName).toLowerCase();
    const user = db.users.find((item) =>
      item.username?.toLowerCase() === normalizedLogin ||
      item.email?.toLowerCase() === normalizedLogin
    );
    if (!user || user.status !== 'Active' || !verifyPassword(password, user.passwordHash)) {
      fail(401, 'Invalid username or password');
    }
    user.lastLoginAt = new Date().toISOString();
    user.updatedAt = user.lastLoginAt;
    return {
      token: signToken({ sub: user.id, role: user.role, username: user.username, email: user.email }),
      user: toPublicUser(user)
    };
  });

  sendJson(res, 200, result);
};

export const me = async (req, res) => {
  const db = await readDb();
  const user = db.users.find((item) => item.id === req.user.id);
  sendJson(res, 200, { user: toPublicUser(user) });
};
