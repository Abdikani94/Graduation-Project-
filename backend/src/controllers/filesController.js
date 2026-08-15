import fs from 'node:fs/promises';
import path from 'node:path';
import { createId, readDb, updateDb } from '../lib/db.js';
import { env } from '../config/env.js';
import { fail, sendJson, sendNoContent } from '../lib/http.js';
import { matchesText, paginate } from '../lib/query.js';
import { checkRateLimit } from '../lib/rateLimit.js';

const extensions = new Map([
  ['.pdf', ['application/pdf']], ['.doc', ['application/msword']],
  ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream']],
  ['.xls', ['application/vnd.ms-excel']],
  ['.xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream']],
  ['.csv', ['text/csv', 'application/vnd.ms-excel', 'text/plain']],
  ['.ppt', ['application/vnd.ms-powerpoint']],
  ['.pptx', ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/octet-stream']],
  ['.txt', ['text/plain']], ['.jpg', ['image/jpeg']], ['.jpeg', ['image/jpeg']],
  ['.png', ['image/png']], ['.zip', ['application/zip', 'application/x-zip-compressed', 'application/octet-stream']]
]);
const reportTypes = new Set(['Daily Report', 'Monthly Report', 'General File']);
const visibilities = new Set(['Private', 'All Users', 'Selected Users', 'Selected Team', 'Selected Department', 'Admin Only']);
const approvalStatuses = new Set(['Pending', 'Approved', 'Rejected', 'Revision Requested']);
const previewExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.txt']);
const maxTitleLength = 120;
const maxDescriptionLength = 2000;
const maxCategoryLength = 80;
const maxTags = 20;
const maxTagLength = 40;
const universityCampuses = ['Main Campus', 'Campus 2', 'Campus 3'];
const fileCategories = ['Reports', 'Admissions', 'Academic', 'Finance', 'Administration', 'Operations', 'Human Resources', 'Other'];

const isAdmin = (user) => user.role === 'Admin';
const asArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [String(parsed)];
  } catch {
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
  }
};
const asBoolean = (value) => value === true || value === 'true';
const safeOriginalName = (name = 'file') => path.basename(name).replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '_').slice(0, 180);
const storedPathFor = (storedName) => path.resolve(env.fileStorageDir, storedName);
const publicFile = (file, db) => ({
  ...file,
  filePath: undefined,
  storedFileName: undefined,
  uploader: db.users.find((item) => item.id === file.uploadedBy)
    ? { id: file.uploadedBy, name: db.users.find((item) => item.id === file.uploadedBy).name }
    : { id: file.uploadedBy, name: 'Unknown user' },
  canPreview: previewExtensions.has(file.fileExtension)
});

const canAccess = (file, user, db) => {
  if (isAdmin(user) || file.uploadedBy === user.id) return true;
  if (file.visibility === 'All Users') return true;
  if (file.visibility === 'Admin Only' || file.visibility === 'Private') return false;
  const shares = db.fileShares.filter((share) => share.fileId === file.id);
  return shares.some((share) => share.sharedWithAllUsers
    || share.sharedWithUserId === user.id
    || (share.sharedWithTeamId && share.sharedWithTeamId === user.team)
    || (share.sharedWithDepartmentId && share.sharedWithDepartmentId === user.department));
};

const findAccessible = (db, id, user) => {
  const file = db.files.find((item) => item.id === id);
  if (!file || !canAccess(file, user, db)) fail(404, 'File not found or access is not permitted');
  return file;
};

const addFileActivity = (db, req, file, action, details = '') => {
  db.fileActivities.unshift({
    id: createId('fact'), fileId: file.id, userId: req.user.id, action,
    actionDetails: details, ipAddress: req.socket?.remoteAddress || '',
    userAgent: req.headers['user-agent'] || '', createdAt: new Date().toISOString()
  });
};

const notify = (db, userIds, file, title, message) => {
  const now = new Date().toISOString();
  for (const userId of new Set(userIds.filter(Boolean))) {
    db.notifications.unshift({ id: createId('not'), userId, fileId: file.id, title, message, read: false, createdAt: now });
  }
};

