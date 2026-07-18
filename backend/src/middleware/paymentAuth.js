import { readDb } from '../lib/db.js';
import { fail } from '../lib/http.js';
import { verifyToken } from '../lib/crypto.js';

export const requirePaymentAuth = (handler) => async (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = verifyToken(token);
  if (!payload) fail(401, 'Payment authorization is required');

  const db = await readDb();
  const admin = payload.sub && db.users.find((item) => item.id === payload.sub && item.status === 'Active');
  if (admin && ['Admin', 'Officer'].includes(admin.role)) {
    req.paymentOwner = { id: admin.id, role: admin.role, applicationId: null };
    return handler(req, res);
  }
  if (payload.type !== 'application_payment' || !payload.applicationId) fail(403, 'Payment authorization is invalid');
  req.paymentOwner = { id: payload.applicationId, role: 'Applicant', applicationId: payload.applicationId };
  return handler(req, res);
};
