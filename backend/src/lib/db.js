import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { createSeedData } from '../data/seed-data.js';
import { hashPassword } from './crypto.js';
import { admissionFee } from '../config/admissionFee.js';
import { ensureDepartmentCodes } from '../utils/departmentCodes.js';
import { CLASS_CAPACITY } from '../config/classConfig.js';

const collections = [
  'users', 'programs', 'applications', 'students', 'payments', 'contactMessages', 'activities', 'classes',
  'files', 'fileShares', 'fileActivities', 'notifications', 'smsNotifications', 'smsCampaigns', 'smsCampaignRecipients', 'smsTemplates', 'admissionPeriods', 'admissionPeriodActivities'
];
const admissionPeriodPermissions = ['admission_period.view', 'admission_period.create', 'admission_period.update', 'admission_period.open', 'admission_period.close', 'admission_period.pause', 'admission_period.resume', 'admission_period.extend', 'admission_period.reopen', 'admission_period.cancel', 'admission_period.archive', 'admission_period.view_audit_log'];
const scheduledMessagePermissions = ['scheduled_message.view', 'scheduled_message.create', 'scheduled_message.update', 'scheduled_message.schedule', 'scheduled_message.send_now', 'scheduled_message.cancel', 'scheduled_message.retry', 'scheduled_message.view_results', 'scheduled_message.manage_templates'];
const studentSearchPermissions = ['student_search.view', 'student_search.view_contact', 'student_search.view_emergency_contact', 'student_search.view_academic', 'student_search.view_payment_summary', 'student_search.view_full_profile'];
// Student Search is read-only. Authorized Officers may view the complete
// profile, while inStaffScope still restricts which student records they can
// search by campus and department.
const staffStudentSearchPermissions = studentSearchPermissions;
const defaultSettings = {
  universityName: 'Jamhuriya University',
  supportEmail: 'support@jamhuriya.edu.so',
  admissionsSemester: 'Fall 2026',
  currency: 'USD',
  twoFactorRequired: true,
  notifications: {
    newAdmissions: true,
    paymentSuccess: true,
    weeklyReports: false
  }
};
let mysqlPool;
let updateQueue = Promise.resolve();
const protectedCollections = ['users', 'applications', 'students', 'payments', 'classes'];

const ensureDirectory = async (filePath) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

export const createId = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

const usesMysql = () => env.dbDriver === 'mysql';

const mysqlTableNames = {
  users: 'users',
  programs: 'programs',
  applications: 'applications',
  students: 'students',
  payments: 'payments',
  contactMessages: 'contact_messages',
  activities: 'activities',
  classes: 'classes',
  files: 'files',
  fileShares: 'file_shares',
  fileActivities: 'file_activities',
  notifications: 'notifications',
  smsNotifications: 'sms_notifications',
  smsCampaigns: 'sms_campaigns',
  smsCampaignRecipients: 'sms_campaign_recipients',
  smsTemplates: 'sms_templates',
  admissionPeriods: 'admission_periods',
  admissionPeriodActivities: 'admission_period_activities'
};

const getMysqlPool = () => {
  if (mysqlPool) return mysqlPool;
  mysqlPool = mysql.createPool({
    host: env.mysqlHost,
    port: env.mysqlPort,
    user: env.mysqlUser,
    password: env.mysqlPassword,
    database: env.mysqlDatabase,
    waitForConnections: true,
    connectionLimit: env.mysqlConnectionLimit,
    charset: 'utf8mb4'
  });
  return mysqlPool;
};

const jsonBackupFile = () => `${env.dbFile}.bak`;

