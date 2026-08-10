import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, BookOpen, ChevronLeft, ChevronRight, CreditCard, GraduationCap,
  IdCard, Mail, MapPin, Phone, Search, ShieldCheck, UserRoundSearch, Users
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api, { API_BASE_URL } from '../api/axios';

const backendOrigin = new URL(API_BASE_URL, window.location.origin).origin;
const money = (value, currency = 'USD') => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2
}).format(Number(value || 0));
const photoUrl = (value) => !value ? '' : /^https?:\/\//i.test(value) ? value : `${backendOrigin}${value.startsWith('/') ? '' : '/'}${value}`;
const initials = (name) => String(name || 'Student').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const display = (value, fallback = 'Not available') => value || fallback;

const statusStyle = (status) => {
  const value = String(status || '').toLowerCase();
  if (value.includes('approve') || value.includes('enroll') || value === 'paid') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (value.includes('pending') || value.includes('draft') || value.includes('submit')) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (value.includes('reject') || value.includes('fail')) return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-200 bg-slate-50 text-slate-600';
};

const InfoItem = ({ icon: Icon, label, value }) => (
  <div className="flex min-w-0 items-start gap-2.5">
    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500"><Icon size={15} /></span>
    <div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt><dd className="mt-0.5 break-words text-xs font-semibold text-[#14294b]">{display(value)}</dd></div>
  </div>
);

