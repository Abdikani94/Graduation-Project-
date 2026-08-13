import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const envPath = path.join(backendRoot, '.env');

for (const line of (await fs.readFile(envPath, 'utf8')).split(/\r?\n/)) {
  const match = line.match(/^\s*([^#=]+)=(.*)$/);
  if (match && process.env[match[1].trim()] === undefined) process.env[match[1].trim()] = match[2].trim();
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const databaseName = process.env.MONGODB_DB_NAME || 'jamhuriya_admission';
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

export const backupMongoDatabase = async () => {
try {
  await client.connect();
  const database = client.db(databaseName);
  const backup = {};
  const collections = await database.listCollections().toArray();

  for (const { name } of collections) {
    const documents = await database.collection(name).find({}).toArray();
    backup[name] = documents.map(({ _id, ...document }) => name === 'meta' || name === 'settings'
      ? { _id, ...document }
      : document);
  }

  const backupDirectory = path.join(backendRoot, 'data', 'mongo-backups');
  await fs.mkdir(backupDirectory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDirectory, `${databaseName}-${stamp}.json`);
  await fs.writeFile(backupPath, JSON.stringify({ databaseName, createdAt: new Date().toISOString(), collections: backup }, null, 2));

  const savedBackups = (await fs.readdir(backupDirectory))
    .filter((name) => name.startsWith(`${databaseName}-`) && name.endsWith('.json'))
    .sort()
    .reverse();
  for (const oldBackup of savedBackups.slice(10)) await fs.unlink(path.join(backupDirectory, oldBackup));

  console.log(`MongoDB backup created: ${backupPath}`);
  for (const [name, documents] of Object.entries(backup)) console.log(`${name}: ${documents.length}`);
} finally {
  await client.close();
}
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await backupMongoDatabase();
}
