import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendJson, sendNoContent } from '../lib/http.js';
import { matchesText, paginate } from '../lib/query.js';
import { admissionTypes, assertAdmissionOpen, findApplicablePeriod, periodStatuses, syncAdmissionPeriods } from '../services/admissionPeriodService.js';

const boolean = (value, fallback = false) => value === undefined ? fallback : value === true || value === 'true';
const validIso = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const reasonActions = new Set(['close', 'pause', 'cancel', 'reopen', 'extend']);
const audit = (db, req, period, action, previousValues = {}, newValues = {}, reason = '') => db.admissionPeriodActivities.unshift({
  id: createId('apa'), admissionPeriodId: period.id, adminUserId: req.user.id, adminName: req.user.name, action,
  previousValues, newValues, reason, ipAddress: req.socket?.remoteAddress || '', userAgent: req.headers['user-agent'] || '', createdAt: new Date().toISOString()
});

const validate = (body, db, currentId = null) => {
  const name = String(body.name || '').trim();
  const openingDatetime = body.openingDatetime;
  const closingDatetime = body.closingDatetime;
  if (name.length < 3 || name.length > 120) fail(422, 'Registration period name must be between 3 and 120 characters');
  if (!/^\d{4}[-/]\d{4}$/.test(String(body.academicYear || ''))) fail(422, 'Academic year must use YYYY-YYYY format');
  if (!String(body.intakeName || '').trim()) fail(422, 'Intake name is required');
  if (!admissionTypes.has(body.admissionType)) fail(422, 'Admission type is invalid');
  if (!validIso(openingDatetime) || !validIso(closingDatetime)) fail(422, 'Valid opening and closing dates are required');
  if (Date.parse(openingDatetime) >= Date.parse(closingDatetime)) fail(422, 'The closing date must be later than the opening date.');
  if (!periodStatuses.has(body.status || 'Draft')) fail(422, 'Registration period status is invalid');
  const maximumApplications = body.maximumApplications === '' || body.maximumApplications == null ? null : Number(body.maximumApplications);
  if (maximumApplications !== null && (!Number.isInteger(maximumApplications) || maximumApplications < 1)) fail(422, 'Maximum applications must be a positive whole number');
  const overlap = db.admissionPeriods.find((period) => period.id !== currentId && !period.archived && !['Draft', 'Cancelled', 'Closed', 'Expired'].includes(period.status)
    && (period.programId || '') === (body.programId || '') && (period.facultyId || '') === (body.facultyId || '')
    && (period.intakeName || '') === String(body.intakeName).trim()
    && Date.parse(openingDatetime) < Date.parse(period.closingDatetime) && Date.parse(closingDatetime) > Date.parse(period.openingDatetime));
  if (overlap && !boolean(body.allowOverlap)) fail(409, `This period overlaps with ${overlap.name}`);
  return { name, academicYear: String(body.academicYear), intakeName: String(body.intakeName).trim(), admissionType: body.admissionType,
    facultyId: body.facultyId || '', programId: body.programId || '', openingDatetime: new Date(openingDatetime).toISOString(),
    closingDatetime: new Date(closingDatetime).toISOString(), timezone: body.timezone || 'Africa/Nairobi', description: String(body.description || '').trim(),
    applicantInstructions: String(body.applicantInstructions || '').trim(), maximumApplications,
    allowDraftApplications: boolean(body.allowDraftApplications, true), allowApplicationEditing: boolean(body.allowApplicationEditing, true),
    automaticOpen: boolean(body.automaticOpen, true), automaticClose: boolean(body.automaticClose, true),
    sendOpeningNotification: boolean(body.sendOpeningNotification), sendClosingReminder: boolean(body.sendClosingReminder),
    closingReminderPeriod: Number(body.closingReminderPeriod || 24), status: body.status || 'Draft' };
};

