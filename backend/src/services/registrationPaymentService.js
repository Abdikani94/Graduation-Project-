import { successfulPaymentsForRegistration } from '../repositories/paymentRepository.js';

const paymentMinor = (payment) => Number.isInteger(payment.amountMinor)
  ? payment.amountMinor
  : Math.round(Number(payment.amount || 0) * 100);

export const registrationBalance = (db, registration) => {
  const requiredMinor = Math.round(Number(registration.admissionFee || 0) * 100);
  const totalPaidMinor = successfulPaymentsForRegistration(db, registration.id)
    .reduce((sum, payment) => sum + paymentMinor(payment), 0);
  return { requiredMinor, totalPaidMinor, remainingMinor: Math.max(0, requiredMinor - totalPaidMinor) };
};

export const updateRegistrationPaymentStatus = (db, registration) => {
  const balance = registrationBalance(db, registration);
  registration.paymentStatus = balance.totalPaidMinor === 0
    ? 'UNPAID'
    : balance.requiredMinor > 0 && balance.totalPaidMinor >= balance.requiredMinor
      ? 'PAID'
      : 'PARTIALLY_PAID';
  registration.updatedAt = new Date().toISOString();
  return balance;
};
