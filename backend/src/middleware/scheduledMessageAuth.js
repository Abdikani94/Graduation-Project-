import { fail } from '../lib/http.js';

export const requireScheduledMessagePermission = (permission) => (handler) => async (req, res) => {
  if (req.user.role !== 'Admin') fail(403, 'You do not have permission for this action');
  if (!Array.isArray(req.user.permissions) || !req.user.permissions.includes(permission)) {
    fail(403, `Missing required permission: ${permission}`);
  }
  return handler(req, res);
};
