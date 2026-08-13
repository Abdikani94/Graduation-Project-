import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';
import { createSeedData } from '../data/seed-data.js';
import { hashPassword } from './crypto.js';
import { admissionFee } from '../config/admissionFee.js';

const collections = [
  'users', 'programs', 'applications', 'students', 'payments', 'contactMessages', 'activities', 'classes',
  'files', 'fileShares', 'fileActivities', 'notifications', 'smsNotifications', 'smsCampaigns', 'smsCampaignRecipients', 'smsTemplates', 'admissionPeriods', 'admissionPeriodActivities'
];
const admissionPeriodPermissions = ['admission_period.view', 'admission_period.create', 'admission_period.update', 'admission_period.open', 'admission_period.close', 'admission_period.pause', 'admission_period.resume', 'admission_period.extend', 'admission_period.reopen', 'admission_period.cancel', 'admission_period.archive', 'admission_period.view_audit_log'];
const scheduledMessagePermissions = ['scheduled_message.view', 'scheduled_message.create', 'scheduled_message.update', 'scheduled_message.schedule', 'scheduled_message.send_now', 'scheduled_message.cancel', 'scheduled_message.retry', 'scheduled_message.view_results', 'scheduled_message.manage_templates'];
const studentSearchPermissions = ['student_search.view', 'student_search.view_contact', 'student_search.view_emergency_contact', 'student_search.view_academic', 'student_search.view_payment_summary', 'student_search.view_full_profile'];
const staffStudentSearchPermissions = studentSearchPermissions.filter((permission) => permission !== 'student_search.view_full_profile');
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
let mongoClient;
let mongoDatabase;
let mongoConnectionLogged = false;
let updateQueue = Promise.resolve();
const mongoWriteLockId = 'jamhuriya-global-write-lock';
const mongoWriteLockTimeoutMs = 30_000;
const mongoWriteLockWaitMs = 50;
const protectedMongoCollections = ['users', 'applications', 'students', 'payments', 'classes'];

const ensureDirectory = async (filePath) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
};

