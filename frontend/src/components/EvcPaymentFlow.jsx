import { useState } from 'react';
import { CheckCircle2, CircleHelp, LoaderCircle, ShieldCheck, XCircle } from 'lucide-react';

const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5055').replace(/\/$/, '');
const amountPattern = /^\d+(?:\.\d{1,2})?$/;
const phonePattern = /^(?:\+?252|0)?61\d{7}$/;
const confirmationTimeoutMs = 60000;
const statusPollMs = 2000;

const cleanEvcPhone = (value) => {
  let digits = String(value ?? '').replace(/\D/g, '');
  while (digits.startsWith('252252')) digits = digits.slice(3);
  return digits.startsWith('252') ? `+${digits}` : digits;
};

const apiRequest = async (path, token, options = {}) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error?.message || 'Payment request failed.');
  return result;
};

export default function EvcPaymentFlow({ application, paymentToken, initialAmount, initialPhone, onClose, onSuccess }) {
  const [amount, setAmount] = useState(initialAmount || '');
  const [phoneNumber, setPhoneNumber] = useState(() => cleanEvcPhone(initialPhone || ''));
  const [preview, setPreview] = useState(null);
  const [payment, setPayment] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const continueToPreview = async () => {
    const normalizedPhone = String(phoneNumber).replace(/[\s()-]/g, '');
    if (!amountPattern.test(String(amount).trim()) || Number(amount) <= 0) return setError('Enter an amount greater than zero with no more than two decimals.');
    if (!phonePattern.test(normalizedPhone)) return setError('Enter a valid EVC Plus number, for example 61XXXXXXX. Do not add +252 twice.');
    setError('');
    setIsLoading(true);
    try {
      const result = await apiRequest('/api/payments/preview', paymentToken, {
        method: 'POST', body: JSON.stringify({ registrationId: application.reference, amount: String(amount).trim(), phoneNumber }),
      });
      setPreview(result.preview);
    } catch (requestError) { setError(requestError.message); }
    finally { setIsLoading(false); }
  };

  const confirmPayment = async () => {
    if (isLoading || payment) return;
    setError('');
    setIsLoading(true);
    try {
      const result = await apiRequest('/api/payments/initiate', paymentToken, {
        method: 'POST',
        body: JSON.stringify({ registrationId: application.reference, amount: String(amount).trim(), phoneNumber, idempotencyKey }),
      });
      let currentPayment = result.payment;
      setPayment(currentPayment);

      const pollingStartedAt = Date.now();
      while (['PENDING', 'PROCESSING'].includes(currentPayment.status) && Date.now() - pollingStartedAt < confirmationTimeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, statusPollMs));
        const statusResult = await apiRequest(`/api/payments/${encodeURIComponent(currentPayment.referenceId)}/status`, paymentToken);
        currentPayment = statusResult.payment;
        setPayment(currentPayment);
      }

      if (currentPayment.status === 'SUCCESS') {
        const receiptResult = await apiRequest(`/api/payments/${encodeURIComponent(currentPayment.referenceId)}/receipt`, paymentToken);
        setReceipt(receiptResult.receipt);
      }
    } catch (requestError) { setError(requestError.message); }
    finally { setIsLoading(false); }
  };

  const retry = () => { setIdempotencyKey(crypto.randomUUID()); setPayment(null); setReceipt(null); setPreview(null); setError(''); };

  return (
    <div className="evc-overlay" role="dialog" aria-modal="true" aria-labelledby="evc-title">
      <section className="evc-dialog">
        {!preview && !payment && <>
          <div className="evc-heading"><ShieldCheck /><div><h2 id="evc-title">Secure EVC Plus Payment</h2><p>Your EVC confirmation happens only on your phone.</p></div></div>
          <dl className="evc-registration"><div><dt>Application</dt><dd>{application.reference}</dd></div><div><dt>Applicant</dt><dd>{application.fullName}</dd></div></dl>
          <label><span>Amount</span><div className="evc-input-row"><input inputMode="decimal" value={amount} readOnly /><b>USD</b></div></label>
          <label><span>EVC Plus phone number</span><input inputMode="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(cleanEvcPhone(event.target.value))} placeholder="611111111" /></label>
          {error && <p className="evc-error">{error}</p>}
          <div className="evc-actions"><button className="evc-secondary" onClick={onClose} type="button">Pay later</button><button disabled={isLoading} onClick={continueToPreview} type="button">{isLoading ? 'Checking…' : 'Continue'}</button></div>
        </>}

        {preview && !payment && <>
          <div className="evc-heading"><ShieldCheck /><div><h2 id="evc-title">Confirm your payment</h2><p>Check the amount and EVC Plus number before confirming.</p></div></div>
          <dl className="evc-confirmation">
            <div><dt>Pay to</dt><dd>{preview.merchantName}</dd></div>
            {preview.merchantPhone && <div><dt>Merchant number</dt><dd>{preview.merchantPhone}</dd></div>}
            <div><dt>Pay from</dt><dd>{preview.payerPhone}</dd></div><div><dt>Amount</dt><dd>{preview.amount.toFixed(2)} {preview.currency}</dd></div>
            <div><dt>Registration</dt><dd>{preview.registrationId}</dd></div><div><dt>Purpose</dt><dd>{preview.description}</dd></div>
          </dl>
          <p className="evc-secure-message">EVCPlus -&gt; Ma hubtaa in aad u dirtid JAAMACADDA JAMHURIYA lacag dhan $0.1 ?<br />1. Haa<br />2. Maya</p>
          {isLoading && <p className="evc-processing"><LoaderCircle className="evc-spin" /> Payment request sent. Approve the EVC prompt on your phone within 60 seconds. Keep this window open.</p>}
          {error && <p className="evc-error">{error}</p>}
          <div className="evc-actions"><button className="evc-secondary" disabled={isLoading} onClick={() => setPreview(null)} type="button">Cancel</button><button disabled={isLoading} onClick={confirmPayment} type="button">{isLoading ? 'Processing…' : 'Pay with EVC Plus'}</button></div>
        </>}

        {payment && <>
          <div className={`evc-result ${payment.status === 'SUCCESS' ? 'success' : 'failed'}`}>
            {payment.status === 'SUCCESS' ? <CheckCircle2 /> : payment.status === 'PROCESSING' ? <LoaderCircle className="evc-spin" /> : payment.status === 'UNKNOWN' ? <CircleHelp /> : <XCircle />}
            <h2 id="evc-title">{payment.status === 'SUCCESS' ? 'Payment Successful' : payment.status === 'PROCESSING' ? 'Payment Processing' : payment.status === 'UNKNOWN' ? 'Payment Status Unknown' : 'Payment Not Completed'}</h2>
            <p>{payment.status === 'SUCCESS' ? 'Your registration payment was approved.' : payment.failureMessage || 'Please check your EVC confirmation message before trying again.'}</p>
          </div>
          <dl className="evc-confirmation">
            <div><dt>Amount</dt><dd>{Number(payment.amount).toFixed(2)} {payment.currency}</dd></div><div><dt>Reference</dt><dd>{payment.referenceId}</dd></div>
            <div><dt>Paid from</dt><dd>{payment.payerPhone}</dd></div><div><dt>Status</dt><dd>{payment.providerState || payment.status}</dd></div>
            {receipt?.providerTransactionId && <div><dt>Transaction ID</dt><dd>{receipt.providerTransactionId}</dd></div>}{receipt?.paidAt && <div><dt>Date</dt><dd>{new Date(receipt.paidAt).toLocaleString()}</dd></div>}
          </dl>
          {receipt?.walletBalanceMessage && <p className="evc-secure-message">{receipt.walletBalanceMessage}</p>}
          {payment.status === 'UNKNOWN' && payment.failureCode === 'PROVIDER_UNAVAILABLE' && <p className="evc-secure-message">The request could not reach WaafiPay. No approval was received. Check your EVC balance or SMS first, then retry.</p>}
          <div className="evc-actions">{((['FAILED', 'CANCELLED'].includes(payment.status) && payment.failureCode !== 'SANDBOX_AUTHENTICATION_FAILED') || (payment.status === 'UNKNOWN' && payment.failureCode === 'PROVIDER_UNAVAILABLE')) && <button className="evc-secondary" onClick={retry} type="button">Retry</button>}<button onClick={() => payment.status === 'SUCCESS' ? onSuccess(payment, receipt) : onClose()} type="button">Done</button></div>
        </>}
      </section>
    </div>
  );
}
