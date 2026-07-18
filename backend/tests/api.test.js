import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jamhuriya-backend-'));
process.env.DB_DRIVER = 'json';
process.env.DB_FILE = path.join(tmpDir, 'database.json');
process.env.UPLOAD_DIR = path.join(tmpDir, 'uploads');
process.env.JWT_SECRET = 'test-secret';
process.env.WAAFI_MERCHANT_UID = 'test-merchant';
process.env.WAAFI_API_USER_ID = 'test-user';
process.env.WAAFI_API_KEY = 'super-secret-test-api-key';
process.env.WAAFI_MINIMUM_AMOUNT = '0.01';
process.env.WAAFI_MAXIMUM_AMOUNT = '1000';
process.env.WAAFI_REQUEST_TIMEOUT_MS = '20';

const { createApp } = await import('../src/app.js');
const { ensureDb } = await import('../src/lib/db.js');
const { setWaafiTransportForTests } = await import('../src/providers/waafiPayProvider.js');
const { normalizeSomaliEvcPhone } = await import('../src/validators/phoneValidator.js');
const { parseAmountToMinor } = await import('../src/validators/paymentValidator.js');

await ensureDb();

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const validApplication = (overrides = {}) => ({
  fullName: 'Test Applicant',
  motherName: 'Test Mother',
  nationality: 'Somali',
  nationalId: 'SO-TEST-1001',
  rollNumber: 'ROLL-1001',
  dateOfBirth: '2002-01-15',
  placeOfBirth: 'Mogadishu',
  district: 'Hodan',
  area: 'Taleex',
  email: 'test.applicant@example.com',
  mobile: '610000000',
  sex: 'Male',
  maritalStatus: 'Single',
  emergencyName: 'Emergency Contact',
  emergencyTell: '610000002',
  relationship: 'Father',
  familyStudied: 'Maya',
  schoolName: 'Jamhuriya Secondary School',
  schoolDistrict: 'Hodan',
  graduationYear: '2022',
  percentage: 'A',
  heardFrom: 'Social Media',
  program: 'Computer Science & IT',
  department: 'Computer Application',
  modeOfStudy: 'Full Time',
  paymentPlan: 'Admission fee only',
  paymentMethod: 'EVC Plus',
  hasCertificate: 'No',
  appointmentDate: tomorrow,
  appointmentTime: '09:30',
  ...overrides
});

const request = async ({ method = 'GET', path: requestPath, token, body }) =>
  new Promise((resolve, reject) => {
    const server = http.createServer(createApp());
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const payload = body ? JSON.stringify(body) : null;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: requestPath,
          method,
          headers: {
            ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        },
        (res) => {
          const chunks = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            server.close();
            const text = Buffer.concat(chunks).toString('utf8');
            resolve({
              status: res.statusCode,
              body: text ? JSON.parse(text) : null
            });
          });
        }
      );
      req.on('error', (error) => {
        server.close();
        reject(error);
      });
      if (payload) req.write(payload);
      req.end();
    });
  });

test('health check responds', async () => {
  const response = await request({ path: '/health' });
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
});

test('admin can login and read dashboard', async () => {
  const login = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      username: 'admin',
      password: 'admin12345'
    }
  });
  assert.equal(login.status, 200);
  assert.ok(login.body.token);

  const dashboard = await request({
    path: '/api/dashboard',
    token: login.body.token
  });
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.body.stats.totalApplications >= 1);
});

let applicantPaymentAccess;
let applicantRegistration;

