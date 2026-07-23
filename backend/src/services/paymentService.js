import crypto from 'node:crypto';
import { createId, readDb, updateDb } from '../lib/db.js';
import { fail } from '../lib/http.js';
import { encryptPhone } from '../lib/phoneEncryption.js';
import { paymentConfig } from '../config/paymentConfig.js';
import { purchaseWithWaafi } from '../providers/waafiPayProvider.js';
import { findPaymentByIdempotency, findPaymentByReference } from '../repositories/paymentRepository.js';
import { requireRegistration } from '../repositories/registrationRepository.js';
import { registrationBalance, updateRegistrationPaymentStatus } from './registrationPaymentService.js';
import { createInsufficientBalanceNotification, scheduleSmsNotification } from './smsService.js';
import { formatMinorAmount, validateIdempotencyKey } from '../validators/paymentValidator.js';
import { maskMerchantPhone, maskPhone, normalizeSomaliEvcPhone } from '../validators/phoneValidator.js';

const activeRequests = new Map();
const description = 'Online registration payment';
const registrationFeeMinor = 2500;
const registrationCurrency = 'USD';

const assertOwnership = (owner, registration) => {
  if (owner.role === 'Applicant' && owner.applicationId !== registration.id) fail(403, 'You are not authorized to pay this registration');
};

