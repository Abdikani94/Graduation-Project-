import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Download, Eye, Phone, ReceiptText, Search, ShieldCheck, WalletCards, X, XCircle } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';

const methods = ['Method', 'EVC Plus', 'eDahab'];
const statuses = ['All Status', 'SUCCESS', 'PENDING', 'PROCESSING', 'UNKNOWN', 'FAILED', 'Paid', 'Pending', 'Failed', 'Refunded'];
const money = (value, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2 }).format(Number(value || 0));
const formatDateTime = (value) => value ? new Date(value).toLocaleString() : 'Not available';

const statusMeta = (status) => {
  if (['SUCCESS', 'Paid'].includes(status)) return { label: 'Successful', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 };
  if (['PENDING', 'PROCESSING', 'Pending'].includes(status)) return { label: status === 'PROCESSING' ? 'Processing' : 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200', icon: Clock3 };
  if (status === 'UNKNOWN') return { label: 'Needs verification', className: 'bg-blue-50 text-blue-700 border-blue-200', icon: ShieldCheck };
  if (['FAILED', 'Failed'].includes(status)) return { label: 'Failed', className: 'bg-red-50 text-red-700 border-red-200', icon: XCircle };
  return { label: status || 'Unknown', className: 'bg-slate-50 text-slate-600 border-slate-200', icon: Clock3 };
};

const StatusBadge = ({ status }) => {
  const meta = statusMeta(status);
  const Icon = meta.icon;
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.className}`}><Icon size={13}/>{meta.label}</span>;
};

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ totalCollected: 0, todayCollected: 0, transactions: 0, successful: 0, pending: 0, failed: 0 });
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('Method');
  const [status, setStatus] = useState('All Status');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [toast, setToast] = useState(null);

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await api.get('/payments', { page, limit: 10, search, method, status });
      setPayments(result.data || []);
      setSummary(result.summary || {});
      setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      setToast({ type: 'error', title: 'Payments error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [method, page, search, status]);

  useEffect(() => { loadPayments(); }, [loadPayments]);
  useEffect(() => { setPage(1); }, [search, method, status]);

  const exportCsv = async () => {
    try { await api.downloadCsv('/payments/export/csv', 'jamhuriya-payment-ledger.csv', { search, method, status }); }
    catch (error) { setToast({ type: 'error', title: 'Export failed', message: error.message }); }
  };

  return (
    <PageLayout className="payments-ledger-page">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-600">Finance & reconciliation</p>
          <h1 className="mt-1 text-3xl font-extrabold text-[#14294b]">Payment Transactions</h1>
          <p className="mt-1 text-sm text-slate-500">Secure WaafiPay payment records linked to each applicant and student.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700"><ShieldCheck size={17}/> Sensitive credentials and full payer numbers are never displayed.</div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={WalletCards} title="Total Collected" value={money(summary.totalCollected)} color="#00A451" iconColor="#00A451" />
        <StatCard icon={WalletCards} title="Collected Today" value={money(summary.todayCollected)} color="#2563eb" iconColor="#2563eb" />
        <StatCard icon={CheckCircle2} title="Successful Payments" value={Number(summary.successful || 0).toLocaleString()} color="#303b97" iconColor="#303b97" />
        <StatCard icon={ReceiptText} title="All Attempts" value={Number(summary.transactions || 0).toLocaleString()} color="#fb923c" iconColor="#fb923c" />
      </section>

      <Card className="grid gap-3 p-4 md:grid-cols-[minmax(240px,1fr)_180px_190px_auto]">
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 focus-within:border-[#303b97] focus-within:bg-white">
          <Search size={18} className="text-slate-400"/>
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Student, number, reference, phone or transaction ID" />
        </label>
        <select value={method} onChange={(event) => setMethod(event.target.value)} className="min-h-12 border border-slate-200 bg-white px-4 text-sm">{methods.map((item) => <option key={item}>{item}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="min-h-12 border border-slate-200 bg-white px-4 text-sm">{statuses.map((item) => <option key={item}>{item}</option>)}</select>
        <button onClick={exportCsv} className="admin-button admin-button--primary min-h-12"><Download size={17}/>Export Ledger</button>
      </Card>

      <Card className="overflow-hidden">
        <div className="hidden lg:block">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-[.06em] text-slate-500"><tr><th className="w-[21%] px-5 py-4">Student</th><th className="w-[18%] px-4 py-4">References</th><th className="w-[13%] px-4 py-4">Payer</th><th className="w-[10%] px-4 py-4">Amount</th><th className="w-[11%] px-4 py-4">Status</th><th className="w-[18%] px-4 py-4">Transaction</th><th className="w-[9%] px-4 py-4 text-center">Details</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && <tr><td colSpan="7" className="p-12 text-center text-slate-500">Loading secure payment records...</td></tr>}
              {!isLoading && !payments.length && <tr><td colSpan="7" className="p-12 text-center"><ReceiptText className="mx-auto text-slate-300" size={35}/><strong className="mt-3 block text-[#14294b]">No payment records found</strong><span className="mt-1 block text-xs text-slate-500">Try changing the filters or search terms.</span></td></tr>}
              {!isLoading && payments.map((item) => <tr key={item.id} className="transition hover:bg-slate-50/70">
                <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#303b97]/10 font-bold text-[#303b97]">{(item.applicantName || 'S').slice(0,1)}</span><div className="min-w-0"><strong className="block truncate text-[13px] text-[#14294b]">{item.applicantName || 'Applicant not linked'}</strong><span className="block truncate text-[11px] font-semibold text-[#303b97]">{item.studentNumber || 'Student number pending'}</span><small className="block truncate text-slate-400">{item.program || item.faculty || 'Program not available'}</small></div></div></td>
                <td className="px-4 py-4"><strong className="block truncate text-xs text-[#14294b]">{item.reference || '—'}</strong><small className="mt-1 block truncate font-mono text-[10px] text-slate-400">{item.paymentReference || item.id}</small></td>
                <td className="px-4 py-4"><span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Phone size={14}/>{item.payerPhone || 'Not stored'}</span><small className="mt-1 block text-slate-400">{item.method || 'Payment method'}</small></td>
                <td className="px-4 py-4 font-extrabold text-[#14294b]">{money(item.amount, item.currency)}</td>
                <td className="px-4 py-4"><StatusBadge status={item.status}/></td>
                <td className="px-4 py-4"><strong className="block truncate font-mono text-xs text-[#14294b]">{item.transactionCode || 'Awaiting provider ID'}</strong><small className="mt-1 block text-slate-400">{formatDateTime(item.paidAt || item.createdAt)}</small></td>
                <td className="px-4 py-4 text-center"><button title="View transaction details" aria-label="View transaction details" onClick={() => setSelectedPayment(item)} className="admin-icon-button"><Eye size={17}/></button></td>
              </tr>)}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 lg:hidden">{isLoading ? <p className="p-8 text-center text-sm text-slate-500">Loading payments...</p> : payments.map((item) => <article key={item.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><strong className="text-[#14294b]">{item.applicantName || item.reference}</strong><p className="text-xs font-semibold text-[#303b97]">{item.studentNumber || 'Student number pending'}</p></div><StatusBadge status={item.status}/></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-400">Amount</dt><dd className="mt-1 font-bold text-[#14294b]">{money(item.amount,item.currency)}</dd></div><div><dt className="text-slate-400">Payer</dt><dd className="mt-1 font-semibold">{item.payerPhone || 'Not stored'}</dd></div><div className="col-span-2"><dt className="text-slate-400">Transaction</dt><dd className="mt-1 break-all font-mono">{item.transactionCode || 'Awaiting provider ID'}</dd></div></dl><button onClick={() => setSelectedPayment(item)} className="admin-button admin-button--secondary mt-4 w-full"><Eye size={15}/>View Details</button></article>)}</div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4"><p className="text-xs font-medium text-slate-500">Page {pagination.page || 1} of {pagination.pages || 1} · {pagination.total || 0} payment attempts</p><div className="flex gap-2"><button disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="admin-button admin-button--secondary admin-button--compact">Previous</button><button disabled={page >= pagination.pages || isLoading} onClick={() => setPage((value) => Math.min(value + 1, pagination.pages))} className="admin-button admin-button--primary admin-button--compact">Next</button></div></footer>
      </Card>

      {selectedPayment && <div className="fixed inset-0 z-[80] grid place-items-center bg-[#0b1730]/65 p-4 backdrop-blur-sm" onMouseDown={() => setSelectedPayment(null)}><section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-[0_30px_90px_rgba(6,20,45,.4)]" onMouseDown={(event) => event.stopPropagation()}><header className="relative bg-gradient-to-br from-[#253b76] to-[#176783] px-7 py-6 text-white"><button onClick={() => setSelectedPayment(null)} className="absolute right-5 top-5 grid h-9 w-9 place-items-center border border-white/20 bg-white/10"><X size={18}/></button><span className="grid h-12 w-12 place-items-center rounded-xl bg-white/15"><ReceiptText size={25}/></span><h2 className="mt-4 text-2xl font-extrabold">Transaction Details</h2><p className="mt-1 text-sm text-white/75">Official stored provider and student payment information.</p></header><div className="p-7"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5"><div><span className="text-xs text-slate-400">Amount paid/requested</span><strong className="block text-3xl text-[#14294b]">{money(selectedPayment.amount, selectedPayment.currency)}</strong></div><StatusBadge status={selectedPayment.status}/></div><dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">{[
        ['Student name', selectedPayment.applicantName || 'Not linked'], ['Student number', selectedPayment.studentNumber || 'Pending until enrollment'],
        ['Application reference', selectedPayment.reference || 'Not available'], ['Payment reference', selectedPayment.paymentReference || selectedPayment.id],
        ['Invoice ID', selectedPayment.invoiceId || 'Not available'], ['Masked payer phone', selectedPayment.payerPhone || 'Not stored'],
        ['Payment method', selectedPayment.method || 'Not available'], ['Provider', selectedPayment.provider || 'WaafiPay'],
        ['Provider transaction ID', selectedPayment.transactionCode || 'Not issued'], ['Provider state', selectedPayment.providerState || selectedPayment.status],
        ['Created', formatDateTime(selectedPayment.createdAt)], ['Paid/updated', formatDateTime(selectedPayment.paidAt || selectedPayment.updatedAt)]
      ].map(([label,value]) => <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[#14294b]">{value}</dd></div>)}</dl>{selectedPayment.failureMessage && <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"><strong className="block">Provider error</strong>{selectedPayment.failureMessage}</div>}<p className="mt-5 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-700"><ShieldCheck className="mt-0.5 shrink-0" size={16}/>Only masked payer information is shown. API credentials, encryption keys, and full wallet numbers remain protected on the backend.</p></div></section></div>}
    </PageLayout>
  );
};

export default Payments;