test('public applicant can submit an application', async () => {
  const response = await request({
    method: 'POST',
    path: '/api/applications',
    body: validApplication()
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.application.status, 'DRAFT');
  assert.equal(response.body.application.admissionFee, 25);
  assert.equal(response.body.application.paymentStatus, 'UNPAID');
  assert.equal(response.body.payment, null);
  assert.ok(response.body.paymentAccessToken);
  applicantPaymentAccess = response.body.paymentAccessToken;
  applicantRegistration = response.body.application;
});

test('certificate appointment is required when applicant has no certificate', async () => {
  const response = await request({
    method: 'POST',
    path: '/api/applications',
    body: validApplication({
      fullName: 'Missing Appointment',
      email: 'missing.appointment@example.com',
      mobile: '610000001',
      appointmentDate: '',
      appointmentTime: ''
    })
  });
  assert.equal(response.status, 422);
  assert.deepEqual(response.body.error.details, ['appointmentDate', 'appointmentTime']);
});

test('public visitor can submit a contact message', async () => {
  const response = await request({
    method: 'POST',
    path: '/api/contact-messages',
    body: {
      name: 'Contact Visitor',
      email: 'contact.visitor@example.com',
      phone: '612345000',
      type: 'Admission',
      message: 'I need admission information.'
    }
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.contact.status, 'Pending');
});

test('admin cannot create an academic program shorter than 5 years', async () => {
  const login = await request({
    method: 'POST',
    path: '/api/auth/login',
    body: {
      username: 'admin',
      password: 'admin12345'
    }
  });

  const response = await request({
    method: 'POST',
    path: '/api/programs/fac_engineering/departments',
    token: login.body.token,
    body: {
      name: 'Short Program',
      durationYears: 4
    }
  });

  assert.equal(response.status, 422);
  assert.match(response.body.error.message, /at least 5 years/);
});

const providerResponse = (body) => async () => ({
  ok: true,
  status: 200,
  json: async () => body
});

const paymentBody = (overrides = {}) => ({
  registrationId: applicantRegistration.reference,
  amount: '10.00',
  phoneNumber: '0618827482',
  idempotencyKey: `idem-${crypto.randomUUID()}`,
  ...overrides
});

const createPaymentDraft = async () => {
  const suffix = crypto.randomBytes(4).toString('hex');
  const response = await request({
    method: 'POST',
    path: '/api/applications',
    body: validApplication({
      fullName: 'Payment Test Applicant',
      nationalId: `SO-${suffix}`,
      rollNumber: `ROLL-${suffix}`,
      email: `payment-${suffix}@example.com`
    })
  });
  assert.equal(response.status, 201);
  return { application: response.body.application, token: response.body.paymentAccessToken };
};

const draftPaymentBody = (draft, overrides = {}) => paymentBody({ registrationId: draft.application.reference, ...overrides });

test('dynamic amounts and Somali EVC phone formats validate safely', () => {
  assert.equal(parseAmountToMinor('10'), 1000);
  assert.equal(parseAmountToMinor('10.25'), 1025);
  assert.equal(parseAmountToMinor('0.01'), 1);
  assert.throws(() => parseAmountToMinor('0'));
  assert.throws(() => parseAmountToMinor('-1'));
  assert.throws(() => parseAmountToMinor('1.001'));
  assert.throws(() => parseAmountToMinor('1001'));
  assert.equal(normalizeSomaliEvcPhone('618827482'), '252618827482');
  assert.equal(normalizeSomaliEvcPhone('0618827482'), '252618827482');
  assert.equal(normalizeSomaliEvcPhone('+252618827482'), '252618827482');
  assert.equal(normalizeSomaliEvcPhone('252618827482'), '252618827482');
  assert.throws(() => normalizeSomaliEvcPhone('621234567'));
});

test('payment preview validates ownership, amount, and masks phone numbers', async () => {
  const response = await request({
    method: 'POST', path: '/api/payments/preview', token: applicantPaymentAccess,
    body: paymentBody()
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.preview.amount, 10);
  assert.equal(response.body.preview.payerPhone, '25261****482');
  assert.equal(JSON.stringify(response.body).includes('252618827482'), false);

  const unauthorized = await request({
    method: 'POST', path: '/api/payments/preview', token: applicantPaymentAccess,
    body: paymentBody({ registrationId: 'JUM-2026-0001' })
  });
  assert.equal(unauthorized.status, 403);

  const missing = await request({
    method: 'POST', path: '/api/payments/preview', token: applicantPaymentAccess,
    body: paymentBody({ registrationId: 'REG-NOT-FOUND' })
  });
  assert.equal(missing.status, 404);
});

test('backend rejects submission before a confirmed EVC payment', async () => {
  const response = await request({
    method: 'POST',
    path: `/api/applications/${applicantRegistration.reference}/submit`,
    token: applicantPaymentAccess
  });
  assert.equal(response.status, 409);
  assert.equal(response.body.error.message, 'A confirmed payment is required before submitting this application.');
});

test('approved payment is idempotent and produces a safe partial-payment receipt', async () => {
  let calls = 0;
  setWaafiTransportForTests(async () => {
    calls += 1;
    return { ok: true, status: 200, json: async () => ({ responseCode: '2001', params: { state: 'approved', transactionId: 'TX-1268666' } }) };
  });
  const body = paymentBody();
  const [first, duplicate] = await Promise.all([
    request({ method: 'POST', path: '/api/payments/initiate', token: applicantPaymentAccess, body }),
    request({ method: 'POST', path: '/api/payments/initiate', token: applicantPaymentAccess, body })
  ]);
  assert.equal(first.status, 200);
  assert.equal(first.body.payment.status, 'SUCCESS');
  assert.equal(duplicate.body.payment.referenceId, first.body.payment.referenceId);
  assert.equal(calls, 1);

  const receiptResponse = await request({
    path: `/api/payments/${first.body.payment.referenceId}/receipt`, token: applicantPaymentAccess
  });
  assert.equal(receiptResponse.status, 200);
  assert.equal(receiptResponse.body.receipt.providerTransactionId, 'TX-1268666');
  assert.match(receiptResponse.body.receipt.walletBalanceMessage, /confirmation message/i);
  const serialized = JSON.stringify(receiptResponse.body);
  assert.equal(serialized.includes('super-secret-test-api-key'), false);
  assert.equal(serialized.includes('252618827482'), false);
  assert.equal(serialized.toLowerCase().includes('walletbalance":'), false);
});

test('HTTP 200 without approved provider state is not successful', async () => {
  setWaafiTransportForTests(providerResponse({ responseCode: '2001', params: { state: 'DECLINED' } }));
  const response = await request({ method: 'POST', path: '/api/payments/initiate', token: applicantPaymentAccess, body: paymentBody({ amount: '2.00' }) });
  assert.equal(response.status, 200);
  assert.equal(response.body.payment.status, 'FAILED');
});

test('sandbox authentication failure is reported clearly and safely', async () => {
  const authDraft = await createPaymentDraft();
  setWaafiTransportForTests(providerResponse({
    responseCode: '5001',
    errorCode: '1001',
    responseMsg: 'Request could not be processed. Please check the error details and try again.',
    params: { description: 'Authentication failed' }
  }));
  const response = await request({
    method: 'POST', path: '/api/payments/initiate', token: authDraft.token,
    body: draftPaymentBody(authDraft, { amount: '1.00' })
  });
  assert.equal(response.body.payment.status, 'FAILED');
  assert.equal(response.body.payment.failureCode, 'SANDBOX_AUTHENTICATION_FAILED');
  assert.match(response.body.payment.failureMessage, /not appear to be valid for the Sandbox environment/);
  assert.equal(JSON.stringify(response.body).includes('super-secret-test-api-key'), false);
});

test('pending and malformed provider responses remain non-successful', async () => {
  const pendingDraft = await createPaymentDraft();
  setWaafiTransportForTests(providerResponse({ responseCode: '2001', params: { state: 'PENDING' } }));
  const pending = await request({ method: 'POST', path: '/api/payments/initiate', token: pendingDraft.token, body: draftPaymentBody(pendingDraft, { amount: '2.00' }) });
  assert.equal(pending.body.payment.status, 'PROCESSING');

  const malformedDraft = await createPaymentDraft();
  setWaafiTransportForTests(providerResponse({ unexpected: true }));
  const malformed = await request({ method: 'POST', path: '/api/payments/initiate', token: malformedDraft.token, body: draftPaymentBody(malformedDraft, { amount: '2.00' }) });
  assert.equal(malformed.body.payment.status, 'UNKNOWN');
});

test('provider timeout is UNKNOWN instead of FAILED', async () => {
  const timeoutDraft = await createPaymentDraft();
  setWaafiTransportForTests((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
  }));
  const response = await request({ method: 'POST', path: '/api/payments/initiate', token: timeoutDraft.token, body: draftPaymentBody(timeoutDraft, { amount: '2.00' }) });
  assert.equal(response.body.payment.status, 'UNKNOWN');
  assert.equal(response.body.payment.failureCode, 'PROVIDER_TIMEOUT');
});

test('full payment updates registration and overpayment is rejected', async () => {
  setWaafiTransportForTests(providerResponse({ responseCode: '2001', params: { state: 'APPROVED', transactionId: 'TX-FINAL' } }));
  const full = await request({ method: 'POST', path: '/api/payments/initiate', token: applicantPaymentAccess, body: paymentBody({ amount: '15.00' }) });
  assert.equal(full.body.payment.status, 'SUCCESS');

  const overpayment = await request({ method: 'POST', path: '/api/payments/preview', token: applicantPaymentAccess, body: paymentBody({ amount: '1.00' }) });
  assert.equal(overpayment.status, 422);

  const submission = await request({
    method: 'POST', path: `/api/applications/${applicantRegistration.reference}/submit`, token: applicantPaymentAccess
  });
  assert.equal(submission.status, 200);
  assert.equal(submission.body.application.status, 'Pending');
  assert.equal(submission.body.application.paymentStatus, 'PAID');
  assert.equal(submission.body.application.paymentTransactionId, 'TX-FINAL');
});

test('frontend has no EVC PIN input field', async () => {
  const source = await fs.readFile(new URL('../../frontend/src/components/EvcPaymentFlow.jsx', import.meta.url), 'utf8');
  assert.equal(/name=["'](?:evc)?pin["']/i.test(source), false);
  assert.equal(/type=["']password["']/i.test(source), false);
  const applyPage = await fs.readFile(new URL('../../frontend/src/pages/ApplyPage.jsx', import.meta.url), 'utf8');
  assert.match(applyPage, /confirmedEvcPayment\?\.status !== 'SUCCESS'/);
});