const validateUpload = (upload) => {
  if (!upload) fail(422, 'A file attachment is required');
  const extension = path.extname(upload.filename || '').toLowerCase();
  if (!extensions.has(extension)) fail(422, `Unsupported file type. Allowed: ${[...extensions.keys()].join(', ')}`);
  if (!extensions.get(extension).includes(upload.contentType)) fail(422, 'The file content type does not match its extension');
  if (upload.size > env.maxStoredFileBytes) fail(413, `File exceeds the ${Math.round(env.maxStoredFileBytes / 1024 / 1024)} MB limit`);
  if (!upload.size) fail(422, 'The uploaded file is empty');
  const startsWith = (signature) => upload.buffer.subarray(0, signature.length).equals(Buffer.from(signature));
  const isZip = startsWith([0x50, 0x4b, 0x03, 0x04]) || startsWith([0x50, 0x4b, 0x05, 0x06]) || startsWith([0x50, 0x4b, 0x07, 0x08]);
  const isLegacyOffice = startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (extension === '.pdf' && upload.buffer.subarray(0, 5).toString() !== '%PDF-') fail(422, 'The PDF file content is invalid');
  if ((extension === '.jpg' || extension === '.jpeg') && !startsWith([0xff, 0xd8, 0xff])) fail(422, 'The JPEG file content is invalid');
  if (extension === '.png' && !startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) fail(422, 'The PNG file content is invalid');
  if (['.zip', '.docx', '.xlsx', '.pptx'].includes(extension) && !isZip) fail(422, 'The compressed or Office file content is invalid');
  if (['.doc', '.xls', '.ppt'].includes(extension) && !isLegacyOffice) fail(422, 'The legacy Office file content is invalid');
  if (['.txt', '.csv'].includes(extension)) {
    if (upload.buffer.includes(0) || !upload.buffer.toString('utf8').trim()) fail(422, 'Text and CSV files cannot be blank or contain binary data');
  }
  return extension;
};

const validateMetadata = (body) => {
  const title = body.title?.trim() || '';
  const category = body.category?.trim() || '';
  const description = body.description?.trim() || '';
  const tags = asArray(body.tags);
  if (title.length < 3 || title.length > maxTitleLength) fail(422, `File title must be between 3 and ${maxTitleLength} characters`);
  if (!category || category.length > maxCategoryLength) fail(422, `File category is required and cannot exceed ${maxCategoryLength} characters`);
  if (!fileCategories.includes(category)) fail(422, 'File category is invalid');
  if (description.length > maxDescriptionLength) fail(422, `Description cannot exceed ${maxDescriptionLength} characters`);
  if (tags.length > maxTags || tags.some((tag) => String(tag).length > maxTagLength)) fail(422, `Use no more than ${maxTags} tags, with ${maxTagLength} characters per tag`);
  if (!reportTypes.has(body.reportType)) fail(422, 'Report type is invalid');
  if (!visibilities.has(body.visibility)) fail(422, 'Visibility is invalid');
  const today = new Date().toISOString().slice(0, 10);
  if (body.reportType === 'Daily Report') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.reportDate || '') || Number.isNaN(Date.parse(`${body.reportDate}T00:00:00Z`))) fail(422, 'A valid report date is required for daily reports');
    if (body.reportDate > today) fail(422, 'Daily report date cannot be in the future');
  }
  if (body.reportType === 'Monthly Report') {
    const month = Number(body.reportingMonth); const year = Number(body.reportingYear); const now = new Date();
    if (!Number.isInteger(month) || month < 1 || month > 12) fail(422, 'Reporting month must be between 1 and 12');
    if (!Number.isInteger(year) || year < 2000 || year > now.getUTCFullYear()) fail(422, 'Reporting year is invalid or in the future');
    if (year === now.getUTCFullYear() && month > now.getUTCMonth() + 1) fail(422, 'Monthly report period cannot be in the future');
  }
  if (body.expiryDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.expiryDate) || Number.isNaN(Date.parse(`${body.expiryDate}T00:00:00Z`))) fail(422, 'Expiry date is invalid');
    if (body.expiryDate <= today) fail(422, 'Expiry date must be after today');
  }
  const sharing = sharingFromBody(body);
  if (body.visibility === 'Selected Users' && sharing.users.length === 0) fail(422, 'Select at least one user');
  if (body.visibility === 'Selected Team' && sharing.teams.length === 0) fail(422, 'Select a team');
  if (body.visibility === 'Selected Department' && sharing.departments.length === 0) fail(422, 'Select a department');
  return { title, category, description, tags, sharing };
};