const makeReference = () => `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
const makeInvoice = (registration) => `INV-${registration.reference.replace(/[^A-Za-z0-9._-]/g, '-')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const safePayment = (payment) => ({
  referenceId: payment.referenceId,
  registrationId: payment.registrationReference,
  status: payment.status,
  amount: Number(payment.amount),
  currency: payment.currency,
  payerPhone: payment.payerPhoneMasked,
  providerTransactionId: payment.providerTransactionId || null,
  providerState: payment.providerState || null,
  failureCode: payment.failureCode || null,
  failureMessage: payment.failureMessage || null,
  description: payment.description,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
  paidAt: payment.paidAt || null
});

export const previewPayment = async ({ registrationId, phoneNumber, owner }) => {
  const amountMinor = registrationFeeMinor;
  const phone = normalizeSomaliEvcPhone(phoneNumber);
  const db = await readDb();
  const registration = requireRegistration(db, registrationId);
  assertOwnership(owner, registration);
  const balance = registrationBalance(db, registration);
  if (balance.remainingMinor === 0) fail(409, 'This registration fee has already been paid');
  if (balance.requiredMinor !== registrationFeeMinor || balance.remainingMinor !== registrationFeeMinor) {
    fail(409, 'The registration payment balance is inconsistent. Contact admissions before retrying.');
  }
  return {
    registrationId: registration.reference,
    applicantName: registration.fullName,
    merchantName: paymentConfig.merchantName,
    merchantPhone: maskMerchantPhone(paymentConfig.merchantPhone),
    payerPhone: maskPhone(phone),
    amount: Number(formatMinorAmount(amountMinor)),
    currency: registrationCurrency,
    description,
    remainingBalance: Number(formatMinorAmount(balance.remainingMinor))
  };
};

const initiateOnce = async ({ registrationId, phoneNumber, idempotencyKey, owner }) => {
  const amountMinor = registrationFeeMinor;
  const phone = normalizeSomaliEvcPhone(phoneNumber);
  const key = validateIdempotencyKey(idempotencyKey);
  const prepared = await updateDb((db) => {
    const registration = requireRegistration(db, registrationId);
    assertOwnership(owner, registration);
    const existing = findPaymentByIdempotency(db, registration.id, owner.id, key);
    if (existing) return { existing };
    const unresolved = db.payments.find((item) =>
      item.applicationId === registration.id &&
      ['PENDING', 'PROCESSING', 'UNKNOWN'].includes(item.status) &&
      !(item.status === 'UNKNOWN' && item.failureCode === 'PROVIDER_UNAVAILABLE') &&
      Date.now() - new Date(item.createdAt).getTime() < 15 * 60 * 1000
    );
    if (unresolved) return { existing: unresolved };
    const balance = registrationBalance(db, registration);
    if (balance.remainingMinor === 0) fail(409, 'This registration fee has already been paid');
    if (balance.requiredMinor !== registrationFeeMinor || balance.remainingMinor !== registrationFeeMinor) {
      fail(409, 'The registration payment balance is inconsistent. Contact admissions before retrying.');
    }
    const now = new Date().toISOString();
    const payment = {
      id: createId('pay'),
      applicationId: registration.id,
      registrationReference: registration.reference,
      userId: owner.id,
      referenceId: makeReference(),
      invoiceId: makeInvoice(registration),
      requestId: crypto.randomUUID(),
      idempotencyKey: key,
      payerPhoneEncrypted: encryptPhone(phone),
      payerPhoneMasked: maskPhone(phone),
      amountMinor,
      amount: formatMinorAmount(amountMinor),
      currency: registrationCurrency,
      provider: paymentConfig.provider,
      paymentMethod: paymentConfig.paymentMethod,
      method: 'EVC Plus',
      status: 'PENDING',
      providerTransactionId: null,
      issuerTransactionId: null,
      providerResponseCode: null,
      providerState: null,
      failureCode: null,
      failureMessage: null,
      description,
      createdAt: now,
      updatedAt: now,
      paidAt: null
    };
    db.payments.unshift(payment);
    return { payment, phone };
  });

  if (prepared.existing) return safePayment(prepared.existing);
  const { payment } = prepared;
  let providerResult;
  try {
    providerResult = await purchaseWithWaafi({
      phone,
      amountMinor,
      referenceId: payment.referenceId,
      invoiceId: payment.invoiceId,
      requestId: payment.requestId
    });
  } catch (error) {
    providerResult = {
      status: error.code === 'PROVIDER_CONFIGURATION' ? 'FAILED' : 'UNKNOWN',
      responseCode: null,
      providerState: null,
      providerTransactionId: null,
      issuerTransactionId: null,
      failureCode: error.code || 'PROVIDER_UNAVAILABLE',
      failureMessage: error.code === 'PROVIDER_CONFIGURATION' ? 'Payment service is not configured' : 'Payment status is unknown'
    };
  }

  const result = await updateDb((db) => {
    const current = findPaymentByReference(db, payment.referenceId);
    if (!current) fail(500, 'Payment record was not found after provider request');
    current.status = providerResult.status;
    current.providerResponseCode = providerResult.responseCode;
    current.providerState = providerResult.providerState;
    current.providerTransactionId = providerResult.providerTransactionId;
    current.issuerTransactionId = providerResult.issuerTransactionId;
    current.failureCode = providerResult.failureCode;
    current.failureMessage = providerResult.failureMessage;
    current.updatedAt = new Date().toISOString();
    if (current.status === 'SUCCESS') current.paidAt = current.updatedAt;
    const registration = requireRegistration(db, current.applicationId);
    updateRegistrationPaymentStatus(db, registration);
    const insufficientBalance = ['5206', 'E10205'].includes(String(current.failureCode || '').toUpperCase()) ||
      /not have enough balance|insufficient balance/i.test(current.failureMessage || '');
    const smsNotification = insufficientBalance
      ? createInsufficientBalanceNotification(db, registration, current, phone)
      : null;
    return { payment: safePayment(current), smsNotification };
  });
  scheduleSmsNotification(result.smsNotification?.status === 'PENDING' ? result.smsNotification.id : null);
  return result.payment;
};

export const initiatePayment = (input) => {
  const lockKey = `${input.owner.id}:${input.registrationId}:${input.idempotencyKey}`;
  if (activeRequests.has(lockKey)) return activeRequests.get(lockKey);
  const operation = initiateOnce(input).finally(() => activeRequests.delete(lockKey));
  activeRequests.set(lockKey, operation);
  return operation;
};

export const getPaymentStatus = async ({ referenceId, owner }) => {
  const db = await readDb();
  const payment = findPaymentByReference(db, referenceId);
  if (!payment) fail(404, 'Payment not found');
  const registration = requireRegistration(db, payment.applicationId);
  assertOwnership(owner, registration);
  return safePayment(payment);
};

export const getPaymentReceipt = async ({ referenceId, owner }) => {
  const db = await readDb();
  const payment = findPaymentByReference(db, referenceId);
  if (!payment) fail(404, 'Payment not found');
  const registration = requireRegistration(db, payment.applicationId);
  assertOwnership(owner, registration);
  if (payment.status !== 'SUCCESS') fail(409, 'A receipt is available only for a successful payment');
  return {
    status: 'Approved',
    amount: Number(payment.amount),
    currency: payment.currency,
    paidAt: payment.paidAt,
    registrationId: registration.reference,
    referenceId: payment.referenceId,
    providerTransactionId: payment.providerTransactionId,
    payerPhone: payment.payerPhoneMasked,
    merchantName: paymentConfig.merchantName,
    merchantPhone: maskMerchantPhone(paymentConfig.merchantPhone),
    description: payment.description,
    walletBalanceMessage: 'Remaining wallet balance is available in your EVC confirmation message.'
  };
};