export const createId = (prefix) => `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

const usesMongo = () => env.dbDriver === 'mongodb';

const getMongoDatabase = async () => {
  if (mongoDatabase) return mongoDatabase;
  mongoClient = new MongoClient(env.mongodbUri, {
    serverSelectionTimeoutMS: env.mongoConnectTimeoutMs
  });
  await mongoClient.connect();
  mongoDatabase = mongoClient.db(env.mongodbDbName);
  if (!mongoConnectionLogged) {
    console.log(`MongoDB connected: ${env.mongodbUri}/${env.mongodbDbName}`);
    mongoConnectionLogged = true;
  }
  return mongoDatabase;
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

const ensureMongoDb = async () => {
  const database = await getMongoDatabase();
  await Promise.all([
    database.collection('payments').createIndex({ referenceId: 1 }, { unique: true, sparse: true }),
    database.collection('payments').createIndex({ requestId: 1 }, { unique: true, sparse: true }),
    database.collection('payments').createIndex(
      { applicationId: 1, userId: 1, idempotencyKey: 1 },
      { unique: true, sparse: true }
    ),
    database.collection('files').createIndex({ uploadedBy: 1, reportType: 1, reportDate: 1 }),
    database.collection('files').createIndex({ uploadedBy: 1, reportType: 1, reportingMonth: 1, reportingYear: 1 }),
    database.collection('files').createIndex({ approvalStatus: 1, isArchived: 1, createdAt: -1 }),
    database.collection('fileShares').createIndex({ fileId: 1, sharedWithUserId: 1 }),
    database.collection('fileActivities').createIndex({ fileId: 1, createdAt: -1 }),
    database.collection('notifications').createIndex({ userId: 1, read: 1, createdAt: -1 }),
    database.collection('smsNotifications').createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true }),
    database.collection('smsNotifications').createIndex({ status: 1, nextRetryAt: 1, createdAt: -1 })
    ,database.collection('smsCampaigns').createIndex({ status: 1, scheduledAt: 1, archived: 1 })
    ,database.collection('smsCampaignRecipients').createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true })
    ,database.collection('smsCampaignRecipients').createIndex({ campaignId: 1, status: 1 })
    ,database.collection('smsTemplates').createIndex({ key: 1 }, { unique: true, sparse: true })
    ,database.collection('admissionPeriods').createIndex({ status: 1, openingDatetime: 1, closingDatetime: 1 })
    ,database.collection('admissionPeriods').createIndex({ academicYear: 1, intakeName: 1, facultyId: 1, programId: 1 })
    ,database.collection('admissionPeriodActivities').createIndex({ admissionPeriodId: 1, createdAt: -1 })
  ]);
  const userCount = await database.collection('users').countDocuments();
  if (userCount === 0) {
    const existingCoreRecords = await Promise.all(
      protectedMongoCollections.filter((name) => name !== 'users')
        .map((name) => database.collection(name).countDocuments())
    );
    if (existingCoreRecords.some((count) => count > 0)) {
      throw new Error('MongoDB contains application data but no users. Automatic seeding was blocked to prevent data loss.');
    }
    const seed = normalizeData(createSeedData({ hashPassword }));
    await writeSingleton(database, 'meta', seed.meta || {});
    await writeSingleton(database, 'settings', seed.settings || {});
    for (const collection of collections) {
      const documents = seed[collection] || [];
      if (documents.length) {
        await database.collection(collection).bulkWrite(documents.map((document) => ({
          updateOne: { filter: { id: document.id }, update: { $setOnInsert: document }, upsert: true }
        })));
      }
    }
  }
};

const readSingleton = async (database, name, fallback) => {
  const document = await database.collection(name).findOne({ _id: name });
  return document?.value ?? fallback;
};

const writeSingleton = async (database, name, value) => {
  await database.collection(name).replaceOne(
    { _id: name },
    { _id: name, value },
    { upsert: true }
  );
};

const readMongoDb = async () => {
  await ensureMongoDb();
  const database = await getMongoDatabase();
  const data = {
    meta: await readSingleton(database, 'meta', {}),
    settings: await readSingleton(database, 'settings', {})
  };

  for (const collection of collections) {
    data[collection] = await database
      .collection(collection)
      .find({}, { projection: { _id: 0 } })
      .toArray();
  }

  return data;
};

const writeMongoDb = async (data) => {
  const database = await getMongoDatabase();
  for (const collection of protectedMongoCollections) {
    const currentCount = await database.collection(collection).countDocuments();
    const nextCount = Array.isArray(data[collection]) ? data[collection].length : 0;
    const suspiciousFloor = Math.max(3, Math.floor(currentCount * 0.25));
    if (currentCount >= 4 && nextCount <= suspiciousFloor && nextCount < currentCount - 1) {
      throw new Error(
        `MongoDB safety guard blocked a suspicious ${collection} reduction from ${currentCount} to ${nextCount}.`
      );
    }
  }
  await writeSingleton(database, 'meta', data.meta || {});
  await writeSingleton(database, 'settings', data.settings || {});

  for (const collection of collections) {
    const documents = Array.isArray(data[collection]) ? data[collection] : [];
    if (documents.length > 0) {
      await database.collection(collection).bulkWrite(documents.map((document) => ({
        replaceOne: { filter: { id: document.id }, replacement: document, upsert: true }
      })), { ordered: true });
      await database.collection(collection).deleteMany({ id: { $nin: documents.map((document) => document.id) } });
    } else {
      await database.collection(collection).deleteMany({ id: { $exists: true } });
    }
  }

  return data;
};

export const ensureDb = async () => {
  if (usesMongo()) {
    await ensureMongoDb();
    return;
  }
  await ensureJsonDb();
};

export const readDb = async () => {
  if (usesMongo()) return readMongoDb();
  return readJsonDb();
};

export const writeDb = async (data) => {
  if (usesMongo()) return writeMongoDb(normalizeData(data));
  return writeJsonDb(data);
};

const acquireMongoWriteLock = async () => {
  const database = await getMongoDatabase();
  const locks = database.collection('_systemLocks');
  const owner = crypto.randomUUID();
  const deadline = Date.now() + mongoWriteLockTimeoutMs;

  while (Date.now() < deadline) {
    try {
      await locks.insertOne({ _id: mongoWriteLockId, owner, acquiredAt: new Date() });
      return async () => { await locks.deleteOne({ _id: mongoWriteLockId, owner }); };
    } catch (error) {
      if (error?.code !== 11000) throw error;
      await locks.deleteOne({ _id: mongoWriteLockId, acquiredAt: { $lt: new Date(Date.now() - mongoWriteLockTimeoutMs) } });
      await new Promise((resolve) => setTimeout(resolve, mongoWriteLockWaitMs));
    }
  }
  throw new Error('Timed out waiting for the MongoDB write lock');
};

export const updateDb = async (mutator) => {
  // Keep read-modify-write operations in one queue. Without this, two requests
  // can read the same snapshot and the last writer can erase the first change.
  const operation = updateQueue.then(async () => {
    const releaseLock = usesMongo() ? await acquireMongoWriteLock() : null;
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
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    mongoDatabase = null;
    mongoConnectionLogged = false;
  }
};