export const createPeriod = async (req, res) => {
  const period = await updateDb((db) => { syncAdmissionPeriods(db); const values = validate(req.body || {}, db); const now = new Date().toISOString();
    const item = { id: createId('adp'), ...values, applicationCount: 0, archived: false, version: 1, openedAt: null, openedBy: null,
      closedAt: null, closedBy: null, pausedAt: null, pausedBy: null, pauseReason: '', cancellationReason: '', extensionReason: '',
      createdBy: req.user.id, updatedBy: req.user.id, createdAt: now, updatedAt: now };
    db.admissionPeriods.unshift(item); audit(db, req, item, 'Period created', {}, item); return item; });
  sendJson(res, 201, { period });
};
export const listPeriods = async (req, res) => { const db = await updateDb((data) => { syncAdmissionPeriods(data); return data; });
  let items = db.admissionPeriods.filter((p) => !p.archived); if (req.query.status) items = items.filter((p) => p.status === req.query.status);
  items = items.filter((p) => matchesText(p, ['name', 'academicYear', 'intakeName', 'admissionType', 'facultyId', 'programId'], req.query.search));
  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const enriched = items.map((p) => ({ ...p, applicationCount: db.applications.filter((a) => a.admissionPeriodId === p.id).length,
    createdByName: db.users.find((u) => u.id === p.createdBy)?.name || 'Unknown' }));
  sendJson(res, 200, paginate(enriched, req.query)); };
export const getPeriod = async (req, res) => { const db = await readDb(); const period = db.admissionPeriods.find((p) => p.id === req.params.id); if (!period) fail(404, 'Registration period not found'); sendJson(res, 200, { period }); };
export const updatePeriod = async (req, res) => { const period = await updateDb((db) => { const p = db.admissionPeriods.find((x) => x.id === req.params.id); if (!p) fail(404, 'Registration period not found');
    if (['Closed', 'Expired', 'Cancelled'].includes(p.status)) fail(409, 'Closed, expired, or cancelled periods must be reopened before editing');
    if (req.body.version !== undefined && Number(req.body.version) !== p.version) fail(409, 'This period was changed by another Admin. Refresh and try again.');
    const before = { ...p }; Object.assign(p, validate({ ...p, ...req.body }, db, p.id)); p.version += 1; p.updatedBy = req.user.id; p.updatedAt = new Date().toISOString(); audit(db, req, p, 'Period edited', before, p); return p; }); sendJson(res, 200, { period }); };

const transitions = { open: ['Open', 'Registration opened manually'], close: ['Closed', 'Registration closed manually'], pause: ['Paused', 'Registration paused'],
  resume: ['Open', 'Registration resumed'], reopen: ['Open', 'Registration reopened'], cancel: ['Cancelled', 'Registration cancelled'] };
export const transitionPeriod = async (req, res) => { const action = req.params.action; if (!transitions[action]) fail(404, 'Unknown registration-period action');
  const period = await updateDb((db) => { syncAdmissionPeriods(db); const p = db.admissionPeriods.find((x) => x.id === req.params.id); if (!p) fail(404, 'Registration period not found');
    const reason = String(req.body?.reason || '').trim(); if (reasonActions.has(action) && reason.length < 3) fail(422, 'A reason is required for this action');
    const now = new Date().toISOString(); if (action === 'open' || action === 'resume' || action === 'reopen') { if (now >= p.closingDatetime) fail(422, 'Set a future closing date before opening registration'); }
    if (action === 'pause' && p.status !== 'Open') fail(409, 'Only an open period can be paused'); if (action === 'resume' && p.status !== 'Paused') fail(409, 'Only a paused period can be resumed');
    const before = { status: p.status }; p.status = transitions[action][0]; p.version += 1; p.updatedBy = req.user.id; p.updatedAt = now;
    if (p.status === 'Open') { p.openedAt = now; p.openedBy = req.user.id; } if (p.status === 'Closed') { p.closedAt = now; p.closedBy = req.user.id; }
    if (p.status === 'Paused') { p.pausedAt = now; p.pausedBy = req.user.id; p.pauseReason = reason; } if (p.status === 'Cancelled') p.cancellationReason = reason;
    audit(db, req, p, transitions[action][1], before, { status: p.status }, reason); return p; }); sendJson(res, 200, { period }); };
