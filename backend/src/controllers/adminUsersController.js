import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendJson, sendNoContent } from '../lib/http.js';
import { hashPassword } from '../lib/crypto.js';
import { matchesText, paginate, sortNewest, toPublicUser } from '../lib/query.js';
import { addActivity } from '../services/audit.js';

const allowedRoles = new Set(['Admin', 'Officer']);
const allowedStatuses = new Set(['Active', 'Disabled']);
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
const minPasswordLength = 8;

const withAdminStats = (db, user) => {
  const activities = db.activities.filter((item) => item.adminId === user.id);
  return {
    ...toPublicUser(user),
    total: activities.length,
    approved: activities.filter((item) => item.action.includes('Approved')).length,
    rejected: activities.filter((item) => item.action.includes('Rejected')).length,
    payments: activities.filter((item) => item.module === 'Payments').length,
    contacts: activities.filter((item) => item.module === 'Contacts').length
  };
};

export const listAdminUsers = async (req, res) => {
  const db = await readDb();
  let items = sortNewest(db.users).map((user) => withAdminStats(db, user));
  const { search, role, campus } = req.query;
  if (role && role !== 'Campus Admin') items = items.filter((item) => item.role === role);
  if (campus && campus !== 'Main Campus') items = items.filter((item) => item.campus === campus);
  items = items.filter((item) => matchesText(item, ['name', 'email', 'role', 'campus'], search));

  sendJson(res, 200, {
    ...paginate(items, req.query),
    summary: {
      totalAdmins: db.users.length,
      activeAdmins: db.users.filter((item) => item.status === 'Active').length,
      officers: db.users.filter((item) => item.role === 'Officer').length
    }
  });
};

export const createAdminUser = async (req, res) => {
  const { name, username, email, password, role = 'Officer', campus = 'Main Campus', team = '', department = '' } = req.body || {};
  if (!name || !username || !email || !password) fail(422, 'Name, username, email, and password are required');
  if (!isValidEmail(email)) fail(422, 'Please enter a valid email address');
  if (password.length < minPasswordLength) fail(422, `Password must be at least ${minPasswordLength} characters`);
  if (!allowedRoles.has(role)) fail(422, 'Role must be Admin or Officer');

  const user = await updateDb((db) => {
    if (db.users.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
      fail(409, 'A user with this email already exists');
    }
    if (db.users.some((item) => item.username?.toLowerCase() === username.toLowerCase())) {
      fail(409, 'A user with this username already exists');
    }
    const now = new Date().toISOString();
    const item = {
      id: createId('usr'),
      name,
      username,
      email,
      passwordHash: hashPassword(password),
      role,
      campus,
      team,
      department,
      status: 'Active',
      createdAt: now,
      updatedAt: now
    };
    db.users.unshift(item);
    addActivity(db, req, {
      action: 'Added Admin User',
      afterAction: role,
      applicantPerson: name,
      module: 'Admin Users'
    });
    return toPublicUser(item);
  });

  sendJson(res, 201, { user });
};

export const updateAdminUser = async (req, res) => {
  if (req.body?.email !== undefined && !isValidEmail(req.body.email)) fail(422, 'Please enter a valid email address');
  if (req.body?.role !== undefined && !allowedRoles.has(req.body.role)) fail(422, 'Role must be Admin or Officer');
  if (req.body?.status !== undefined && !allowedStatuses.has(req.body.status)) fail(422, 'Status must be Active or Disabled');
  if (req.body?.password && req.body.password.length < minPasswordLength) {
    fail(422, `Password must be at least ${minPasswordLength} characters`);
  }

  const user = await updateDb((db) => {
    const found = db.users.find((item) => item.id === req.params.id);
    if (!found) fail(404, 'Admin user not found');
    const before = found.role;
    for (const key of ['name', 'username', 'email', 'role', 'campus', 'team', 'department', 'status']) {
      if (req.body[key] !== undefined) found[key] = req.body[key];
    }
    if (req.body.password) found.passwordHash = hashPassword(req.body.password);
    found.updatedAt = new Date().toISOString();
    addActivity(db, req, {
      action: 'Updated Admin User',
      beforeAction: before,
      afterAction: found.role,
      applicantPerson: found.name,
      module: 'Admin Users'
    });
    return toPublicUser(found);
  });
  sendJson(res, 200, { user });
};

export const deleteAdminUser = async (req, res) => {
  await updateDb((db) => {
    if (req.user.id === req.params.id) fail(422, 'You cannot delete your own admin account');
    const index = db.users.findIndex((item) => item.id === req.params.id);
    if (index === -1) fail(404, 'Admin user not found');
    const [user] = db.users.splice(index, 1);
    addActivity(db, req, {
      action: 'Deleted Admin User',
      beforeAction: user.role,
      applicantPerson: user.name,
      module: 'Admin Users'
    });
  });
  sendNoContent(res);
};
