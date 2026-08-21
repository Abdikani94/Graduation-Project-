import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env, ROOT_DIR } from '../config/env.js';
import { closeDb, readDb } from '../lib/db.js';

const BACKUP_LIMIT = 10;
const backupDirectory = path.join(ROOT_DIR, 'data', 'mysql-backups');

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const pruneOldBackups = async () => {
  const files = (await fs.readdir(backupDirectory))
    .filter((name) => name.startsWith('jamhuriya_admission-') && name.endsWith('.json'))
    .sort()
    .reverse();
  await Promise.all(files.slice(BACKUP_LIMIT).map((name) => fs.unlink(path.join(backupDirectory, name))));
};

export const backupMysqlDatabase = async ({ silent = false } = {}) => {
  if (env.dbDriver !== 'mysql') return null;
  await fs.mkdir(backupDirectory, { recursive: true });
  const data = await readDb();
  const backup = {
    database: env.mysqlDatabase,
    createdAt: new Date().toISOString(),
    counts: Object.fromEntries(
      Object.entries(data).filter(([, value]) => Array.isArray(value)).map(([name, value]) => [name, value.length])
    ),
    data
  };
  const filePath = path.join(backupDirectory, `jamhuriya_admission-${timestamp()}.json`);
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, JSON.stringify(backup, null, 2), 'utf8');
  await fs.rename(temporaryPath, filePath);
  await pruneOldBackups();
  if (!silent) console.log(`MySQL backup created: ${filePath}`);
  return filePath;
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    await backupMysqlDatabase();
  } finally {
    await closeDb();
  }
}
