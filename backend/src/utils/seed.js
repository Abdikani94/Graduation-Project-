import { env } from '../config/env.js';
import { closeDb, ensureDb, readDb } from '../lib/db.js';

// Initialize an empty database only. Existing applications, classes, payments,
// and other records must never be replaced by the normal seed command.
await ensureDb();
const data = await readDb();
await closeDb();

const target = env.dbDriver === 'mongodb'
  ? `${env.mongodbUri}/${env.mongodbDbName}`
  : env.dbFile;

console.log(`Database ready: ${target}`);
console.log(`Existing records preserved (${(data.classes || []).length} classes).`);
