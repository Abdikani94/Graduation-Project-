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
  port: toNumber(process.env.PORT, 5055),
  nodeEnv,
  dbDriver: process.env.DB_DRIVER || (process.env.MONGODB_URI ? 'mongodb' : 'json'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5180',
  jwtSecret,
  tokenExpiresInSeconds: toNumber(process.env.TOKEN_EXPIRES_IN_SECONDS, 60 * 60 * 24),
  maxBodyBytes: toNumber(process.env.MAX_BODY_BYTES, 15 * 1024 * 1024),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  mongodbDbName: process.env.MONGODB_DB_NAME || 'jamhuriya_admission',
  mongoConnectTimeoutMs: toNumber(process.env.MONGO_CONNECT_TIMEOUT_MS, 5000),
  dbFile: process.env.DB_FILE || path.join(ROOT_DIR, 'data', 'database.json'),
  uploadDir: process.env.UPLOAD_DIR || path.join(ROOT_DIR, 'uploads'),
  fileStorageDir: process.env.FILE_STORAGE_DIR || path.join(ROOT_DIR, 'uploads', 'centralized-files'),
  maxStoredFileBytes: toNumber(process.env.MAX_STORED_FILE_BYTES, 10 * 1024 * 1024),
  admissionPeriodSchedulerMs: Math.max(5000, toNumber(process.env.ADMISSION_PERIOD_SCHEDULER_MS, 60000)),
  smsEnabled: String(process.env.SMS_ENABLED || 'false').toLowerCase() === 'true',
  smsProvider: process.env.SMS_PROVIDER || 'XALIYE6',
  smsApiUrl: process.env.SMS_API_URL || 'https://api.xaliye6.online/sendSMS',
  smsBrandName: process.env.SMS_BRAND_NAME || 'Jamhuuriya University',
  smsRequestTimeoutMs: Math.max(1000, toNumber(process.env.SMS_REQUEST_TIMEOUT, 15) * 1000),
  smsMaxRetries: Math.max(1, Math.min(3, toNumber(process.env.SMS_MAX_RETRIES, 3))),
  smsDefaultCountryCode: process.env.SMS_DEFAULT_COUNTRY_CODE || '252',
  smsSchedulerMs: Math.max(5000, toNumber(process.env.SMS_SCHEDULER_MS, 30000)),
  smsBatchSize: Math.max(1, Math.min(100, toNumber(process.env.SMS_BATCH_SIZE, 50))),
  smsBatchDelayMs: Math.max(0, toNumber(process.env.SMS_BATCH_DELAY_SECONDS, 2) * 1000),
  waafiEnv: process.env.WAAFI_ENV === 'production' ? 'production' : 'sandbox',
  waafiSandboxUrl: process.env.WAAFI_SANDBOX_URL || 'https://sandbox.waafipay.com/asm',
  waafiProductionUrl: process.env.WAAFI_PRODUCTION_URL || 'https://api.waafipay.net/asm',
  waafiMerchantUid: process.env.WAAFI_MERCHANT_UID || '',
  waafiApiUserId: process.env.WAAFI_API_USER_ID || '',
  waafiApiKey: process.env.WAAFI_API_KEY || '',
  waafiPaymentMethod: process.env.WAAFI_PAYMENT_METHOD || 'mwallet_account',
  waafiCurrency: process.env.WAAFI_CURRENCY || 'USD',
  waafiMerchantDisplayName: process.env.WAAFI_MERCHANT_DISPLAY_NAME || process.env.WAAFI_MERCHANT_NAME || 'Online Registration System',
  waafiMerchantPhone: process.env.WAAFI_MERCHANT_PHONE || '',
  waafiMinimumAmount: toNumber(process.env.WAAFI_MINIMUM_AMOUNT, 0.01),
  waafiMaximumAmount: toNumber(process.env.WAAFI_MAXIMUM_AMOUNT, 1000),
  waafiRequestTimeoutMs: toNumber(process.env.WAAFI_REQUEST_TIMEOUT_MS, 30000),
  waafiPhoneEncryptionKey: process.env.WAAFI_PHONE_ENCRYPTION_KEY || jwtSecret
};
