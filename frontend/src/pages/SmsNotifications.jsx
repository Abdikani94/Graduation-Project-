import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Eye, MessageSquareText, RefreshCw, Search, Send, X, XCircle } from 'lucide-react';
import api from '../api/axios';
import { confirmDialog } from '../services/dialogService';
import Card from '../components/Card';
import PageLayout from '../components/PageLayout';

const initialSummary = { total: 0, pending: 0, sent: 0, failed: 0 };
const statusStyle = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200', PROCESSING: 'bg-blue-50 text-blue-700 border-blue-200',
  SENT: 'bg-emerald-50 text-emerald-700 border-emerald-200', DELIVERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200', CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200'
};

const SmsNotifications = () => {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(initialSummary);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await api.get('/sms-notifications', { page, limit: 12, search, status });
      setItems(result.data || []); setSummary(result.summary || initialSummary); setPagination(result.pagination || result);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, status]);

  const resend = async (item) => {
    if (!await confirmDialog(`Resend the submission SMS to ${item.recipient}?`, { title: 'Resend SMS notification', confirmLabel: 'Resend SMS' })) return;
    try { await api.post(`/sms-notifications/${item.id}/resend`, {}); await load(); }
    catch (requestError) { setError(requestError.message); }
  };
  const cancel = async (item) => {
    if (!await confirmDialog('Cancel this SMS notification?', { title: 'Cancel SMS notification', confirmLabel: 'Cancel Notification', destructive: true })) return;
    try { await api.patch(`/sms-notifications/${item.id}/cancel`, {}); await load(); }
    catch (requestError) { setError(requestError.message); }
  };

  const stats = [
    ['Total SMS', summary.total, MessageSquareText, 'text-[#303b97]'], ['Pending', summary.pending, Clock3, 'text-amber-600'],
    ['Sent', summary.sent, CheckCircle2, 'text-emerald-600'], ['Failed', summary.failed, XCircle, 'text-red-600']
  ];

  return <PageLayout>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-600">Communications</p><h1 className="mt-1 text-3xl font-extrabold text-[#14294b]">SMS Notifications</h1><p className="mt-1 text-sm text-slate-500">Monitor application confirmations sent through Xaliye6.</p></div>
      <button onClick={load} className="flex items-center gap-2 border bg-white px-4 py-2.5 text-sm font-semibold text-[#14294b]"><RefreshCw size={16}/>Refresh</button>
    </header>
    {error && <div className="flex items-center gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle size={17}/>{error}</div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, Icon, color]) => <Card className="p-5" key={label}><Icon className={color} size={21}/><p className="mt-4 text-sm text-slate-500">{label}</p><strong className="mt-1 block text-3xl text-[#14294b]">{value}</strong></Card>)}</section>
    <Card className="p-4"><div className="grid gap-3 md:grid-cols-[1fr_220px]"><label className="flex items-center gap-3 border bg-slate-50 px-4"><Search size={18} className="text-slate-400"/><input className="w-full bg-transparent py-3 outline-none" placeholder="Search student, application, or phone" value={search} onChange={(event) => setSearch(event.target.value)}/></label><select className="border bg-white px-4" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{['PENDING','PROCESSING','SENT','DELIVERED','FAILED','CANCELLED'].map((value) => <option key={value}>{value}</option>)}</select></div></Card>
    <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{['Student / Application','Phone','Event','Status','Attempts','Created','Sent','Actions'].map((heading) => <th className="px-5 py-4" key={heading}>{heading}</th>)}</tr></thead><tbody className="divide-y">{loading ? <tr><td colSpan="8" className="p-10 text-center text-slate-500">Loading SMS notifications…</td></tr> : !items.length ? <tr><td colSpan="8" className="p-10 text-center text-slate-500">No SMS notifications found.</td></tr> : items.map((item) => <tr key={item.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><strong className="block text-[#14294b]">{item.studentName}</strong><span className="text-xs text-slate-500">{item.applicationReference}</span></td><td className="px-5 py-4 font-medium">{item.recipient || 'Invalid / missing'}</td><td className="px-5 py-4 text-xs">{item.eventType}</td><td className="px-5 py-4"><span className={`inline-flex border px-2.5 py-1 text-xs font-bold ${statusStyle[item.status] || ''}`}>{item.status}</span></td><td className="px-5 py-4">{item.attemptCount}</td><td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</td><td className="px-5 py-4 whitespace-nowrap text-xs text-slate-500">{item.sentAt ? new Date(item.sentAt).toLocaleString() : '—'}</td><td className="px-5 py-4"><div className="flex gap-2"><button title="View details" onClick={() => setSelected(item)} className="border p-2"><Eye size={16}/></button>{['FAILED','CANCELLED'].includes(item.status) && item.recipient && <button title="Resend" onClick={() => resend(item)} className="border p-2 text-emerald-700"><Send size={16}/></button>}{['PENDING','FAILED'].includes(item.status) && <button title="Cancel" onClick={() => cancel(item)} className="border p-2 text-red-600"><X size={16}/></button>}</div></td></tr>)}</tbody></table></div><footer className="flex items-center justify-between border-t px-5 py-4 text-sm text-slate-500"><span>Page {pagination.page || page} of {pagination.pages || 1} · {pagination.total || 0} notifications</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="border px-4 py-2 disabled:opacity-40">Previous</button><button disabled={page >= (pagination.pages || 1)} onClick={() => setPage((value) => value + 1)} className="border px-4 py-2 disabled:opacity-40">Next</button></div></footer></Card>
    {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-[#14294b]/60 p-4" onMouseDown={() => setSelected(null)}><section className="w-full max-w-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><header className="flex justify-between"><div><h2 className="text-xl font-bold text-[#14294b]">SMS Details</h2><p className="text-sm text-slate-500">{selected.applicationReference}</p></div><button onClick={() => setSelected(null)}><X/></button></header><dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Student</dt><dd className="font-semibold">{selected.studentName}</dd></div><div><dt className="text-slate-500">Recipient</dt><dd className="font-semibold">{selected.recipient || 'Invalid / missing'}</dd></div><div><dt className="text-slate-500">Status</dt><dd className="font-semibold">{selected.status}</dd></div><div><dt className="text-slate-500">Attempts</dt><dd className="font-semibold">{selected.attemptCount}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">Message</dt><dd className="mt-1 bg-slate-50 p-3">{selected.message}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">Error</dt><dd className="mt-1 text-red-700">{selected.errorMessage || '—'}</dd></div><div className="sm:col-span-2"><dt className="text-slate-500">Provider response</dt><dd><pre className="mt-1 max-h-48 overflow-auto bg-slate-950 p-3 text-xs text-slate-100">{selected.providerResponse ? JSON.stringify(selected.providerResponse, null, 2) : 'No response recorded'}</pre></dd></div></dl></section></div>}
  </PageLayout>;
};

export default SmsNotifications;