const normalizeData = (data = {}) => {
  const normalized = data && typeof data === 'object' ? data : {};
  normalized.meta = normalized.meta && typeof normalized.meta === 'object' ? normalized.meta : {};
  normalized.settings = {
    ...defaultSettings,
    ...(normalized.settings && typeof normalized.settings === 'object' ? normalized.settings : {}),
    notifications: {
      ...defaultSettings.notifications,
      ...(normalized.settings?.notifications && typeof normalized.settings.notifications === 'object'
        ? normalized.settings.notifications
        : {})
    }
  };
  for (const collection of collections) {
    if (!Array.isArray(normalized[collection])) normalized[collection] = [];
  }
  for (const contact of normalized.contactMessages) {
    contact.response = contact.response || '';
    contact.emailStatus = contact.emailStatus || 'NotSent';
    // Legacy records could be marked Resolved without any reply being sent.
    // Under the email-reply workflow only a confirmed delivery may resolve one.
    if (contact.status === 'Resolved' && (contact.emailStatus !== 'Sent' || !contact.response)) {
      contact.status = 'Pending';
    }
  }
  ensureDepartmentCodes(normalized.programs);
  const departmentByName = new Map();
  const departmentById = new Map();
  for (const program of normalized.programs) {
    for (const department of program.departments || []) {
      const selection = { program, department };
      departmentByName.set(`${program.title}\u0000${department.name}`, selection);
      departmentById.set(department.id, selection);
    }
  }

  // Canonicalize legacy class records from their department metadata. Class
  // codes are never parsed to discover the sequence because a code such as
  // CA2623 is ambiguous (2026/23 vs malformed legacy data). Instead, classes
  // are grouped by department and academic year and numbered consecutively.
  const classGroups = new Map();
  const ungroupedClasses = [];
  for (const classItem of normalized.classes) {
    const selection = departmentById.get(classItem.departmentId)
      || departmentByName.get(`${classItem.faculty}\u0000${classItem.department}`);
    if (selection) {
      classItem.facultyId = selection.program.id;
      classItem.departmentId = selection.department.id;
      classItem.faculty = selection.program.title;
      classItem.department = selection.department.name;
    }
    classItem.capacity = CLASS_CAPACITY;
    classItem.academicYear = Number(classItem.academicYear)
      || new Date(classItem.createdAt || Date.now()).getFullYear();
    if (selection) {
      const key = `${selection.department.id}\u0000${classItem.academicYear}`;
      if (!classGroups.has(key)) classGroups.set(key, { selection, classes: [] });
      classGroups.get(key).classes.push(classItem);
    } else {
      ungroupedClasses.push(classItem);
    }
  }
  const usedClassCodes = new Set();
  for (const { selection, classes: groupedClasses } of classGroups.values()) {
    groupedClasses.sort((a, b) => {
      const created = String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
      return created || String(a.id || '').localeCompare(String(b.id || ''));
    });
    groupedClasses.forEach((classItem, index) => {
      const sequenceNumber = index + 1;
      const yearShort = String(classItem.academicYear).slice(-2);
      classItem.sequenceNumber = sequenceNumber;
      classItem.classCode = `${selection.department.code}${yearShort}${sequenceNumber}`;
      classItem.name = classItem.classCode;
      usedClassCodes.add(classItem.classCode);
    });
  }
  for (const classItem of ungroupedClasses) {
    const baseCode = String(classItem.classCode || classItem.name || `CLASS${classItem.id || ''}`);
    let classCode = baseCode;
    let suffix = 2;
    while (usedClassCodes.has(classCode)) classCode = `${baseCode}-${suffix++}`;
    classItem.classCode = classCode;
    classItem.name = classCode;
    classItem.sequenceNumber = Math.max(1, Number(classItem.sequenceNumber) || 1);
    usedClassCodes.add(classCode);
  }
  const classById = new Map(normalized.classes.map((classItem) => [classItem.id, classItem]));
  for (const classItem of normalized.classes) {
    classItem.currentStudents = normalized.students.filter((student) => (
      student.classId === classItem.id
      && !['Withdrawn', 'Inactive', 'Graduated', 'Deleted'].includes(student.status)
    )).length;
  }
  for (const student of normalized.students) {
    const classItem = classById.get(student.classId);
    if (classItem) student.className = classItem.classCode;
  }
  for (const application of normalized.applications) {
    const classItem = classById.get(application.classId);
    if (classItem) application.className = classItem.classCode;
  }
  for (const user of normalized.users) {
    if (user.role === 'Admin') user.permissions = [...new Set([...(user.permissions || []), ...admissionPeriodPermissions, ...scheduledMessagePermissions, ...studentSearchPermissions])];
    if (user.role === 'Officer') user.permissions = [...new Set([...(user.permissions || []), ...staffStudentSearchPermissions])];
  }
  // Keep the official admission fee consistent for existing and newly seeded data.
  for (const program of normalized.programs) program.admissionFee = admissionFee;
  for (const application of normalized.applications) application.admissionFee = admissionFee;
  return normalized;
};

