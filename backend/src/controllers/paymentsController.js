import { createId, readDb, updateDb } from '../lib/db.js';
import { fail, sendCsv, sendJson } from '../lib/http.js';
import { matchesText, paginate, sortNewest, toCsv } from '../lib/query.js';
import { addActivity } from '../services/audit.js';

export const listPayments = async (req, res) => {
  const db = await readDb();
  let items = sortNewest(db.payments);
  const { search, method, status } = req.query;

  if (method && method !== 'Method') items = items.filter((item) => item.method === method);
  if (status && status !== 'All Status') items = items.filter((item) => item.status === status);
  items = items.filter((item) => matchesText(item, ['reference', 'method', 'transactionCode', 'status'], search));

  const today = new Date().toISOString().slice(0, 10);
  const paid = db.payments.filter((item) => item.status === 'Paid');
  const summary = {
    totalCollected: paid.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    todayCollected: paid
      .filter((item) => item.updatedAt?.slice(0, 10) === today || item.createdAt?.slice(0, 10) === today)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0),
    transactions: db.payments.length
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

export const exportPaymentsCsv = async (req, res) => {
  const db = await readDb();
  const csv = toCsv(sortNewest(db.payments), [
    { key: 'reference', header: 'Reference' },
    { key: 'amount', header: 'Amount' },
    { key: 'currency', header: 'Currency' },
    { key: 'method', header: 'Method' },
    { key: 'transactionCode', header: 'Transaction' },
    { key: 'status', header: 'Status' },
    { key: 'createdAt', header: 'Created At' }
  ]);
  sendCsv(res, 'payments.csv', csv);
};
