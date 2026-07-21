import { createId, readDb, updateDb } from '../lib/db.js';
import { env } from '../config/env.js';
import { fail } from '../lib/http.js';
import { createScheduledSmsNotification, normalizeSomaliPhoneNumber, processSmsNotification } from './smsService.js';

export const SCHEDULED_MESSAGE_TYPES = ['Class Opening', 'Orientation', 'Admission Announcement', 'Registration Reminder', 'Document Reminder', 'Exam Announcement', 'General Announcement', 'Custom Message'];
export const SUPPORTED_PLACEHOLDERS = ['student_name', 'student_id', 'application_number', 'class_name', 'program_name', 'faculty_name', 'department_name', 'intake_name', 'academic_year', 'class_start_date', 'class_start_time', 'campus_location'];
const allowedStatuses = new Set(['Draft', 'Scheduled']);
let campaignWorkerRunning = false;
let campaignScheduler;

const clean = (value) => String(value ?? '').trim();
export const validateMessageContent = (message) => {
  const content = clean(message);
  if (!content || content.length < 3 || content.length > 1000) fail(422, 'SMS message must contain between 3 and 1000 characters');
  const found = [...content.matchAll(/{{\s*([a-zA-Z0-9_]+)\s*}}/g)].map((match) => match[1]);
  const unsupported = [...new Set(found.filter((key) => !SUPPORTED_PLACEHOLDERS.includes(key)))];
  if (unsupported.length) fail(422, 'SMS message contains unsupported placeholders', unsupported);
  return content;
};

const applicationFor = (db, student) => db.applications.find((item) => item.id === student.applicationId) || {};
const classFor = (db, student) => db.classes.find((item) => item.id === student.classId) || {};
const periodFor = (db, application) => db.admissionPeriods.find((item) => item.id === application.admissionPeriodId) || {};
const contextFor = (db, student) => {
  const application = applicationFor(db, student); const classItem = classFor(db, student); const period = periodFor(db, application);
  return {
    student_name: student.fullName, student_id: student.studentNumber, application_number: application.reference,
    class_name: student.className || classItem.name, program_name: student.department,
    faculty_name: student.faculty, department_name: student.department,
    intake_name: period.intakeName || application.intakeName, academic_year: period.academicYear || application.academicYear,
    class_start_date: classItem.startDate, class_start_time: classItem.startTime,
    campus_location: student.campus || classItem.campus
  };
};

export const personalizeMessage = (message, context) => message.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_whole, key) => clean(context[key]));

const audienceStudents = (db, input) => {
  const filters = input.targetFilters || {};
  let students = [...db.students];
  const target = input.targetAudience || 'All students';
  if (target === 'Individually selected students') students = students.filter((item) => (input.selectedStudentIds || []).includes(item.id));
  if (target === 'All registered students') students = students.filter((item) => ['Enrolled', 'Active'].includes(item.status));
  if (target === 'All accepted students') students = students.filter((item) => applicationFor(db, item).status === 'Approved');
  if (filters.faculty) students = students.filter((item) => item.faculty === filters.faculty);
  if (filters.department || filters.program) students = students.filter((item) => item.department === (filters.department || filters.program));
  if (filters.classId) students = students.filter((item) => item.classId === filters.classId);
  if (filters.intake || filters.academicYear) students = students.filter((item) => {
    const application = applicationFor(db, item); const period = periodFor(db, application);
    return (!filters.intake || period.intakeName === filters.intake) && (!filters.academicYear || period.academicYear === filters.academicYear);
  });
  return students;
};

