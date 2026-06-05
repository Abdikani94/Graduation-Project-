import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendJson } from '../lib/http.js';
import { matchesText, paginate, sortNewest } from '../lib/query.js';
import { addActivity } from '../services/audit.js';

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
const isValidPhone = (phone) => /^\+?\d[\d\s-]{6,}$/.test(phone || '');
const allowedContactTypes = new Set(['Admission', 'Get discount', 'Problem enrollment', 'Payment', 'Technical Support', 'General']);

export const createContactMessage = async (req, res) => {
  const { name, email, phone, type = 'Admission', message } = req.body || {};
  if (!name || !email || !phone || !type || !message) fail(422, 'Name, email, phone, type, and message are required');
  if (!isValidEmail(email)) fail(422, 'Please enter a valid email address');
  if (!isValidPhone(phone)) fail(422, 'Please enter a valid phone number');
  if (!allowedContactTypes.has(type)) fail(422, 'Invalid contact type');

  const contact = await updateDb((db) => {
    const now = new Date().toISOString();
    const item = {
      id: createId('con'),
      name,
      email,
      phone: phone || '',
      type,
      message,
      status: 'Pending',
      response: '',
      createdAt: now,
      updatedAt: now
    };
    db.contactMessages.unshift(item);
    addActivity(db, req, {
      action: 'Created Contact Message',
      afterAction: 'Pending',
      applicantPerson: name,
      module: 'Contacts'
    });
    return item;
  });

  sendJson(res, 201, { contact });
};

export const listContactMessages = async (req, res) => {
  const db = await readDb();
  let items = sortNewest(db.contactMessages);
  const { search, status, type } = req.query;

  if (status && status !== 'All Status') items = items.filter((item) => item.status === status);
  if (type && type !== 'Type of contact') items = items.filter((item) => item.type === type);
  items = items.filter((item) => matchesText(item, ['name', 'email', 'phone', 'message'], search));

  const summary = {
    replied: db.contactMessages.filter((item) => item.status === 'Resolved').length,
    pending: db.contactMessages.filter((item) => item.status === 'Pending').length,
    cancelled: db.contactMessages.filter((item) => item.status === 'Cancelled').length
  };

  sendJson(res, 200, { ...paginate(items, req.query), summary });
};

export const updateContactStatus = async (req, res) => {
  const { status, response = '' } = req.body || {};
  const allowed = new Set(['Pending', 'Resolved', 'Cancelled']);
  if (!allowed.has(status)) fail(422, 'Invalid contact status');

  const contact = await updateDb((db) => {
    const found = db.contactMessages.find((item) => item.id === req.params.id);
    if (!found) fail(404, 'Contact message not found');
    const before = found.status;
    found.status = status;
    found.response = response || found.response;
    found.updatedAt = new Date().toISOString();
    addActivity(db, req, {
      action: `${status} Contact Message`,
      beforeAction: before,
      afterAction: status,
      applicantPerson: found.name,
      module: 'Contacts'
    });
    return found;
  });

  sendJson(res, 200, { contact });
};