const sharingFromBody = (body) => ({
  users: asArray(body.selectedUsers), teams: asArray(body.selectedTeams || body.selectedTeam),
  departments: asArray(body.selectedDepartments || body.selectedDepartment)
});

const replaceShares = (db, req, file, sharing) => {
  db.fileShares = db.fileShares.filter((share) => share.fileId !== file.id);
  const common = { fileId: file.id, sharedBy: req.user.id, createdAt: new Date().toISOString() };
  if (file.visibility === 'All Users') db.fileShares.push({ id: createId('shr'), ...common, sharedWithAllUsers: true });
  for (const id of sharing.users) db.fileShares.push({ id: createId('shr'), ...common, sharedWithUserId: id });
  for (const id of sharing.teams) db.fileShares.push({ id: createId('shr'), ...common, sharedWithTeamId: id });
  for (const id of sharing.departments) db.fileShares.push({ id: createId('shr'), ...common, sharedWithDepartmentId: id });
  notify(db, sharing.users, file, 'New file shared with you', `${file.title} was shared by ${req.user.name}.`);
};

export const uploadFile = async (req, res) => {
  const uploadKey = `file-upload:${req.user.id}:${req.socket?.remoteAddress || 'unknown'}`;
  if (!checkRateLimit(uploadKey, { max: 30, windowMs: 60 * 60 * 1000 })) fail(429, 'Too many file uploads. Please try again later.');
  const body = req.body?.fields || req.body || {};
  const upload = req.body?.files?.find((item) => item.fieldName === 'file');
  const extension = validateUpload(upload);
  const validated = validateMetadata(body);

  await fs.mkdir(env.fileStorageDir, { recursive: true });
  const storedFileName = `${createId('file')}${extension}`;
  const filePath = storedPathFor(storedFileName);
  await fs.writeFile(filePath, upload.buffer);

  try {
    const file = await updateDb((db) => {
      const duplicate = db.files.find((item) => !item.isArchived && item.uploadedBy === req.user.id && item.reportType === body.reportType
        && ((body.reportType === 'Daily Report' && item.reportDate === body.reportDate)
          || (body.reportType === 'Monthly Report' && item.reportingMonth === body.reportingMonth && String(item.reportingYear) === String(body.reportingYear))));
      if (duplicate && !(isAdmin(req.user) && asBoolean(body.allowMultiple))) {
        fail(409, 'A report already exists for this period. Replace the existing report instead.');
      }
      const now = new Date().toISOString();
      const approvalRequired = isAdmin(req.user) ? asBoolean(body.approvalRequired) : body.approvalRequired !== 'false';
      const item = {
        id: createId('fil'), title: validated.title, originalFileName: safeOriginalName(upload.filename), storedFileName,
        filePath, fileExtension: extension, mimeType: upload.contentType, fileSize: upload.size,
        reportType: body.reportType, reportDate: body.reportDate || null, reportingMonth: body.reportingMonth || null,
        reportingYear: body.reportingYear ? Number(body.reportingYear) : null, description: validated.description,
        category: validated.category, tags: validated.tags, visibility: body.visibility,
        approvalStatus: approvalRequired ? 'Pending' : 'Approved', approvalRequired, adminComment: '',
        uploadedBy: req.user.id, teamId: body.teamId || req.user.team || '', departmentId: body.departmentId || req.user.department || '',
        downloadCount: 0, viewCount: 0, expiryDate: body.expiryDate || null, isArchived: false, createdAt: now, updatedAt: now
      };
      db.files.unshift(item);
      const knownUserIds = new Set(db.users.map((user) => user.id));
      if (validated.sharing.users.some((id) => !knownUserIds.has(id))) fail(422, 'One or more selected users are invalid');
      replaceShares(db, req, item, validated.sharing);
      addFileActivity(db, req, item, 'File uploaded');
      return publicFile(item, db);
    });
    sendJson(res, 201, { file });
  } catch (error) {
    await fs.unlink(filePath).catch(() => undefined);
    throw error;
  }
};