export const buildRecipientSnapshot = (db, input, campaignId = 'preview') => {
  const message = validateMessageContent(input.messageContent);
  const unique = [...new Map(audienceStudents(db, input).map((student) => [student.id, student])).values()];
  return unique.map((student) => {
    let normalizedPhone = null; let errorMessage = null;
    try { normalizedPhone = normalizeSomaliPhoneNumber(student.mobile); } catch (error) { errorMessage = error.message; }
    const context = contextFor(db, student);
    return {
      id: createId('smr'), campaignId, studentId: student.id, recipientName: student.fullName,
      studentNumber: student.studentNumber, recipientPhone: student.mobile || '', normalizedPhone,
      personalizedMessage: personalizeMessage(message, context), classId: student.classId || null,
      className: context.class_name || '', program: context.program_name || '', faculty: context.faculty_name || '',
      department: context.department_name || '', status: normalizedPhone ? 'PENDING' : 'INVALID', attemptCount: 0,
      idempotencyKey: `SCHEDULED_SMS:${campaignId}:${student.id}`, providerResponse: null,
      errorMessage, sentAt: null, deliveredAt: null, failedAt: null,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
  });
};

export const previewScheduledMessage = (db, input) => {
  const recipients = buildRecipientSnapshot(db, input);
  const valid = recipients.filter((item) => item.normalizedPhone);
  return { totalRecipients: recipients.length, validRecipients: valid.length, invalidRecipients: recipients.length - valid.length, recipients };
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const processCampaign = async (campaignId, { force = false, retryFailed = false } = {}) => {
  const work = await updateDb((db) => {
    const campaign = db.smsCampaigns.find((item) => item.id === campaignId && !item.archived);
    if (!campaign || campaign.status === 'Cancelled' || campaign.status === 'Sent') return null;
    if (!force && (campaign.status !== 'Scheduled' || Date.parse(campaign.scheduledAt) > Date.now())) return null;
    if (campaign.status === 'Processing') return null;
    campaign.status = 'Processing'; campaign.processingStartedAt ||= new Date().toISOString(); campaign.updatedAt = new Date().toISOString();
    const candidates = db.smsCampaignRecipients.filter((item) => item.campaignId === campaignId && (retryFailed ? item.status === 'FAILED' : item.status === 'PENDING'));
    const jobs = candidates.map((recipient) => {
      if (retryFailed) { recipient.status = 'PENDING'; recipient.errorMessage = null; }
      const notification = createScheduledSmsNotification(db, campaign, recipient);
      return { notificationId: notification.id };
    });
    return { jobs };
  });
  if (!work) return null;
  for (let index = 0; index < work.jobs.length; index += env.smsBatchSize) {
    const batch = work.jobs.slice(index, index + env.smsBatchSize);
    await Promise.all(batch.map((job) => processSmsNotification(job.notificationId, { force: retryFailed })));
    if (index + env.smsBatchSize < work.jobs.length && env.smsBatchDelayMs) await wait(env.smsBatchDelayMs);
  }
  return updateDb((db) => {
    const campaign = db.smsCampaigns.find((item) => item.id === campaignId);
    const recipients = db.smsCampaignRecipients.filter((item) => item.campaignId === campaignId);
    const actionable = recipients.filter((item) => item.status !== 'INVALID');
    campaign.successfulCount = actionable.filter((item) => ['SENT', 'DELIVERED'].includes(item.status)).length;
    campaign.failedCount = actionable.filter((item) => item.status === 'FAILED').length;
    const pending = actionable.filter((item) => ['PENDING', 'PROCESSING'].includes(item.status)).length;
    if (!pending) campaign.status = campaign.successfulCount && campaign.failedCount ? 'Partially Sent' : campaign.successfulCount ? 'Sent' : 'Failed';
    campaign.completedAt = pending ? null : new Date().toISOString(); campaign.updatedAt = new Date().toISOString();
    return campaign;
  });
};

export const processDueCampaigns = async () => {
  if (campaignWorkerRunning || !env.smsEnabled) return;
  campaignWorkerRunning = true;
  try {
    const db = await readDb(); const now = Date.now();
    const due = db.smsCampaigns.filter((item) => item.status === 'Scheduled' && Date.parse(item.scheduledAt) <= now && !item.archived);
    for (const campaign of due.slice(0, 10)) await processCampaign(campaign.id);
  } finally { campaignWorkerRunning = false; }
};

export const startScheduledMessageScheduler = (intervalMs = env.smsSchedulerMs) => {
  if (campaignScheduler) return campaignScheduler;
  processDueCampaigns().catch((error) => console.error('Scheduled message worker failed safely:', error.message));
  campaignScheduler = setInterval(() => processDueCampaigns().catch((error) => console.error('Scheduled message worker failed safely:', error.message)), intervalMs);
  campaignScheduler.unref?.();
  return campaignScheduler;
};

export const validateCampaignInput = (input, { scheduling = false } = {}) => {
  if (!clean(input.title) || clean(input.title).length > 120) fail(422, 'Message title is required and must not exceed 120 characters');
  if (!SCHEDULED_MESSAGE_TYPES.includes(input.messageType)) fail(422, 'Message type is invalid');
  validateMessageContent(input.messageContent);
  if (scheduling) {
    if (!input.scheduledAt || !Number.isFinite(Date.parse(input.scheduledAt))) fail(422, 'A valid scheduled date and time is required');
    if (Date.parse(input.scheduledAt) <= Date.now()) fail(422, 'Scheduled date and time must be in the future');
  }
  if (input.status && !allowedStatuses.has(input.status)) fail(422, 'Campaign status is invalid');
};
