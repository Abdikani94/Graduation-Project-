import { sendJson } from '../lib/http.js';
import { getPaymentReceipt, getPaymentStatus, initiatePayment, previewPayment } from '../services/paymentService.js';

export const preview = async (req, res) => {
  const previewData = await previewPayment({ ...(req.body || {}), owner: req.paymentOwner });
  sendJson(res, 200, { success: true, preview: previewData });
};

export const initiate = async (req, res) => {
  const payment = await initiatePayment({ ...(req.body || {}), owner: req.paymentOwner });
  sendJson(res, 200, {
    success: payment.status === 'SUCCESS',
    message: payment.status === 'PROCESSING' || payment.status === 'PENDING'
      ? 'Payment request sent. Please check your phone and complete the secure EVC confirmation.'
      : undefined,
    payment
  });
};

export const status = async (req, res) => {
  const payment = await getPaymentStatus({ referenceId: req.params.referenceId, owner: req.paymentOwner });
  sendJson(res, 200, { payment });
};

export const receipt = async (req, res) => {
  const receiptData = await getPaymentReceipt({ referenceId: req.params.referenceId, owner: req.paymentOwner });
  sendJson(res, 200, { receipt: receiptData });
};
