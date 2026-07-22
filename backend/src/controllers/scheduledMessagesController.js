import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendJson } from '../lib/http.js';
import { matchesText, paginate, sortNewest } from '../lib/query.js';
import { addActivity } from '../services/audit.js';
import {
  buildRecipientSnapshot, processCampaign, previewScheduledMessage, SCHEDULED_MESSAGE_TYPES,
  SUPPORTED_PLACEHOLDERS, validateCampaignInput, validateMessageContent
} from '../services/scheduledMessageService.js';

const campaignFields = ['title', 'messageType', 'messageContent', 'targetAudience', 'targetFilters', 'selectedStudentIds', 'scheduledAt', 'timezone'];
const campaignAction = (db, req, campaign, action, before = '', after = '', metadata = {}) => addActivity(db, req, {
  action, beforeAction: before, afterAction: after, applicationReference: campaign.id,
  module: 'Scheduled Student Messages', metadata: { campaignId: campaign.id, ...metadata }
});
const getCampaign = (db, id) => {
  const campaign = db.smsCampaigns.find((item) => item.id === id);
  if (!campaign) fail(404, 'Scheduled message campaign not found');
  return campaign;
};
const replaceRecipients = (db, campaign, input) => {
  db.smsCampaignRecipients = db.smsCampaignRecipients.filter((item) => item.campaignId !== campaign.id);
  const recipients = buildRecipientSnapshot(db, input, campaign.id);
  db.smsCampaignRecipients.push(...recipients);
  campaign.totalRecipients = recipients.length;
  campaign.validRecipients = recipients.filter((item) => item.normalizedPhone).length;
  campaign.invalidRecipients = recipients.length - campaign.validRecipients;
  return recipients;
};

export const getScheduledMessageOptions = async (_req, res) => {
  const db = await readDb();
  const unique = (values) => [...new Set(values.filter(Boolean))].sort();
  sendJson(res, 200, {
    messageTypes: SCHEDULED_MESSAGE_TYPES, placeholders: SUPPORTED_PLACEHOLDERS,
    targetAudiences: ['All students', 'All accepted students', 'All registered students', 'Students in a selected faculty', 'Students in a selected department', 'Students in a selected program', 'Students in a selected class', 'Students in a selected intake', 'Students in a selected academic year', 'Individually selected students'],
    students: db.students.map((item) => ({ id: item.id, fullName: item.fullName, studentNumber: item.studentNumber, mobile: item.mobile, faculty: item.faculty, department: item.department, classId: item.classId, className: item.className, campus: item.campus })),
    faculties: unique(db.students.map((item) => item.faculty)), departments: unique(db.students.map((item) => item.department)),
    classes: db.classes.map((item) => ({ id: item.id, name: item.name, faculty: item.faculty, department: item.department })),
    intakes: unique(db.admissionPeriods.map((item) => item.intakeName)), academicYears: unique(db.admissionPeriods.map((item) => item.academicYear)),
    timezone: 'Africa/Nairobi'
  });
};

export const previewCampaign = async (req, res) => {
  const db = await readDb();
  sendJson(res, 200, previewScheduledMessage(db, req.body || {}));
};

export const listCampaigns = async (req, res) => {
  const db = await readDb(); let items = sortNewest(db.smsCampaigns.filter((item) => !item.archived));
  if (req.query.status) items = items.filter((item) => item.status === req.query.status);
  items = items.filter((item) => matchesText(item, ['title', 'messageType', 'targetAudience', 'createdByName'], req.query.search));
  const today = new Date().toISOString().slice(0, 10);
  const summary = {
    totalCampaigns: db.smsCampaigns.filter((item) => !item.archived).length,
    drafts: db.smsCampaigns.filter((item) => item.status === 'Draft' && !item.archived).length,
    scheduled: db.smsCampaigns.filter((item) => item.status === 'Scheduled' && !item.archived).length,
    sendingToday: db.smsCampaigns.filter((item) => item.scheduledAt?.slice(0, 10) === today && ['Scheduled', 'Processing'].includes(item.status)).length,
    sent: db.smsCampaigns.filter((item) => item.status === 'Sent').length,
    failed: db.smsCampaigns.filter((item) => ['Failed', 'Partially Sent'].includes(item.status)).length,
    totalRecipients: db.smsCampaigns.reduce((sum, item) => sum + Number(item.totalRecipients || 0), 0),
    successful: db.smsCampaigns.reduce((sum, item) => sum + Number(item.successfulCount || 0), 0),
    failedRecipients: db.smsCampaigns.reduce((sum, item) => sum + Number(item.failedCount || 0), 0),
    missingPhone: db.smsCampaigns.reduce((sum, item) => sum + Number(item.invalidRecipients || 0), 0)
  };
  sendJson(res, 200, { ...paginate(items, req.query), summary });
};

