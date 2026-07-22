import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendCsv, sendJson, sendNoContent } from '../lib/http.js';
import { matchesText, paginate, sortNewest, toCsv } from '../lib/query.js';
import { addActivity } from '../services/audit.js';

const paymentView = (db, item) => {
  const application = db.applications.find((entry) => entry.id === item.applicationId || entry.reference === item.registrationReference || entry.reference === item.reference) || {};
  const student = db.students.find((entry) => entry.applicationId === application.id) || {};
  return {
    id: item.id,
    applicationId: item.applicationId,
    applicantName: application.fullName || student.fullName || '',
    studentNumber: student.studentNumber || application.studentNumber || '',
    faculty: application.faculty || student.faculty || '',
    program: application.department || student.department || '',
    reference: item.reference || item.registrationReference || application.reference || '',
    paymentReference: item.referenceId || '',
    invoiceId: item.invoiceId || '',
    amount: Number(item.amount || 0),
    currency: item.currency || 'USD',
    method: item.method || item.paymentMethod || '',
    provider: item.provider || '',
    transactionCode: item.transactionCode || item.providerTransactionId || '',
    issuerTransactionId: item.issuerTransactionId || '',
    status: item.status || 'Pending',
    providerState: item.providerState || '',
    payerPhone: item.payerPhoneMasked || '',
    description: item.description || 'Admission payment',
    failureMessage: item.failureMessage || '',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    paidAt: item.paidAt || null
  };
};

export const listPayments = async (req, res) => {
  const db = await readDb();
  let items = sortNewest(db.payments).map((item) => paymentView(db, item));
  const { search, method, status } = req.query;

  if (method && method !== 'Method') items = items.filter((item) => item.method === method);
  if (status && status !== 'All Status') items = items.filter((item) => item.status === status);
  items = items.filter((item) => matchesText(item, ['reference', 'paymentReference', 'studentNumber', 'applicantName', 'payerPhone', 'method', 'transactionCode', 'status'], search));

  const today = new Date().toISOString().slice(0, 10);
  const paid = db.payments.filter((item) => ['Paid', 'SUCCESS'].includes(item.status));
  const summary = {
    totalCollected: paid.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    todayCollected: paid
      .filter((item) => item.updatedAt?.slice(0, 10) === today || item.createdAt?.slice(0, 10) === today)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    transactions: db.payments.length,
    successful: paid.length,
    pending: db.payments.filter((item) => ['Pending', 'PENDING', 'PROCESSING', 'UNKNOWN'].includes(item.status)).length,
    failed: db.payments.filter((item) => ['Failed', 'FAILED'].includes(item.status)).length
  };

  sendJson(res, 200, { ...paginate(items, req.query), summary });
};

export const createPayment = async (req, res) => {
  const { applicationId, reference, amount, method, transactionCode = '' } = req.body || {};
  if (!amount || !method) fail(422, 'Amount and method are required');

  const payment = await updateDb((db) => {
    const application = db.applications.find((item) => item.id === applicationId || item.reference === reference);
    const now = new Date().toISOString();
    const item = {
      id: createId('pay'),
      applicationId: application?.id || applicationId || '',
      reference: application?.reference || reference || '',
      amount: Number(amount),
      currency: db.settings.currency || 'USD',
      method,
      transactionCode,
      status: 'Pending',
      createdAt: now,
      updatedAt: now
    };
    db.payments.unshift(item);
    addActivity(db, req, {
      action: 'Created Payment',
      afterAction: 'Pending',
      applicantPerson: application?.fullName || '',
      applicationReference: item.reference,
      module: 'Payments'
    });
    return item;
  });

  sendJson(res, 201, { payment });
};

