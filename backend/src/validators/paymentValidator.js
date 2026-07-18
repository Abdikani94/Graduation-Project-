import { fail } from '../lib/http.js';
import { paymentConfig } from '../config/paymentConfig.js';

export const parseAmountToMinor = (value) => {
  const text = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) fail(422, 'Amount must be numeric with no more than two decimal places');
  const [whole, fraction = ''] = text.split('.');
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0) fail(422, 'Amount must be greater than zero');
  const minimum = Math.round(paymentConfig.minimumAmount * 100);
  const maximum = Math.round(paymentConfig.maximumAmount * 100);
  if (minor < minimum) fail(422, `Minimum payment amount is ${paymentConfig.minimumAmount.toFixed(2)} ${paymentConfig.currency}`);
  if (minor > maximum) fail(422, `Maximum payment amount is ${paymentConfig.maximumAmount.toFixed(2)} ${paymentConfig.currency}`);
  return minor;
};

export const formatMinorAmount = (minor) => (minor / 100).toFixed(2);

export const validateIdempotencyKey = (value) => {
  const key = String(value ?? '').trim();
  if (!/^[A-Za-z0-9._-]{16,100}$/.test(key)) fail(422, 'A valid idempotency key is required');
  return key;
};
