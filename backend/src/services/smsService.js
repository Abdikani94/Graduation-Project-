import { createId, readDb, updateDb } from '../lib/db.js';
import { env } from '../config/env.js';
import { SMS_TEMPLATES } from './smsTemplates.js';

const retryDelaysMs = [60_000, 300_000, 900_000];
let smsTransport = (url, options) => fetch(url, options);
let scheduler;

export const brandSmsMessage = (message) => {
  const content = String(message ?? '').trim();
  const brand = String(env.smsBrandName || 'Jamhuuriya University').trim();
  if (!brand || !content) return content;
  if (content.toLocaleLowerCase().startsWith(brand.toLocaleLowerCase())) return content;
  return `${brand}: ${content}`;
};

export const setSmsTransportForTests = (transport) => {
  smsTransport = transport || ((url, options) => fetch(url, options));
};

export const normalizeSomaliPhoneNumber = (phone) => {
  let value = String(phone ?? '').trim().replace(/[\s\-()]/g, '').replace(/^\++/, '+');
  if (!value) throw new Error('Missing student phone number');
  if (value.startsWith('+')) value = value.slice(1);
  if (value.startsWith('0')) value = `${env.smsDefaultCountryCode}${value.slice(1)}`;
  else if (!value.startsWith(env.smsDefaultCountryCode)) value = `${env.smsDefaultCountryCode}${value}`;
  if (!/^2526\d{8}$/.test(value)) throw new Error('Invalid Somali mobile phone number');
  return `+${value}`;
};

const safeError = (error) => {
  if (error?.name === 'AbortError') return 'SMS provider request timed out';
  if (error?.message === 'Invalid Somali mobile phone number' || error?.message === 'Missing student phone number') return error.message;
  return 'Unable to contact the SMS provider';
};

const safeProviderResponse = (body) => {
  if (body === undefined || body === null || body === '') return null;
  if (typeof body === 'string') return body.slice(0, 2000);
  try { return JSON.parse(JSON.stringify(body)); } catch { return { message: 'Unserializable provider response' }; }
};

const createApplicationNotification = (db, application, template, { student = null, messageData = {}, idempotencyKey: requestedKey = null } = {}) => {
  const idempotencyKey = requestedKey || `${template.eventType}:${application.id}`;
  const existing = (db.smsNotifications || []).find((item) => item.idempotencyKey === idempotencyKey);
  if (existing) return existing;
  db.smsNotifications = db.smsNotifications || [];
  const now = new Date().toISOString();
  let recipient = null;
  let status = env.smsEnabled && template.enabled ? 'PENDING' : 'CANCELLED';
  let errorMessage = env.smsEnabled ? null : 'SMS feature is disabled';
  try { recipient = normalizeSomaliPhoneNumber(application.mobile); } catch (error) {
    status = 'FAILED';
    errorMessage = safeError(error);
  }
  const notification = {
    id: createId('sms'), studentId: student?.id || null, applicationId: application.id,
    applicationReference: application.reference, studentName: application.fullName,
    channel: 'SMS', provider: env.smsProvider, eventType: template.eventType,
    recipient, message: brandSmsMessage(typeof template.message === 'function' ? template.message(messageData) : template.message), status, providerResponse: null,
    errorMessage, attemptCount: 0, idempotencyKey, sentAt: null,
    deliveredAt: null, failedAt: status === 'FAILED' ? now : null,
    nextRetryAt: null, createdAt: now, updatedAt: now
  };
  db.smsNotifications.unshift(notification);
  return notification;
};

export const createApplicationSubmittedNotification = (db, application) =>
  createApplicationNotification(db, application, SMS_TEMPLATES.APPLICATION_SUBMITTED_SMS);

export const createInsufficientBalanceNotification = (db, application, payment, payerPhone) =>
  createApplicationNotification(
    db,
    { ...application, mobile: payerPhone },
    {
      eventType: 'PAYMENT_INSUFFICIENT_BALANCE',
      enabled: true,
      message: 'Haraaga EVC-ga kuguma filna bixinta khidmada diiwaangelinta ee USD 25.00. Fadlan lacag ku shubo kadibna mar kale isku day.'
    },
    { idempotencyKey: `PAYMENT_INSUFFICIENT_BALANCE:${payment.referenceId}` }
  );

export const createScheduledSmsNotification = (db, campaign, recipient) => {
  const template = { eventType: 'SCHEDULED_STUDENT_MESSAGE', enabled: true, message: recipient.personalizedMessage };
  const application = {
    id: recipient.studentId,
    reference: campaign.id,
    fullName: recipient.recipientName,
    mobile: recipient.normalizedPhone || recipient.recipientPhone
  };
  const notification = createApplicationNotification(db, application, template, {
    student: { id: recipient.studentId }, idempotencyKey: recipient.idempotencyKey
  });
  notification.campaignId = campaign.id;
  notification.campaignRecipientId = recipient.id;
  return notification;
};

