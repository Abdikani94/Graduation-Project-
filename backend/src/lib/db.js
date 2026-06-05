import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';
import { createSeedData } from '../data/seed-data.js';
import { hashPassword } from './crypto.js';

const collections = ['users', 'programs', 'applications', 'students', 'payments', 'contactMessages', 'activities'];
let mongoClient;
let mongoDatabase;
let mongoConnectionLogged = false;

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

const ensureJsonDb = async () => {
  try {
    await fs.access(env.dbFile);
  } catch {
    await ensureDirectory(env.dbFile);
    const seed = createSeedData({ hashPassword });
    await fs.writeFile(env.dbFile, JSON.stringify(seed, null, 2));
  }
};

const readJsonDb = async () => {
  await ensureJsonDb();
  const raw = await fs.readFile(env.dbFile, 'utf8');
  return JSON.parse(raw);
};

const writeJsonDb = async (data) => {
  await ensureDirectory(env.dbFile);
  const tmpFile = `${env.dbFile}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(data, null, 2));
  await fs.rename(tmpFile, env.dbFile);
  return data;
};

const ensureMongoDb = async () => {
  const database = await getMongoDatabase();
  const userCount = await database.collection('users').countDocuments();
  if (userCount === 0) {
    await writeMongoDb(createSeedData({ hashPassword }));
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
  await writeSingleton(database, 'meta', data.meta || {});
  await writeSingleton(database, 'settings', data.settings || {});

  for (const collection of collections) {
    await database.collection(collection).deleteMany({});
    if (Array.isArray(data[collection]) && data[collection].length > 0) {
      await database.collection(collection).insertMany(data[collection]);
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
  if (usesMongo()) return writeMongoDb(data);
  return writeJsonDb(data);
};

export const updateDb = async (mutator) => {
  const db = await readDb();
  const result = await mutator(db);
  await writeDb(db);
  return result;
};

export const closeDb = async () => {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = null;
    mongoDatabase = null;
    mongoConnectionLogged = false;
  }
};
