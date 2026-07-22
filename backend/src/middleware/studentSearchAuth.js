import { fail } from '../lib/http.js';

export const STUDENT_SEARCH_PERMISSIONS = Object.freeze([
  'student_search.view',
  'student_search.view_contact',
  'student_search.view_emergency_contact',
  'student_search.view_academic',
  'student_search.view_payment_summary',
  'student_search.view_full_profile'
]);

export const requireStudentSearchPermission = (permission) => (handler) => async (req, res) => {
  if (!['Admin', 'Officer'].includes(req.user.role)) fail(403, 'Student Search is available only to authorized staff');
  if (!Array.isArray(req.user.permissions) || !req.user.permissions.includes(permission)) {
    fail(403, `Missing required permission: ${permission}`);
  }
  return handler(req, res);
};
