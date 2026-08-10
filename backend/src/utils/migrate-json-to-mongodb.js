import fs from 'node:fs/promises';
import path from 'node:path';
import { MongoClient } from 'mongodb';

const backendRoot = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1'));
const envFile = path.join(backendRoot, '.env');
const jsonFile = path.join(backendRoot, 'data', 'database.json');

const loadEnvFile = async () => {
  const raw = await fs.readFile(envFile, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (match && process.env[match[1].trim()] === undefined) process.env[match[1].trim()] = match[2].trim();
  }
};

await loadEnvFile();
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const databaseName = process.env.MONGODB_DB_NAME || 'jamhuriya_admission';
const backendPort = process.env.PORT || '5055';
const source = JSON.parse(await fs.readFile(jsonFile, 'utf8'));
const arrayCollections = Object.entries(source).filter(([, value]) => Array.isArray(value));
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

let backendIsRunning = false;
try {
  const response = await fetch(`http://127.0.0.1:${backendPort}/api/health`, {
    signal: AbortSignal.timeout(1000)
  });
  backendIsRunning = response.ok;
} catch {
  // A stopped backend is required so it cannot overwrite the migration with a stale snapshot.
}
if (backendIsRunning) {
  throw new Error(`Stop the backend on port ${backendPort} before running this migration.`);
}

try {
  await client.connect();
  const database = client.db(databaseName);
  const backup = { meta: {}, settings: {} };
  const existingNames = (await database.listCollections().toArray()).map(({ name }) => name);

  for (const name of existingNames) {
    if (name === 'meta' || name === 'settings') {
      backup[name] = (await database.collection(name).findOne({ _id: name }))?.value || {};
    } else {
      backup[name] = await database.collection(name).find({}, { projection: { _id: 0 } }).toArray();
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backendRoot, 'data', `mongodb-pre-migration-${stamp}.json`);
  await fs.writeFile(backupFile, JSON.stringify(backup, null, 2));

  for (const singleton of ['meta', 'settings']) {
    if (source[singleton] && typeof source[singleton] === 'object') {
      await database.collection(singleton).replaceOne(
        { _id: singleton },
        { _id: singleton, value: source[singleton] },
        { upsert: true }
      );
    }
  }

  for (const [name, records] of arrayCollections) {
    if (records.length === 0) continue;
    const operations = records.map((record) => {
      if (!record.id) throw new Error(`Cannot migrate ${name}: a record has no id`);
      return { replaceOne: { filter: { id: record.id }, replacement: record, upsert: true } };
    });
    await database.collection(name).bulkWrite(operations, { ordered: true });
    console.log(`${name}: ${await database.collection(name).countDocuments()} records`);
  }

  console.log(`Migration complete: ${uri}/${databaseName}`);
  console.log(`MongoDB backup created: ${backupFile}`);
} finally {
  await client.close();
}