export const updatePaymentStatus = async (req, res) => {
  const { status, transactionCode } = req.body || {};
  const allowed = new Set(['Pending', 'Paid', 'Failed', 'Refunded']);
  if (!allowed.has(status)) fail(422, 'Invalid payment status');

  const payment = await updateDb((db) => {
    const found = db.payments.find((item) => item.id === req.params.id);
    if (!found) fail(404, 'Payment not found');
    const before = found.status;
    found.status = status;
    if (transactionCode !== undefined) found.transactionCode = transactionCode;
    found.updatedAt = new Date().toISOString();

    const application = db.applications.find((item) => item.id === found.applicationId);
    if (application) {
      application.paymentStatus = status;
      application.updatedAt = found.updatedAt;
    }

    addActivity(db, req, {
      action: `${status} Payment`,
      beforeAction: before,
      afterAction: status,
      applicantPerson: application?.fullName || '',
      applicationReference: found.reference,
      module: 'Payments'
    });
    return found;
  });

  sendJson(res, 200, { payment });
};

export const updatePayment = async (req, res) => {
  const payment = await updateDb((db) => {
    const found = db.payments.find((item) => item.id === req.params.id);
    if (!found) fail(404, 'Payment not found');
    const before = found.status;
    for (const key of ['reference', 'applicationId', 'method', 'transactionCode', 'currency']) {
      if (req.body[key] !== undefined) found[key] = req.body[key];
    }
    if (req.body.amount !== undefined) found.amount = Number(req.body.amount);
    if (req.body.status !== undefined) {
      const allowed = new Set(['Pending', 'Paid', 'Failed', 'Refunded']);
      if (!allowed.has(req.body.status)) fail(422, 'Invalid payment status');
      found.status = req.body.status;
    }
    found.updatedAt = new Date().toISOString();

    const application = db.applications.find((item) => item.id === found.applicationId || item.reference === found.reference);
    if (application) {
      application.paymentStatus = found.status;
      application.updatedAt = found.updatedAt;
    }

    addActivity(db, req, {
      action: 'Updated Payment',
      beforeAction: before,
      afterAction: found.status,
      applicantPerson: application?.fullName || '',
      applicationReference: found.reference,
      module: 'Payments'
    });
    return found;
  });

  sendJson(res, 200, { payment });
};

export const deletePayment = async (req, res) => {
  await updateDb((db) => {
    const index = db.payments.findIndex((item) => item.id === req.params.id);
    if (index === -1) fail(404, 'Payment not found');
    const [payment] = db.payments.splice(index, 1);
    addActivity(db, req, {
      action: 'Deleted Payment',
      beforeAction: payment.status,
      applicationReference: payment.reference,
      module: 'Payments'
    });
  });
  sendNoContent(res);
};

export const exportPaymentsCsv = async (req, res) => {
  const db = await readDb();
  let items = sortNewest(db.payments).map((item) => paymentView(db, item));
  const { search, method, status } = req.query;
  if (method && method !== 'Method') items = items.filter((item) => item.method === method);
  if (status && status !== 'All Status') items = items.filter((item) => item.status === status);
  items = items.filter((item) => matchesText(item, ['reference', 'paymentReference', 'studentNumber', 'applicantName', 'payerPhone', 'method', 'transactionCode', 'status'], search));

  const csv = toCsv(items, [
    { key: 'reference', header: 'Reference' },
    { key: 'paymentReference', header: 'Payment Reference' },
    { key: 'studentNumber', header: 'Student Number' },
    { key: 'applicantName', header: 'Student Name' },
    { key: 'payerPhone', header: 'Payer Phone (Masked)' },
    { key: 'amount', header: 'Amount' },
    { key: 'currency', header: 'Currency' },
    { key: 'method', header: 'Method' },
    { key: 'transactionCode', header: 'Transaction' },
    { key: 'status', header: 'Status' },
    { key: 'providerState', header: 'Provider State' },
    { key: 'paidAt', header: 'Paid At' },
    { key: 'createdAt', header: 'Created At' }
  ]);
  sendCsv(res, 'payments.csv', csv);
};