const ensureJsonDb = async () => {
  try {
    await fs.access(env.dbFile);
    try {
      await fs.access(jsonBackupFile());
    } catch {
      await fs.copyFile(env.dbFile, jsonBackupFile());
    }
  } catch {
    await ensureDirectory(env.dbFile);
    try {
      await fs.copyFile(jsonBackupFile(), env.dbFile);
      return;
    } catch {
      // A new installation has no database or backup yet.
    }
    const seed = createSeedData({ hashPassword });
    await fs.writeFile(env.dbFile, JSON.stringify(seed, null, 2));
    await fs.copyFile(env.dbFile, jsonBackupFile());
  }
};

const readJsonDb = async () => {
  await ensureJsonDb();
  try {
    const raw = await fs.readFile(env.dbFile, 'utf8');
    return normalizeData(JSON.parse(raw));
  } catch (primaryError) {
    try {
      const backupRaw = await fs.readFile(jsonBackupFile(), 'utf8');
      const recovered = normalizeData(JSON.parse(backupRaw));
      await fs.copyFile(jsonBackupFile(), env.dbFile);
      console.warn(`Recovered database from backup after read failure: ${primaryError.message}`);
      return recovered;
    } catch {
      throw primaryError;
    }
  }
};

const writeJsonDb = async (data) => {
  await ensureDirectory(env.dbFile);
  const tmpFile = `${env.dbFile}.tmp`;
  const normalized = normalizeData(data);
  await fs.writeFile(tmpFile, JSON.stringify(normalized, null, 2));
  await fs.rename(tmpFile, env.dbFile);
  await fs.copyFile(env.dbFile, jsonBackupFile());
  return normalized;
};

const mysqlDocumentId = (document) => String(
  document?.id || crypto.createHash('sha256').update(JSON.stringify(document)).digest('hex').slice(0, 32)
);

const ensureMysqlDb = async () => {
  const pool = getMysqlPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_singletons (
      name VARCHAR(64) NOT NULL PRIMARY KEY,
      document_json LONGTEXT NOT NULL,
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      CONSTRAINT chk_system_singletons_json CHECK (JSON_VALID(document_json))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  for (const tableName of Object.values(mysqlTableNames)) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        document_json LONGTEXT NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        CONSTRAINT \`chk_${tableName}_json\` CHECK (JSON_VALID(document_json))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
};

const parseMysqlDocument = (value) => {
  if (value && typeof value === 'object' && !Buffer.isBuffer(value)) return value;
  return JSON.parse(Buffer.isBuffer(value) ? value.toString('utf8') : String(value));
};

const readMysqlDb = async () => {
  await ensureMysqlDb();
  const pool = getMysqlPool();
  const [singletonRows] = await pool.query('SELECT name, document_json FROM system_singletons');
  const singletonMap = new Map(singletonRows.map((row) => [row.name, parseMysqlDocument(row.document_json)]));
  const data = {
    meta: singletonMap.get('meta') || {},
    settings: singletonMap.get('settings') || {}
  };
  for (const collection of collections) {
    const [rows] = await pool.query(`SELECT document_json FROM \`${mysqlTableNames[collection]}\` ORDER BY created_at, id`);
    data[collection] = rows.map((row) => parseMysqlDocument(row.document_json));
  }
  return normalizeData(data);
};

