import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendJson, sendNoContent } from '../lib/http.js';
import { matchesText, paginate, sortNewest } from '../lib/query.js';
import { addActivity } from '../services/audit.js';
import { sendContactReplyEmail } from '../services/emailService.js';
import { env } from '../config/env.js';

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
      emailStatus: 'NotSent',
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
    replied: db.contactMessages.filter((item) => item.emailStatus === 'Sent' && item.response).length,
    pending: db.contactMessages.filter((item) => item.status === 'Pending').length,
    cancelled: db.contactMessages.filter((item) => item.status === 'Cancelled').length
  };

  const emailConfigured = Boolean(env.emailEnabled && env.smtpHost && env.smtpUser && env.smtpPassword && env.emailFrom);
  sendJson(res, 200, { ...paginate(items, req.query), summary, emailConfigured });
};

export const updateContactStatus = async (req, res) => {
  const { status, response = '' } = req.body || {};
  const allowed = new Set(['Pending', 'Cancelled']);
  if (status === 'Resolved') fail(422, 'Send an email reply to resolve this contact message');
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

export const replyToContactMessage = async (req, res) => {
  const response = String(req.body?.response || '').trim();
  if (response.length < 2) fail(422, 'Reply message is required');
  if (response.length > 5000) fail(422, 'Reply message cannot exceed 5000 characters');

  const existing = (await readDb()).contactMessages.find((item) => item.id === req.params.id);
  if (!existing) fail(404, 'Contact message not found');
  if (!isValidEmail(existing.email)) fail(422, 'The contact message does not contain a valid recipient email');

  let delivery;
  try {
    delivery = await sendContactReplyEmail({ contact: existing, response });
  } catch (error) {
    if (error.status) throw error;
    fail(502, `Email could not be sent: ${error.message || 'SMTP provider error'}`);
  }

  const contact = await updateDb((db) => {
    const found = db.contactMessages.find((item) => item.id === req.params.id);
    if (!found) fail(404, 'Contact message not found');
    const now = new Date().toISOString();
    found.response = response;
    found.status = 'Resolved';
    found.emailStatus = 'Sent';
    found.emailMessageId = delivery.messageId || '';
    found.repliedAt = now;
    found.repliedBy = req.user?.name || req.user?.username || req.user?.id || 'Admin';
    found.updatedAt = now;
    addActivity(db, req, { action: 'Replied to Contact Message', beforeAction: 'Pending', afterAction: 'Email Sent', applicantPerson: found.name, module: 'Contacts' });
    return found;
  });

  sendJson(res, 200, { contact, delivery: { accepted: delivery.accepted } });
};

export const deleteContactMessage = async (req, res) => {
  await updateDb((db) => {
    const index = db.contactMessages.findIndex((item) => item.id === req.params.id);
    if (index === -1) fail(404, 'Contact message not found');
    const [contact] = db.contactMessages.splice(index, 1);
    addActivity(db, req, {
      action: 'Deleted Contact Message',
      beforeAction: contact.status,
      applicantPerson: contact.name,
      module: 'Contacts'
    });
  });
  sendNoContent(res);
};