export const listFiles = async (req, res) => {
  const db = await readDb();
  let items = db.files.filter((item) => canAccess(item, req.user, db));
  const { tab, search, reportType, status, visibility, extension, userId, team, department, sort = 'newest' } = req.query;
  if (tab === 'daily') items = items.filter((item) => item.reportType === 'Daily Report' && !item.isArchived);
  else if (tab === 'monthly') items = items.filter((item) => item.reportType === 'Monthly Report' && !item.isArchived);
  else if (tab === 'shared') items = items.filter((item) => item.uploadedBy !== req.user.id && !item.isArchived);
  else if (tab === 'mine') items = items.filter((item) => item.uploadedBy === req.user.id && !item.isArchived);
  else if (tab === 'pending') items = items.filter((item) => item.approvalStatus === 'Pending' && !item.isArchived);
  else if (tab === 'archived') items = items.filter((item) => item.isArchived);
  else items = items.filter((item) => !item.isArchived);
  if (reportType) items = items.filter((item) => item.reportType === reportType);
  if (status) items = items.filter((item) => item.approvalStatus === status);
  if (visibility) items = items.filter((item) => item.visibility === visibility);
  if (extension) items = items.filter((item) => item.fileExtension === extension);
  if (userId && isAdmin(req.user)) items = items.filter((item) => item.uploadedBy === userId);
  if (team) items = items.filter((item) => item.teamId === team);
  if (department) items = items.filter((item) => item.departmentId === department);
  items = items.filter((item) => matchesText(item, ['title', 'originalFileName', 'description', 'category', 'tags'], search));
  items.sort((a, b) => sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt)
    : sort === 'name' ? a.title.localeCompare(b.title)
      : sort === 'size' ? b.fileSize - a.fileSize
        : sort === 'downloads' ? b.downloadCount - a.downloadCount : b.createdAt.localeCompare(a.createdAt));
  sendJson(res, 200, { ...paginate(items.map((item) => publicFile(item, db)), req.query) });
};

export const getFileStats = async (req, res) => {
  const db = await readDb();
  const accessible = db.files.filter((item) => canAccess(item, req.user, db));
  const active = accessible.filter((item) => !item.isArchived);
  sendJson(res, 200, { stats: {
    totalFiles: active.length, dailyReports: active.filter((item) => item.reportType === 'Daily Report').length,
    monthlyReports: active.filter((item) => item.reportType === 'Monthly Report').length,
    sharedWithMe: active.filter((item) => item.uploadedBy !== req.user.id).length,
    pendingApproval: active.filter((item) => item.approvalStatus === 'Pending').length,
    storageUsed: active.reduce((sum, item) => sum + item.fileSize, 0),
    totalUserUploads: isAdmin(req.user) ? active.filter((item) => item.uploadedBy !== req.user.id).length : undefined,
    approvedFiles: isAdmin(req.user) ? active.filter((item) => item.approvalStatus === 'Approved').length : undefined,
    rejectedFiles: isAdmin(req.user) ? active.filter((item) => item.approvalStatus === 'Rejected').length : undefined
  }});
};

export const getFile = async (req, res) => {
  const db = await readDb();
  const file = findAccessible(db, req.params.id, req.user);
  sendJson(res, 200, { file: publicFile(file, db), shares: db.fileShares.filter((item) => item.fileId === file.id) });
};

const sendFileContent = async (req, res, download) => {
  const file = await updateDb(async (db) => {
    const found = findAccessible(db, req.params.id, req.user);
    if (!download && !previewExtensions.has(found.fileExtension)) fail(422, 'Preview is not supported for this file type');
    if (download) found.downloadCount += 1; else found.viewCount += 1;
    addFileActivity(db, req, found, download ? 'File downloaded' : 'File viewed');
    return { ...found };
  });
  const data = await fs.readFile(storedPathFor(path.basename(file.storedFileName)));
  res.statusCode = 200;
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', data.length);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${safeOriginalName(file.originalFileName)}"`);
  res.end(data);
};
export const previewFile = (req, res) => sendFileContent(req, res, false);
export const downloadFile = (req, res) => sendFileContent(req, res, true);

