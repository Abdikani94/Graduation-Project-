import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const fail = (status, message, details) => {
  throw new HttpError(status, message, details);
};

export const setCorsHeaders = (req, res) => {
  const configuredOrigins = env.corsOrigin.split(',').map((item) => item.trim()).filter(Boolean);
  const isWildcard = configuredOrigins.includes('*');
  const origin = req.headers.origin;
  const isLocalDevelopmentOrigin = env.nodeEnv !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
  const isConfiguredOrigin = Boolean(origin && configuredOrigins.includes(origin));
  const allowedOrigin = isWildcard
    ? (origin || '*')
    : isConfiguredOrigin || isLocalDevelopmentOrigin
      ? origin
      : configuredOrigins[0];
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Never combine a wildcard/reflected origin with credentials - only the single
  // explicitly configured origin is trusted enough to receive this header.
  if (!isWildcard) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
};

export const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
};

export const sendCsv = (res, filename, csv) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.end(csv);
};

export const sendNoContent = (res) => {
  res.statusCode = 204;
  res.end();
};

export const sendError = (res, error) => {
  const status = error instanceof HttpError ? error.status : (error.status || 500);
  const message = error instanceof HttpError || error.status ? error.message : 'Internal server error';
  const payload = { error: { message } };
  if (error.code) payload.error.code = error.code;
  if (error.details) payload.error.details = error.details;
  sendJson(res, status, payload);
};

const collectBody = async (req) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > env.maxBodyBytes) fail(413, 'Request body is too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

const parseContentDisposition = (value = '') => {
  const result = {};
  for (const part of value.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawValue.length) continue;
    result[rawKey] = rawValue.join('=').trim().replace(/^"|"$/g, '');
  }
  return result;
};

const parseMultipart = (buffer, boundary) => {
  const delimiter = Buffer.from(`--${boundary}`);
  const fields = {};
  const files = [];
  let cursor = buffer.indexOf(delimiter);

  while (cursor !== -1) {
    const next = buffer.indexOf(delimiter, cursor + delimiter.length);
    if (next === -1) break;

    let partStart = cursor + delimiter.length;
    if (buffer.slice(partStart, partStart + 2).toString() === '--') break;
    if (buffer.slice(partStart, partStart + 2).toString() === '\r\n') partStart += 2;

    let partEnd = next;
    if (buffer.slice(partEnd - 2, partEnd).toString() === '\r\n') partEnd -= 2;
    const part = buffer.slice(partStart, partEnd);
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd !== -1) {
      const headerText = part.slice(0, headerEnd).toString('utf8');
      const body = part.slice(headerEnd + 4);
      const headers = Object.fromEntries(
        headerText.split('\r\n').map((line) => {
          const separator = line.indexOf(':');
          return [
            line.slice(0, separator).toLowerCase(),
            line.slice(separator + 1).trim()
          ];
        })
      );
      const disposition = parseContentDisposition(headers['content-disposition']);
      if (disposition.name && disposition.filename) {
        files.push({
          fieldName: disposition.name,
          filename: disposition.filename,
          contentType: headers['content-type'] || 'application/octet-stream',
          size: body.length,
          buffer: body
        });
      } else if (disposition.name) {
        fields[disposition.name] = body.toString('utf8');
      }
    }
    cursor = next;
  }

  return { fields, files };
};

export const parseRequestBody = async (req) => {
  if (req.method === 'GET' || req.method === 'HEAD') return {};

  const body = await collectBody(req);
  if (body.length === 0) return {};

  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      fail(400, 'Invalid JSON body');
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(body.toString('utf8')));
  }

  if (contentType.includes('multipart/form-data')) {
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) fail(400, 'Multipart boundary is missing');
    return parseMultipart(body, boundaryMatch[1]);
  }

  return { raw: body.toString('utf8') };
};

const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf'
};

export const serveUpload = async (res, pathname) => {
  const relative = pathname.replace(/^\/uploads\//, '');
  const requestedPath = path.resolve(env.uploadDir, relative);
  const root = path.resolve(env.uploadDir);
  if (!requestedPath.startsWith(root)) fail(403, 'Upload path is not allowed');
  const data = await fs.readFile(requestedPath);
  res.statusCode = 200;
  res.setHeader('Content-Type', mimeTypes[path.extname(requestedPath).toLowerCase()] || 'application/octet-stream');
  res.end(data);
};
