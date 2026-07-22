import crypto from 'node:crypto';
import { paymentConfig } from '../config/paymentConfig.js';
import { formatMinorAmount } from '../validators/paymentValidator.js';

let transport = globalThis.fetch;

export const setWaafiTransportForTests = (value) => {
  transport = value || globalThis.fetch;
};

const ensureConfigured = () => {
  const missing = Object.entries(paymentConfig.credentials).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    const error = new Error('WaafiPay is not configured');
    error.code = 'PROVIDER_CONFIGURATION';
    throw error;
  }
};

export const buildWaafiPurchasePayload = ({ phone, amountMinor, referenceId, invoiceId, requestId = crypto.randomUUID() }) => ({
  schemaVersion: '1.0',
  requestId,
  timestamp: String(Math.floor(Date.now() / 1000)),
  channelName: 'WEB',
  serviceName: paymentConfig.serviceName,
  serviceParams: {
    ...paymentConfig.credentials,
    paymentMethod: paymentConfig.paymentMethod,
    payerInfo: { accountNo: phone },
    transactionInfo: {
      referenceId,
      invoiceId,
      amount: formatMinorAmount(amountMinor),
      currency: paymentConfig.currency,
      description: 'Online registration payment'
    }
  }
});

const mapProviderResult = (body) => {
  const responseCode = String(body?.responseCode ?? '');
  const errorCode = String(body?.errorCode ?? '');
  const responseMessage = String(body?.responseMsg ?? '').replace(/[^A-Za-z0-9 _.,:'()/-]/g, '').slice(0, 160);
  const providerDescription = String(body?.params?.description ?? '').replace(/[^A-Za-z0-9 _.,:'()/-]/g, '').slice(0, 160);
  const authenticationFailed = /authentication failed|invalid (api|merchant|credential)/i.test(`${responseMessage} ${providerDescription}`);
  const providerState = String(body?.params?.state ?? '').toUpperCase();
  const knownFailureMessages = {
    '5310': 'The phone confirmation was declined or expired. Retry and approve the EVC prompt within 60 seconds.',
    '5206': 'The EVC account does not have enough balance for this payment.',
    E10205: 'The EVC account does not have enough balance for this payment.'
  };
  let status = 'UNKNOWN';
  if (responseCode === '2001' && providerState === 'APPROVED') status = 'SUCCESS';
  else if (['PENDING', 'PROCESSING', 'INITIATED'].includes(providerState)) status = 'PROCESSING';
  else if (['CANCELLED', 'CANCELED'].includes(providerState)) status = 'CANCELLED';
  else if (providerState && ['DECLINED', 'REJECTED', 'FAILED'].includes(providerState)) status = 'FAILED';
  else if (responseCode && responseCode !== '2001') status = 'FAILED';
  return {
    status,
    responseCode: responseCode || null,
    providerState: providerState || null,
    providerTransactionId: String(body?.params?.transactionId ?? body?.params?.referenceId ?? '') || null,
    issuerTransactionId: String(body?.params?.issuerTransactionId ?? '') || null,
    failureCode: status === 'FAILED'
      ? (authenticationFailed ? 'SANDBOX_AUTHENTICATION_FAILED' : (errorCode || responseCode || 'PAYMENT_REJECTED'))
      : null,
    failureMessage: status === 'FAILED'
      ? (authenticationFailed
          ? `The supplied credentials are not valid for the configured ${paymentConfig.environment} environment.`
          : (knownFailureMessages[errorCode] || knownFailureMessages[responseCode] || providerDescription || responseMessage || 'Payment was not approved by the mobile-money provider'))
      : null
  };
};

export const purchaseWithWaafi = async (input) => {
  ensureConfigured();
  const payload = buildWaafiPurchasePayload(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), paymentConfig.timeoutMs);
  try {
    const response = await transport(paymentConfig.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);
    return { requestId: payload.requestId, ...mapProviderResult(body) };
  } catch (error) {
    return {
      requestId: payload.requestId,
      status: 'UNKNOWN',
      responseCode: null,
      providerState: null,
      providerTransactionId: null,
      issuerTransactionId: null,
      failureCode: error?.name === 'AbortError' ? 'PROVIDER_TIMEOUT' : 'PROVIDER_UNAVAILABLE',
      failureMessage: error?.name === 'AbortError' ? 'Payment status is unknown because the provider timed out' : 'Payment provider is temporarily unavailable'
    };
  } finally {
    clearTimeout(timeout);
  }
};