export const extendPeriod = async (req, res) => { const period = await updateDb((db) => { const p = db.admissionPeriods.find((x) => x.id === req.params.id); if (!p) fail(404, 'Registration period not found');
    const closingDatetime = req.body?.closingDatetime; const reason = String(req.body?.reason || '').trim(); if (!validIso(closingDatetime) || Date.parse(closingDatetime) <= Date.parse(p.closingDatetime)) fail(422, 'New closing date must be later than the current closing date'); if (reason.length < 3) fail(422, 'An extension reason is required');
    const before = p.closingDatetime; p.closingDatetime = new Date(closingDatetime).toISOString(); p.extensionReason = reason; p.version += 1; p.updatedAt = new Date().toISOString(); audit(db, req, p, 'Deadline extended', { closingDatetime: before }, { closingDatetime: p.closingDatetime }, reason); return p; }); sendJson(res, 200, { period }); };
export const deleteDraftPeriod = async (req, res) => { await updateDb((db) => { const index = db.admissionPeriods.findIndex((p) => p.id === req.params.id); if (index < 0) fail(404, 'Registration period not found'); const p = db.admissionPeriods[index];
  if (p.status !== 'Draft' || db.applications.some((a) => a.admissionPeriodId === p.id)) fail(409, 'Only an unused draft period can be permanently deleted'); audit(db, req, p, 'Period deleted', p, {}); db.admissionPeriods.splice(index, 1); }); sendNoContent(res); };
export const archivePeriod = async (req, res) => { const period = await updateDb((db) => { const p = db.admissionPeriods.find((x) => x.id === req.params.id); if (!p) fail(404, 'Registration period not found'); if (['Open', 'Paused', 'Scheduled'].includes(p.status)) fail(409, 'Close or cancel the period before archiving it'); p.archived = true; p.version += 1; p.updatedAt = new Date().toISOString(); audit(db, req, p, 'Period archived', { archived: false }, { archived: true }); return p; }); sendJson(res, 200, { period }); };
export const duplicatePeriod = async (req, res) => { const period = await updateDb((db) => { const source = db.admissionPeriods.find((x) => x.id === req.params.id); if (!source) fail(404, 'Registration period not found'); const now = new Date().toISOString();
  const copy = { ...source, id: createId('adp'), name: `${source.name} Copy`, status: 'Draft', archived: false, version: 1, applicationCount: 0, openedAt: null, openedBy: null, closedAt: null, closedBy: null, pausedAt: null, pausedBy: null, createdBy: req.user.id, updatedBy: req.user.id, createdAt: now, updatedAt: now };
  db.admissionPeriods.unshift(copy); audit(db, req, copy, 'Period duplicated', { sourcePeriodId: source.id }, copy); return copy; }); sendJson(res, 201, { period }); };
export const listPeriodActivity = async (req, res) => { const db = await readDb(); sendJson(res, 200, { data: db.admissionPeriodActivities.filter((a) => a.admissionPeriodId === req.params.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }); };
export const getRegistrationStatus = async (req, res) => { const db = await updateDb((data) => { syncAdmissionPeriods(data); return data; }); const period = findApplicablePeriod(db, req.query);
  sendJson(res, 200, { isOpen: Boolean(period && period.status === 'Open' && new Date().toISOString() >= period.openingDatetime && new Date().toISOString() < period.closingDatetime), status: period?.status || 'Closed', period: period ? { id: period.id, name: period.name, openingDatetime: period.openingDatetime, closingDatetime: period.closingDatetime, timezone: period.timezone, applicantInstructions: period.applicantInstructions } : null }); };
export const assertOpenForApplication = (db, fields) => assertAdmissionOpen(db, { faculty: fields.faculty || fields.program, program: fields.department || fields.programOfStudy, intake: fields.intakeName, admissionType: fields.admissionType });