const StudentSearch = () => {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [access, setAccess] = useState({});
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!submittedQuery) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const result = await api.get('/student-search', { query: submittedQuery, page, limit: 12 });
        if (!active) return;
        setStudents(result.data || []);
        setAccess(result.access || {});
        setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
      } catch (error) {
        if (active) setToast({ type: 'error', title: 'Search failed', message: error.message });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [page, submittedQuery]);

  const search = (event) => {
    event.preventDefault();
    const clean = query.trim();
    if (clean.length < 2) {
      setToast({ type: 'warning', title: 'More information needed', message: 'Enter at least 2 characters from a name, student ID, roll number, phone, email, or application reference.' });
      return;
    }
    setPage(1);
    setSubmittedQuery(clean);
  };

  const permissionLabels = useMemo(() => [
    access.contact && 'Contact', access.emergencyContact && 'Emergency contact',
    access.academic && 'Academic', access.paymentSummary && 'Payment summary'
  ].filter(Boolean), [access]);

  return (
    <PageLayout className="student-search-page">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.18em] text-emerald-600">Authorized student directory</p>
          <h1 className="mt-1 text-3xl font-extrabold text-[#14294b]">Student Search</h1>
          <p className="mt-1 text-sm text-slate-500">Find essential student records without opening the full admission form.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700"><ShieldCheck size={17} /> Permission-controlled information</div>
      </header>

      <Card className="p-5">
        <form onSubmit={search} className="flex flex-col gap-3 md:flex-row">
          <label className="flex min-h-14 flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-[#303b97] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#303b97]/5">
            <Search size={20} className="shrink-0 text-slate-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm text-[#14294b] outline-none" placeholder="Search name, student ID, roll number, phone, email or reference" autoComplete="off" />
          </label>
          <button type="submit" disabled={loading} className="admin-button admin-button--primary min-h-14"><UserRoundSearch size={19} />{loading ? 'Searching...' : 'Search Students'}</button>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>Search results are scoped to your role, campus, department, and assigned permissions.</span>
          {!!permissionLabels.length && <span className="font-semibold text-[#303b97]">Visible: {permissionLabels.join(' · ')}</span>}
        </div>
      </Card>

      {!submittedQuery && <Card className="grid min-h-[340px] place-items-center p-8 text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#303b97]/10 text-[#303b97]"><UserRoundSearch size={31} /></span><h2 className="mt-5 text-xl font-extrabold text-[#14294b]">Search the student directory</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Use a student name, ID, roll number, application reference, phone number, or email. No complete admission forms are shown here.</p></div></Card>}

      {submittedQuery && <>
        <div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[#14294b]">{loading ? 'Searching secure records...' : `${pagination.total || 0} result${pagination.total === 1 ? '' : 's'} for “${submittedQuery}”`}</p></div>
        {!loading && !students.length && <Card className="grid min-h-[280px] place-items-center p-8 text-center"><div><AlertCircle className="mx-auto text-slate-300" size={42} /><h2 className="mt-4 text-lg font-extrabold text-[#14294b]">No matching student found</h2><p className="mt-2 text-sm text-slate-500">Check the spelling or try another ID, roll number, phone, email, or reference.</p></div></Card>}
        <section className={`grid gap-5 ${students.length === 1 ? 'mx-auto w-full max-w-4xl grid-cols-1' : 'xl:grid-cols-2'}`}>
          {!loading && students.map((student) => {
            const payment = student.paymentSummary;
            const progress = payment?.requiredAmount ? Math.min((Number(payment.paidAmount || 0) / Number(payment.requiredAmount)) * 100, 100) : 0;
            return <Card key={`${student.applicationId}-${student.id}`} className="overflow-hidden border border-slate-200">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white p-5">
                <div className="flex items-start gap-4">
                  {student.photoUrl ? <img src={photoUrl(student.photoUrl)} alt={`${student.fullName} profile`} className="h-20 w-20 shrink-0 rounded-2xl border-2 border-white object-cover shadow-md" /> : <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#303b97] to-[#176783] text-xl font-extrabold text-white shadow-md">{initials(student.fullName)}</span>}
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-extrabold text-[#14294b]">{display(student.fullName, 'Unnamed student')}</h2><p className="mt-1 text-xs font-semibold text-[#303b97]">{student.studentNumber || 'Student ID pending enrollment'}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle(student.admissionStatus)}`}>{display(student.admissionStatus, 'Unknown')}</span></div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500"><span className="flex items-center gap-1"><IdCard size={13} />Roll: {display(student.rollNumber)}</span><span className="flex items-center gap-1"><MapPin size={13} />{display(student.campus)}</span></div></div>
                </div>
              </div>
              <div className="space-y-5 p-5">
                <dl className="grid gap-4 sm:grid-cols-2"><InfoItem icon={IdCard} label="Application reference" value={student.admissionReference} /><InfoItem icon={GraduationCap} label="Student status" value={student.studentStatus} /></dl>
                {student.contact && <section><h3 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#14294b]"><Phone size={15} />Contact</h3><dl className="grid gap-4 sm:grid-cols-2"><InfoItem icon={Phone} label="Phone number" value={student.contact.phone} /><InfoItem icon={Mail} label="Email" value={student.contact.email} /></dl></section>}
                {student.emergencyContact && <section className="rounded-xl border border-amber-100 bg-amber-50/60 p-4"><h3 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-800"><Users size={15} />Emergency contact</h3><dl className="grid gap-4 sm:grid-cols-3"><InfoItem icon={Users} label="Name" value={student.emergencyContact.name} /><InfoItem icon={Phone} label="Phone" value={student.emergencyContact.phone} /><InfoItem icon={IdCard} label="Relationship" value={student.emergencyContact.relationship} /></dl></section>}
                {student.academic && <section><h3 className="mb-3 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#14294b]"><BookOpen size={15} />Academic information</h3><dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><InfoItem icon={BookOpen} label="Faculty" value={student.academic.faculty} /><InfoItem icon={GraduationCap} label="Program" value={student.academic.program} /><InfoItem icon={Users} label="Class" value={student.academic.className || 'Not assigned'} /></dl></section>}
                {payment && <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#14294b]"><CreditCard size={15} />Payment summary</h3><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyle(payment.status)}`}>{display(payment.status, 'Unpaid')}</span></div><div className="mt-4 grid grid-cols-3 gap-3 text-center"><div><small className="text-slate-400">Required</small><strong className="block text-sm text-[#14294b]">{money(payment.requiredAmount, payment.currency)}</strong></div><div><small className="text-slate-400">Paid</small><strong className="block text-sm text-emerald-700">{money(payment.paidAmount, payment.currency)}</strong></div><div><small className="text-slate-400">Balance</small><strong className="block text-sm text-amber-700">{money(payment.balance, payment.currency)}</strong></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><span className="block h-full rounded-full bg-gradient-to-r from-[#303b97] to-emerald-500" style={{ width: `${progress}%` }} /></div>{payment.latestTransactionId && <p className="mt-3 truncate font-mono text-[10px] text-slate-500">Transaction: {payment.latestTransactionId}</p>}</section>}
              </div>
            </Card>;
          })}
        </section>
        {pagination.pages > 1 && <nav className="flex items-center justify-end gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-[#14294b] disabled:opacity-40"><ChevronLeft size={15} />Previous</button><span className="px-3 text-xs font-semibold text-slate-500">Page {pagination.page} of {pagination.pages}</span><button disabled={page >= pagination.pages || loading} onClick={() => setPage((value) => Math.min(value + 1, pagination.pages))} className="flex items-center gap-1 rounded-lg bg-[#303b97] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40">Next<ChevronRight size={15} /></button></nav>}
      </>}
    </PageLayout>
  );
};

export default StudentSearch;