const assertSafeCollectionCounts = async (countReader, data, driverName) => {
  for (const collection of protectedCollections) {
    const currentCount = await countReader(collection);
    const nextCount = Array.isArray(data[collection]) ? data[collection].length : 0;
    const suspiciousFloor = Math.max(3, Math.floor(currentCount * 0.25));
    if (currentCount >= 4 && nextCount <= suspiciousFloor && nextCount < currentCount - 1) {
      throw new Error(
        `${driverName} safety guard blocked a suspicious ${collection} reduction from ${currentCount} to ${nextCount}.`
      );
    }
  }
};

const writeMysqlDb = async (data) => {
  await ensureMysqlDb();
  const pool = getMysqlPool();
  const normalized = normalizeData(data);
  await assertSafeCollectionCounts(async (collection) => {
    const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM \`${mysqlTableNames[collection]}\``);
    return Number(rows[0].count);
  }, normalized, 'MySQL');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const [name, value] of [['meta', normalized.meta], ['settings', normalized.settings]]) {
      await connection.query(
        'INSERT INTO system_singletons (name, document_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE document_json = VALUES(document_json)',
        [name, JSON.stringify(value || {})]
      );
    }
    for (const collection of collections) {
      const tableName = mysqlTableNames[collection];
      const documents = normalized[collection] || [];
      for (const document of documents) {
        await connection.query(
          `INSERT INTO \`${tableName}\` (id, document_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE document_json = VALUES(document_json)`,
          [mysqlDocumentId(document), JSON.stringify(document)]
        );
      }
      if (documents.length === 0) {
        await connection.query(`DELETE FROM \`${tableName}\``);
      } else {
        const ids = documents.map(mysqlDocumentId);
        await connection.query(`DELETE FROM \`${tableName}\` WHERE id NOT IN (?)`, [ids]);
      }
    }
    await connection.commit();
    return normalized;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const acquireMysqlWriteLock = async () => {
  const connection = await getMysqlPool().getConnection();
  const [rows] = await connection.query('SELECT GET_LOCK(?, 30) AS acquired', ['jamhuriya-global-write-lock']);
  if (Number(rows[0]?.acquired) !== 1) {
    connection.release();
    throw new Error('Timed out waiting for the MySQL write lock');
  }
  return async () => {
    try {
      await connection.query('SELECT RELEASE_LOCK(?)', ['jamhuriya-global-write-lock']);
    } finally {
      connection.release();
    }
  };
};

export const ensureDb = async () => {
  if (usesMysql()) {
    await ensureMysqlDb();
    return;
  }
  await ensureJsonDb();
};

export const readDb = async () => {
  if (usesMysql()) return readMysqlDb();
  return readJsonDb();
};

export const writeDb = async (data) => {
  if (usesMysql()) return writeMysqlDb(data);
  return writeJsonDb(data);
};

export const updateDb = async (mutator) => {
  // Keep read-modify-write operations in one queue. Without this, two requests
  // can read the same snapshot and the last writer can erase the first change.
  const operation = updateQueue.then(async () => {
    const releaseLock = usesMysql() ? await acquireMysqlWriteLock() : null;
    try {
      const db = await readDb();
      const result = await mutator(db);
      await writeDb(db);
      return result;
    } finally {
      if (releaseLock) await releaseLock();
    }
  });

  // A rejected update must not permanently block later database operations.
  updateQueue = operation.catch(() => undefined);
  return operation;
};

export const closeDb = async () => {
  if (mysqlPool) {
    await mysqlPool.end();
    mysqlPool = null;
  }
};
