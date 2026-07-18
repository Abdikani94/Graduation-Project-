import crypto from 'node:crypto';
import { env } from '../config/env.js';

const key = crypto.createHash('sha256').update(env.waafiPhoneEncryptionKey).digest();

export const encryptPhone = (phone) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(phone, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((item) => item.toString('base64url')).join('.');
};
