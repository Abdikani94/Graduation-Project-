import { fail } from '../lib/http.js';

export const findRegistration = (db, registrationId) =>
  db.applications.find((item) => item.id === registrationId || item.reference === registrationId);

export const requireRegistration = (db, registrationId) => {
  const registration = findRegistration(db, registrationId);
  if (!registration) fail(404, 'Registration not found');
  return registration;
};