export const updateFile = async (req, res) => {
  const file = await updateDb((db) => {
    const found = findAccessible(db, req.params.id, req.user);
    if (!isAdmin(req.user) && found.uploadedBy !== req.user.id) fail(403, 'Only the owner or Admin can edit this file');
    const nextTitle = req.body?.title === undefined ? found.title : String(req.body.title).trim();
    const nextDescription = req.body?.description === undefined ? found.description : String(req.body.description).trim();
    const nextCategory = req.body?.category === undefined ? found.category : String(req.body.category).trim();
    const nextTags = req.body?.tags === undefined ? found.tags : asArray(req.body.tags);
    if (nextTitle.length < 3 || nextTitle.length > maxTitleLength) fail(422, `File title must be between 3 and ${maxTitleLength} characters`);
    if (!nextCategory || nextCategory.length > maxCategoryLength) fail(422, `File category is required and cannot exceed ${maxCategoryLength} characters`);
    if (!fileCategories.includes(nextCategory)) fail(422, 'File category is invalid');
    if (nextDescription.length > maxDescriptionLength) fail(422, `Description cannot exceed ${maxDescriptionLength} characters`);
    if (nextTags.length > maxTags || nextTags.some((tag) => String(tag).length > maxTagLength)) fail(422, `Use no more than ${maxTags} tags, with ${maxTagLength} characters per tag`);
    for (const key of ['title', 'description', 'category', 'reportDate', 'reportingMonth', 'reportingYear', 'expiryDate']) {
      if (req.body?.[key] !== undefined) found[key] = req.body[key];
    }
    found.title = nextTitle; found.description = nextDescription; found.category = nextCategory; found.tags = nextTags;
    found.updatedAt = new Date().toISOString();
    addFileActivity(db, req, found, 'File details updated');
    return publicFile(found, db);
  });
  sendJson(res, 200, { file });
};

export const replaceFile = async (req, res) => {
  const upload = req.body?.files?.find((item) => item.fieldName === 'file');
  const extension = validateUpload(upload);
  const storedFileName = `${createId('file')}${extension}`;
  await fs.mkdir(env.fileStorageDir, { recursive: true });
  await fs.writeFile(storedPathFor(storedFileName), upload.buffer);
  let oldStoredName;
  try {
    const file = await updateDb((db) => {
      const found = findAccessible(db, req.params.id, req.user);
      if (!isAdmin(req.user) && found.uploadedBy !== req.user.id) fail(403, 'Only the owner or Admin can replace this file');
      oldStoredName = found.storedFileName;
      Object.assign(found, { originalFileName: safeOriginalName(upload.filename), storedFileName,
        filePath: storedPathFor(storedFileName), fileExtension: extension, mimeType: upload.contentType,
        fileSize: upload.size, approvalStatus: found.approvalRequired ? 'Pending' : found.approvalStatus,
        updatedAt: new Date().toISOString() });
      addFileActivity(db, req, found, 'File replaced');
      notify(db, [found.uploadedBy], found, 'File replaced', `${found.title} has been replaced.`);
      return publicFile(found, db);
    });
    if (oldStoredName) await fs.unlink(storedPathFor(path.basename(oldStoredName))).catch(() => undefined);
    sendJson(res, 200, { file });
  } catch (error) {
    await fs.unlink(storedPathFor(storedFileName)).catch(() => undefined);
    throw error;
  }
};

export const archiveFile = async (req, res) => {
  const file = await updateDb((db) => {
    const found = findAccessible(db, req.params.id, req.user);
    if (!isAdmin(req.user) && found.uploadedBy !== req.user.id) fail(403, 'Only the owner or Admin can archive this file');
    found.isArchived = req.body?.archived !== false;
    found.updatedAt = new Date().toISOString();
    addFileActivity(db, req, found, found.isArchived ? 'File archived' : 'File restored');
    return publicFile(found, db);
  });
  sendJson(res, 200, { file });
};

export const deleteFile = async (req, res) => {
  let storedName;
  await updateDb((db) => {
    const index = db.files.findIndex((item) => item.id === req.params.id);
    const found = index === -1 ? null : db.files[index];
    if (!found || !canAccess(found, req.user, db)) fail(404, 'File not found');
    if (!isAdmin(req.user) && found.uploadedBy !== req.user.id) fail(403, 'Only the owner or Admin can delete this file');
    storedName = found.storedFileName;
    addFileActivity(db, req, found, 'File deleted');
    db.files.splice(index, 1);
    db.fileShares = db.fileShares.filter((item) => item.fileId !== found.id);
  });
  if (storedName) await fs.unlink(storedPathFor(path.basename(storedName))).catch(() => undefined);
  sendNoContent(res);
};

