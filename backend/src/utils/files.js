import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const certificateNamePattern = /(certificate|cert|shahaado|shaahado|transcript|result|secondary|school|diploma|degree)/i;

const sanitizeName = (filename) =>
  path.basename(filename || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);

const validateApplicationFile = (file, type) => {
  if (type === 'passportPhoto') {
    if (!imageTypes.has(file.contentType)) {
      const error = new Error('Passport photo must be JPG, PNG, or WEBP.');
      error.status = 422;
      throw error;
    }
    return;
  }

  if (type === 'certificate') {
    if (!allowedTypes.has(file.contentType) || !certificateNamePattern.test(file.filename || '')) {
      const error = new Error('Certificate upload accepts certificate files only.');
      error.status = 422;
      throw error;
    }
    return;
  }

  if (!allowedTypes.has(file.contentType)) {
    const error = new Error(`File type ${file.contentType} is not allowed`);
    error.status = 422;
    throw error;
  }
};

export const saveApplicationFile = async (file, reference, type = 'document') => {
  if (!file) return null;
  validateApplicationFile(file, type);
  const folder = path.join(env.uploadDir, 'applications');
  await fs.mkdir(folder, { recursive: true });
  const safeReference = reference.replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `${Date.now()}_${safeReference}_${sanitizeName(file.filename)}`;
  const filePath = path.join(folder, filename);
  await fs.writeFile(filePath, file.buffer);
  return {
    originalName: file.filename,
    filename,
    contentType: file.contentType,
    size: file.size,
    url: `/uploads/applications/${filename}`
  };
};