export const createCampaign = async (req, res) => {
  const input = req.body || {}; const mode = input.action || 'draft';
  validateCampaignInput(input, { scheduling: mode === 'schedule' });
  const campaign = await updateDb((db) => {
    const now = new Date().toISOString(); const id = createId('smc');
    const item = {
      id, title: input.title.trim(), messageType: input.messageType, messageContent: input.messageContent.trim(),
      targetAudience: input.targetAudience || 'All students', targetFilters: input.targetFilters || {},
      selectedStudentIds: [...new Set(input.selectedStudentIds || [])], scheduledAt: mode === 'schedule' ? input.scheduledAt : null,
      timezone: input.timezone || 'Africa/Nairobi', status: mode === 'schedule' ? 'Scheduled' : 'Draft',
      totalRecipients: 0, validRecipients: 0, invalidRecipients: 0, successfulCount: 0, failedCount: 0, cancelledCount: 0,
      processingStartedAt: null, completedAt: null, cancelledAt: null, cancellationReason: '', archived: false,
      createdBy: req.user.id, createdByName: req.user.name, updatedBy: req.user.id, createdAt: now, updatedAt: now
    };
    db.smsCampaigns.unshift(item); replaceRecipients(db, item, input);
    if (mode === 'schedule' && item.validRecipients === 0) fail(422, 'The campaign has no students with valid phone numbers');
    campaignAction(db, req, item, mode === 'schedule' ? 'Campaign scheduled' : 'Campaign created', '', item.status, { recipients: item.totalRecipients });
    return item;
  });
  sendJson(res, 201, { campaign });
};

export const getCampaignDetails = async (req, res) => {
  const db = await readDb(); const campaign = getCampaign(db, req.params.id);
  const recipients = db.smsCampaignRecipients.filter((item) => item.campaignId === campaign.id);
  sendJson(res, 200, { campaign, recipients });
};

export const updateCampaign = async (req, res) => {
  const campaign = await updateDb((db) => {
    const item = getCampaign(db, req.params.id);
    if (!['Draft', 'Scheduled'].includes(item.status)) fail(409, 'A campaign cannot be edited after processing starts');
    const input = { ...item, ...(req.body || {}) }; validateCampaignInput(input, { scheduling: item.status === 'Scheduled' });
    const before = JSON.stringify(item);
    for (const field of campaignFields) if (req.body[field] !== undefined) item[field] = req.body[field];
    item.updatedBy = req.user.id; item.updatedAt = new Date().toISOString(); replaceRecipients(db, item, input);
    campaignAction(db, req, item, 'Campaign edited', before, JSON.stringify(item)); return item;
  });
  sendJson(res, 200, { campaign });
};

export const scheduleCampaign = async (req, res) => {
  const campaign = await updateDb((db) => {
    const item = getCampaign(db, req.params.id); if (!['Draft', 'Scheduled'].includes(item.status)) fail(409, 'Campaign cannot be scheduled now');
    const scheduledAt = req.body?.scheduledAt || item.scheduledAt; validateCampaignInput({ ...item, scheduledAt }, { scheduling: true });
    if (!item.validRecipients) fail(422, 'The campaign has no students with valid phone numbers');
    const before = item.status; item.scheduledAt = scheduledAt; item.status = 'Scheduled'; item.completedAt = null; item.updatedAt = new Date().toISOString();
    campaignAction(db, req, item, before === 'Scheduled' ? 'Campaign rescheduled' : 'Campaign scheduled', before, item.status, { scheduledAt }); return item;
  });
  sendJson(res, 200, { campaign });
};

export const sendCampaignNow = async (req, res) => {
  const campaign = await updateDb((db) => {
    const item = getCampaign(db, req.params.id); if (!['Draft', 'Scheduled'].includes(item.status)) fail(409, 'Campaign cannot be sent now');
    if (!item.validRecipients) fail(422, 'The campaign has no students with valid phone numbers');
    item.status = 'Scheduled'; item.scheduledAt = new Date().toISOString(); item.updatedAt = item.scheduledAt;
    campaignAction(db, req, item, 'Campaign queued for immediate sending', '', 'Scheduled'); return item;
  });
  setTimeout(() => processCampaign(campaign.id, { force: true }).catch((error) => console.error('Immediate campaign failed safely:', error.message)), 0).unref?.();
  sendJson(res, 202, { campaign });
};

export const cancelCampaign = async (req, res) => {
  const campaign = await updateDb((db) => {
    const item = getCampaign(db, req.params.id); if (!['Draft', 'Scheduled'].includes(item.status)) fail(409, 'Only draft or scheduled campaigns can be cancelled');
    const before = item.status; item.status = 'Cancelled'; item.cancelledAt = new Date().toISOString(); item.cancellationReason = String(req.body?.reason || 'Cancelled by administrator').slice(0, 300); item.updatedAt = item.cancelledAt;
    for (const recipient of db.smsCampaignRecipients.filter((entry) => entry.campaignId === item.id && entry.status === 'PENDING')) recipient.status = 'CANCELLED';
    campaignAction(db, req, item, 'Campaign cancelled', before, item.status, { reason: item.cancellationReason }); return item;
  });
  sendJson(res, 200, { campaign });
};