export const shareFile = async (req, res) => {
  const file = await updateDb((db) => {
    const found = findAccessible(db, req.params.id, req.user);
    if (!isAdmin(req.user) && found.uploadedBy !== req.user.id) fail(403, 'Only the owner or Admin can share this file');
    if (req.body?.visibility && !visibilities.has(req.body.visibility)) fail(422, 'Visibility is invalid');
    if (req.body?.visibility) found.visibility = req.body.visibility;
    const sharing = sharingFromBody(req.body || {});
    if (found.visibility === 'Selected Users' && sharing.users.length === 0) fail(422, 'Select at least one user');
    if (found.visibility === 'Selected Team' && sharing.teams.length === 0) fail(422, 'Select a team');
    if (found.visibility === 'Selected Department' && sharing.departments.length === 0) fail(422, 'Select a department');
    const knownUserIds = new Set(db.users.map((user) => user.id));
    if (sharing.users.some((id) => !knownUserIds.has(id))) fail(422, 'One or more selected users are invalid');
    replaceShares(db, req, found, sharing);
    found.updatedAt = new Date().toISOString();
    addFileActivity(db, req, found, 'File shared');
    return publicFile(found, db);
  });
  sendJson(res, 200, { file });
};

export const reviewFile = async (req, res) => {
  if (!isAdmin(req.user)) fail(403, 'Only Admin can review files');
  if (!approvalStatuses.has(req.body?.status) || req.body.status === 'Pending') fail(422, 'Review status is invalid');
  const file = await updateDb((db) => {
    const found = db.files.find((item) => item.id === req.params.id);
    if (!found) fail(404, 'File not found');
    found.approvalStatus = req.body.status;
    found.adminComment = req.body.adminComment?.trim() || '';
    found.updatedAt = new Date().toISOString();
    addFileActivity(db, req, found, req.body.status === 'Approved' ? 'File approved' : req.body.status === 'Rejected' ? 'File rejected' : 'Revision requested', found.adminComment);
    notify(db, [found.uploadedBy], found, `File ${req.body.status}`, found.adminComment || `${found.title} is now ${req.body.status}.`);
    return publicFile(found, db);
  });
  sendJson(res, 200, { file });
};

export const listFileActivities = async (req, res) => {
  const db = await readDb();
  const file = findAccessible(db, req.params.id, req.user);
  if (!isAdmin(req.user) && file.uploadedBy !== req.user.id) fail(403, 'Activity history is available only to the owner or Admin');
  const activities = db.fileActivities.filter((item) => item.fileId === file.id)
    .map((item) => ({ ...item, userName: db.users.find((user) => user.id === item.userId)?.name || 'Unknown user' }));
  sendJson(res, 200, { data: activities });
};

export const listFileOptions = async (req, res) => {
  const db = await readDb();
  const programDepartments = db.programs.flatMap((program) => program.departments || []).map((department) => department.name);
  const userDepartments = db.users.map((user) => user.department).filter(Boolean);
  sendJson(res, 200, {
    users: db.users.map((user) => ({ id: user.id, name: user.name, role: user.role, team: user.team || user.campus || '', department: user.department || '' })),
    campuses: universityCampuses,
    categories: fileCategories,
    teams: [...new Set([...universityCampuses, ...db.users.map((user) => user.team).filter(Boolean)])],
    departments: [...new Set([...programDepartments, ...userDepartments].filter(Boolean))].sort((a, b) => a.localeCompare(b))
  });
};

export const listFileNotifications = async (req, res) => {
  const db = await readDb();
  const notifications = db.notifications.filter((item) => item.userId === req.user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  sendJson(res, 200, { data: notifications.slice(0, 30), unread: notifications.filter((item) => !item.read).length });
};

export const markFileNotificationRead = async (req, res) => {
  const notification = await updateDb((db) => {
    const found = db.notifications.find((item) => item.id === req.params.id && item.userId === req.user.id);
    if (!found) fail(404, 'Notification not found');
    found.read = true;
    found.readAt = new Date().toISOString();
    return found;
  });
  sendJson(res, 200, { notification });
};
