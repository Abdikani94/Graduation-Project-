import { env } from '../config/env.js';
import { createSeedData } from '../data/seed-data.js';
import { hashPassword } from '../lib/crypto.js';
import { closeDb, writeDb } from '../lib/db.js';

await writeDb(createSeedData({ hashPassword }));
await closeDb();

const target = env.dbDriver === 'mongodb'
  ? `${env.mongodbUri}/${env.mongodbDbName}`
  : env.dbFile;

console.log(`Seeded database: ${target}`);