export const duplicateCampaign = async (req, res) => {
  const campaign = await updateDb((db) => {
    const source = getCampaign(db, req.params.id); const now = new Date().toISOString(); const id = createId('smc');
    const copy = { ...source, id, title: `${source.title} (Copy)`, status: 'Draft', scheduledAt: null, successfulCount: 0, failedCount: 0, cancelledCount: 0, processingStartedAt: null, completedAt: null, cancelledAt: null, cancellationReason: '', archived: false, createdBy: req.user.id, createdByName: req.user.name, updatedBy: req.user.id, createdAt: now, updatedAt: now };
    db.smsCampaigns.unshift(copy);
    const recipients = db.smsCampaignRecipients.filter((item) => item.campaignId === source.id).map((item) => ({ ...item, id: createId('smr'), campaignId: id, status: item.normalizedPhone ? 'PENDING' : 'INVALID', attemptCount: 0, idempotencyKey: `SCHEDULED_SMS:${id}:${item.studentId}`, providerResponse: null, errorMessage: item.normalizedPhone ? null : item.errorMessage, sentAt: null, deliveredAt: null, failedAt: null, createdAt: now, updatedAt: now }));
    db.smsCampaignRecipients.push(...recipients); campaignAction(db, req, copy, 'Campaign duplicated', source.id, id); return copy;
  });
  sendJson(res, 201, { campaign });
};

export const retryFailedRecipients = async (req, res) => {
  const db = await readDb(); const campaign = getCampaign(db, req.params.id);
  if (!['Failed', 'Partially Sent'].includes(campaign.status)) fail(409, 'Only failed campaigns can be retried');
  setTimeout(() => processCampaign(campaign.id, { force: true, retryFailed: true }).catch((error) => console.error('Campaign retry failed safely:', error.message)), 0).unref?.();
  await updateDb((data) => { const item = getCampaign(data, campaign.id); campaignAction(data, req, item, 'Failed recipients retried', item.status, 'Processing'); });
  sendJson(res, 202, { campaign });
};

export const archiveCampaign = async (req, res) => {
  const campaign = await updateDb((db) => { const item = getCampaign(db, req.params.id); if (['Scheduled', 'Processing'].includes(item.status)) fail(409, 'Active campaigns cannot be archived'); item.archived = true; item.updatedAt = new Date().toISOString(); campaignAction(db, req, item, 'Campaign archived'); return item; });
  sendJson(res, 200, { campaign });
};

export const listTemplates = async (_req, res) => { const db = await readDb(); sendJson(res, 200, { data: sortNewest(db.smsTemplates.filter((item) => !item.archived)) }); };
export const createTemplate = async (req, res) => {
  const { name, key, messageType, content, isActive = true } = req.body || {}; validateMessageContent(content);
  if (!name || !/^[A-Z0-9_]{3,60}$/.test(key || '') || !SCHEDULED_MESSAGE_TYPES.includes(messageType)) fail(422, 'Template name, uppercase template key, and valid message type are required');
  const template = await updateDb((db) => { if (db.smsTemplates.some((item) => item.key === key)) fail(409, 'Template key already exists'); const now = new Date().toISOString(); const item = { id: createId('smt'), name: name.trim(), key, messageType, content: content.trim(), supportedPlaceholders: [...new Set([...content.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)].map((match) => match[1]))], isActive: Boolean(isActive), archived: false, createdBy: req.user.id, updatedBy: req.user.id, createdAt: now, updatedAt: now }; db.smsTemplates.unshift(item); addActivity(db, req, { action: 'SMS template created', module: 'Scheduled Student Messages', metadata: { templateId: item.id } }); return item; });
  sendJson(res, 201, { template });
};
export const updateTemplate = async (req, res) => {
  if (req.body?.content) validateMessageContent(req.body.content);
  const template = await updateDb((db) => { const item = db.smsTemplates.find((entry) => entry.id === req.params.id); if (!item) fail(404, 'SMS template not found'); for (const field of ['name', 'messageType', 'content', 'isActive']) if (req.body[field] !== undefined) item[field] = req.body[field]; item.supportedPlaceholders = [...new Set([...item.content.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)].map((match) => match[1]))]; item.updatedBy = req.user.id; item.updatedAt = new Date().toISOString(); addActivity(db, req, { action: 'SMS template edited', module: 'Scheduled Student Messages', metadata: { templateId: item.id } }); return item; });
  sendJson(res, 200, { template });
};
export const archiveTemplate = async (req, res) => {
  const template = await updateDb((db) => { const item = db.smsTemplates.find((entry) => entry.id === req.params.id); if (!item) fail(404, 'SMS template not found'); item.archived = true; item.isActive = false; item.updatedAt = new Date().toISOString(); addActivity(db, req, { action: 'SMS template archived', module: 'Scheduled Student Messages', metadata: { templateId: item.id } }); return item; });
  sendJson(res, 200, { template });
};
