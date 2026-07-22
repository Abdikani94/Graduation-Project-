import { fail } from '../lib/http.js';

export const normalizeSomaliEvcPhone = (value) => {
  let digits = String(value ?? '').trim().replace(/[\s+()-]/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (!digits.startsWith('252')) digits = `252${digits}`;
  if (!/^25261\d{7}$/.test(digits)) {
    fail(422, 'Enter a valid EVC Plus number such as 61XXXXXXX, 061XXXXXXX, +25261XXXXXXX, or 25261XXXXXXX');
  }
  return digits;
};

export const maskPhone = (value) => {
  const text = String(value ?? '');
  if (!text) return '';
  return `${text.slice(0, 5)}****${text.slice(-3)}`;
};

export const maskMerchantPhone = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? `****${digits.slice(-4)}` : '';
};
