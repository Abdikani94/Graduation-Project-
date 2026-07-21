import { readDb, updateDb } from '../lib/db.js';
import { fail, sendJson } from '../lib/http.js';
import { matchesText, paginate, sortNewest } from '../lib/query.js';
import { processSmsNotification, scheduleSmsNotification } from '../services/smsService.js';

export const listSmsNotifications = async (req, res) => {
  const db = await readDb();
  let items = sortNewest(db.smsNotifications || []);
  const { status, eventType, search, dateFrom, dateTo } = req.query;
  if (status) items = items.filter((item) => item.status === status);
  if (eventType) items = items.filter((item) => item.eventType === eventType);
  if (dateFrom) items = items.filter((item) => item.createdAt >= `${dateFrom}T00:00:00.000Z`);
  if (dateTo) items = items.filter((item) => item.createdAt <= `${dateTo}T23:59:59.999Z`);
  items = items.filter((item) => matchesText(item, ['studentName', 'applicationReference', 'recipient', 'eventType'], search));
  const summary = {
    total: db.smsNotifications.length,
    pending: db.smsNotifications.filter((item) => ['PENDING', 'PROCESSING'].includes(item.status)).length,
    sent: db.smsNotifications.filter((item) => ['SENT', 'DELIVERED'].includes(item.status)).length,
    failed: db.smsNotifications.filter((item) => item.status === 'FAILED').length
  };
  sendJson(res, 200, { ...paginate(items, req.query), summary });
};

export const getSmsNotification = async (req, res) => {
  const db = await readDb();
  const notification = db.smsNotifications.find((item) => item.id === req.params.id);
  if (!notification) fail(404, 'SMS notification not found');
  sendJson(res, 200, { notification });
};

export const resendSmsNotification = async (req, res) => {
  const notification = await updateDb((db) => {
    const item = db.smsNotifications.find((entry) => entry.id === req.params.id);
    if (!item) fail(404, 'SMS notification not found');
    if (!['FAILED', 'CANCELLED'].includes(item.status)) fail(409, 'Only failed or cancelled SMS notifications can be resent');
    if (!item.recipient) fail(422, item.errorMessage || 'SMS recipient is invalid');
    item.status = 'PENDING'; item.errorMessage = null; item.failedAt = null; item.nextRetryAt = null; item.updatedAt = new Date().toISOString();
    return item;
  });
  scheduleSmsNotification(notification.id);
  sendJson(res, 202, { notification });
};

export const cancelSmsNotification = async (req, res) => {
  const notification = await updateDb((db) => {
    const item = db.smsNotifications.find((entry) => entry.id === req.params.id);
    if (!item) fail(404, 'SMS notification not found');
    if (!['PENDING', 'FAILED'].includes(item.status)) fail(409, 'Only pending or failed SMS notifications can be cancelled');
    item.status = 'CANCELLED'; item.nextRetryAt = null; item.errorMessage = 'Cancelled by administrator'; item.updatedAt = new Date().toISOString();
    return item;
  });
  sendJson(res, 200, { notification });
};

export const processSmsNow = async (req, res) => {
  const notification = await processSmsNotification(req.params.id, { force: true });
  if (!notification) fail(409, 'SMS notification cannot be processed in its current state');
  sendJson(res, 200, { notification });
};
