import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(configDir, '../..');

const envFile = path.join(ROOT_DIR, '.env');

if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value.replace(/^["']|["']$/g, '');
    }
  }
}

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const insecureDefaultJwtSecret = 'development-only-secret';
const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || insecureDefaultJwtSecret;

if (nodeEnv === 'production' && jwtSecret === insecureDefaultJwtSecret) {
  throw new Error(
    'Refusing to start: JWT_SECRET is not set. Set a strong, random JWT_SECRET in the environment before running in production.'
  );
}

export const env = {
  host: process.env.HOST || '127.0.0.1',
  port: toNumber(process.env.PORT, 4000),
  nodeEnv,
  dbDriver: process.env.DB_DRIVER || (process.env.MONGODB_URI ? 'mongodb' : 'json'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecret,
  tokenExpiresInSeconds: toNumber(process.env.TOKEN_EXPIRES_IN_SECONDS, 60 * 60 * 24),
  maxBodyBytes: toNumber(process.env.MAX_BODY_BYTES, 15 * 1024 * 1024),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  mongodbDbName: process.env.MONGODB_DB_NAME || 'jamhuriya_admission',
  mongoConnectTimeoutMs: toNumber(process.env.MONGO_CONNECT_TIMEOUT_MS, 5000),
  dbFile: process.env.DB_FILE || path.join(ROOT_DIR, 'data', 'database.json'),
  uploadDir: process.env.UPLOAD_DIR || path.join(ROOT_DIR, 'uploads')
};