const syncCampaignResult = (db, notification) => {
  if (!notification.campaignId || !notification.campaignRecipientId) return;
  const recipient = db.smsCampaignRecipients.find((item) => item.id === notification.campaignRecipientId);
  const campaign = db.smsCampaigns.find((item) => item.id === notification.campaignId);
  if (!recipient || !campaign) return;
  Object.assign(recipient, {
    status: notification.status, attemptCount: notification.attemptCount,
    providerResponse: notification.providerResponse, errorMessage: notification.errorMessage,
    sentAt: notification.sentAt, deliveredAt: notification.deliveredAt,
    failedAt: notification.failedAt, updatedAt: notification.updatedAt
  });
  const recipients = db.smsCampaignRecipients.filter((item) => item.campaignId === campaign.id);
  campaign.successfulCount = recipients.filter((item) => ['SENT', 'DELIVERED'].includes(item.status)).length;
  campaign.failedCount = recipients.filter((item) => item.status === 'FAILED').length;
  campaign.cancelledCount = recipients.filter((item) => item.status === 'CANCELLED').length;
  const remaining = recipients.filter((item) => ['PENDING', 'PROCESSING'].includes(item.status)).length;
  if (remaining === 0) {
    if (campaign.successfulCount && campaign.failedCount) campaign.status = 'Partially Sent';
    else if (campaign.successfulCount) campaign.status = 'Sent';
    else campaign.status = 'Failed';
    campaign.completedAt = new Date().toISOString();
  }
  campaign.updatedAt = new Date().toISOString();
};

const finishAttempt = async (id, outcome) => updateDb((db) => {
  const item = db.smsNotifications.find((entry) => entry.id === id);
  if (!item) return null;
  Object.assign(item, outcome, { updatedAt: new Date().toISOString() });
  syncCampaignResult(db, item);
  return item;
});

export const processSmsNotification = async (id, { force = false } = {}) => {
  const item = await updateDb((db) => {
    const found = db.smsNotifications.find((entry) => entry.id === id);
    if (!found || found.status === 'SENT' || found.status === 'DELIVERED' || found.status === 'PROCESSING') return null;
    if (!force && !['PENDING', 'FAILED'].includes(found.status)) return null;
    if (!env.smsEnabled) { found.status = 'CANCELLED'; found.errorMessage = 'SMS feature is disabled'; return null; }
    if (!found.recipient) return null;
    found.status = 'PROCESSING'; found.message = brandSmsMessage(found.message); found.attemptCount += 1; found.nextRetryAt = null; found.updatedAt = new Date().toISOString();
    return { ...found };
  });
  if (!item) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.smsRequestTimeoutMs);
  try {
    const response = await smsTransport(env.smsApiUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: item.recipient, message: item.message }), signal: controller.signal
    });
    let body = null;
    try { body = await response.json(); } catch { try { body = await response.text(); } catch { body = null; } }
    if (!response.ok) {
      const temporary = response.status === 429 || response.status >= 500;
      throw Object.assign(new Error(`SMS provider returned HTTP ${response.status}`), { temporary, providerResponse: body });
    }
    return finishAttempt(id, {
      status: 'SENT', providerResponse: safeProviderResponse(body), errorMessage: null,
      sentAt: new Date().toISOString(), failedAt: null, nextRetryAt: null
    });
  } catch (error) {
    const temporary = error?.temporary === true || error?.name === 'AbortError' || !error?.providerResponse;
    const canRetry = temporary && item.attemptCount < env.smsMaxRetries;
    const nextRetryAt = canRetry
      ? new Date(Date.now() + retryDelaysMs[Math.min(item.attemptCount - 1, retryDelaysMs.length - 1)]).toISOString()
      : null;
    return finishAttempt(id, {
      status: 'FAILED', providerResponse: safeProviderResponse(error?.providerResponse), errorMessage: safeError(error),
      failedAt: new Date().toISOString(), nextRetryAt
    });
  } finally { clearTimeout(timeout); }
};

export const scheduleSmsNotification = (id) => {
  if (!id) return;
  setTimeout(() => processSmsNotification(id).catch((error) => console.error('SMS processing failed safely:', error.message)), 0).unref?.();
};

export const processDueSmsNotifications = async () => {
  if (!env.smsEnabled) return;
  const db = await readDb();
  const now = Date.now();
  const due = db.smsNotifications.filter((item) => item.status === 'PENDING' || (item.status === 'FAILED' && item.nextRetryAt && Date.parse(item.nextRetryAt) <= now));
  for (const item of due.slice(0, 20)) await processSmsNotification(item.id);
};

export const startSmsScheduler = (intervalMs = env.smsSchedulerMs) => {
  if (scheduler || !env.smsEnabled) return scheduler;
  processDueSmsNotifications().catch((error) => console.error('SMS scheduler failed safely:', error.message));
  scheduler = setInterval(() => processDueSmsNotifications().catch((error) => console.error('SMS scheduler failed safely:', error.message)), intervalMs);
  scheduler.unref?.();
  return scheduler;
};
