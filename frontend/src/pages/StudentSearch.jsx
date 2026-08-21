import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, CreditCard, GraduationCap, Search, ShieldCheck, UserRound, UserRoundSearch, Users, Phone } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api, { API_BASE_URL } from '../api/axios';

const backendOrigin = new URL(API_BASE_URL, window.location.origin).origin;
const dash = (value) => value === null || value === undefined || value === '' ? '—' : value;
const photoUrl = (value) => !value ? '' : /^https?:\/\//i.test(value) ? value : `${backendOrigin}${value.startsWith('/') ? '' : '/'}${value}`;
const money = (value, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', minimumFractionDigits: 2 }).format(Number(value || 0));
const readableDate = (value) => value ? new Date(value).toLocaleDateString() : '—';
const readableTime = (value) => value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

const Field = ({ label, value }) => <div className="student-profile-field"><dt>{label}</dt><dd>{dash(value)}</dd></div>;
const Section = ({ icon: Icon, title, children, className = '' }) => <section className={`student-profile-section ${className}`}><h2><Icon size={15} />{title}</h2><dl className="student-profile-fields">{children}</dl></section>;

export default function StudentSearch() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [access, setAccess] = useState({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!submittedQuery) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const result = await api.get('/student-search', { query: submittedQuery, page: 1, limit: 25 });
        if (!active) return;
        setStudents(result.data || []); setSelectedIndex(0); setAccess(result.access || {}); setSearched(true);
      } catch (error) {
        if (active) { setStudents([]); setSearched(true); setToast({ type: 'error', title: 'Search failed', message: error.message }); }
      } finally { if (active) setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [submittedQuery]);

  const search = (event) => {
    event.preventDefault();
    const clean = query.trim();
    if (clean.length < 2) { setToast({ type: 'warning', title: 'More information needed', message: 'Enter at least 2 characters from a name, student ID, roll number, phone, email, or application reference.' }); return; }
    setSubmittedQuery(clean);
  };

  const student = students[selectedIndex] || null;
  const academic = student?.academic || {};
  const contact = student?.contact || {};
  const emergency = student?.emergencyContact || {};
  const personal = student?.personalProfile || {};
  const payment = student?.paymentSummary || null;
  const permissionLabels = useMemo(() => [access.contact && 'Contact', access.emergencyContact && 'Emergency', access.academic && 'Academic', access.paymentSummary && 'Payment'].filter(Boolean), [access]);

  return <PageLayout className="student-search-page student-search-profile-page">
    <Toast toast={toast} onClose={() => setToast(null)} />
    <header className="student-search-header"><div><p>Authorized student directory</p><h1>Student Search</h1><span>Search and review essential student information in one secure view.</span></div><div className="student-search-security"><ShieldCheck size={16} /> Permission controlled</div></header>
    <Card className="student-search-toolbar"><form className="admin-search-form" onSubmit={search}><label className="admin-search-field"><Search size={18} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, Student ID, roll number, reference, phone or email" autoComplete="off" /></label><button className="admin-search-submit" type="submit" disabled={loading}><UserRoundSearch size={17} aria-hidden="true" />{loading ? 'Searching…' : 'Search'}</button></form><div className="student-search-toolbar-note"><span>Results follow your assigned role and scope.</span>{permissionLabels.length > 0 && <span>Visible: {permissionLabels.join(' · ')}</span>}</div></Card>
    {searched && !loading && students.length === 0 && <div className="student-search-message"><AlertCircle size={16} />No student found matching your search.</div>}
    {students.length > 1 && <div className="student-search-result-picker"><span>{students.length} matches</span><select value={selectedIndex} onChange={(event) => setSelectedIndex(Number(event.target.value))}>{students.map((item, index) => <option value={index} key={`${item.applicationId}-${item.id}`}>{dash(item.fullName)} — {dash(item.studentNumber || item.admissionReference)}</option>)}</select></div>}
    <Card className={`student-profile-card ${student ? 'has-student' : 'is-placeholder'}`}>
      <section className="student-profile-overview"><div className="student-profile-photo">{student?.photoUrl && <img src={photoUrl(student.photoUrl)} alt={`${student.fullName || 'Student'} profile`} onError={(event) => { event.currentTarget.hidden = true; }} />}<span><UserRound size={42} /></span></div><div className="student-profile-overview-content"><div className="student-profile-title"><div><small>Student record</small><h2>{dash(student?.fullName)}</h2></div><span>{dash(student?.admissionStatus)}</span></div><dl className="student-profile-quick-fields"><Field label="Student ID" value={student?.studentNumber} /><Field label="Status" value={student?.studentStatus} /><Field label="Current Semester" value={student?.currentSemester} /><Field label="HEMIS ID" value={student?.hemisId} /><Field label="Application Reference" value={student?.admissionReference} /><Field label="Roll Number" value={student?.rollNumber} /></dl></div></section>
      <div className="student-profile-sections">
        <Section icon={BookOpen} title="Program Study"><Field label="Faculty" value={academic.faculty} /><Field label="Department / Program" value={academic.program} /><Field label="Class" value={academic.className} /><Field label="Mode of Study" value={academic.modeOfStudy} /><Field label="Campus" value={academic.campus || student?.campus} /><Field label="Entry Date" value={readableDate(student?.enrolledAt)} /><Field label="Entry Time" value={readableTime(student?.enrolledAt)} /></Section>
        <Section icon={UserRound} title="Personal Profile"><Field label="Full Name" value={personal.fullName || student?.fullName} /><Field label="Mother Name" value={personal.motherName} /><Field label="Gender / Sex" value={personal.sex} /><Field label="Marital Status" value={personal.maritalStatus} /><Field label="Date of Birth" value={personal.dateOfBirth} /><Field label="Place of Birth" value={personal.placeOfBirth} /><Field label="Nationality" value={personal.nationality} /><Field label="National ID" value={personal.nationalId} /></Section>
        <Section icon={Phone} title="Contact" className="student-contact-section"><Field label="District / Address" value={contact.district} /><Field label="Email" value={contact.email} /><Field label="Phone / Mobile" value={contact.phone} /></Section>
        <Section icon={Users} title="Emergency Contact"><Field label="Contact Name" value={emergency.name} /><Field label="Emergency Phone" value={emergency.phone} /><Field label="Relationship" value={emergency.relationship} /></Section>
        <Section icon={GraduationCap} title="Educational Background"><Field label="School Name" value={academic.secondarySchool} /><Field label="School District" value={academic.schoolDistrict} /><Field label="Graduation Year" value={academic.graduationYear} /><Field label="Percentage / Grade" value={academic.grade} /><Field label="Roll Number" value={student?.rollNumber} /></Section>
        {(!student || payment) && <Section icon={CreditCard} title="Payment Summary" className="student-payment-section"><Field label="Status" value={payment?.status} /><Field label="Required" value={payment ? money(payment.requiredAmount, payment.currency) : null} /><Field label="Paid" value={payment ? money(payment.paidAmount, payment.currency) : null} /><Field label="Balance" value={payment ? money(payment.balance, payment.currency) : null} /><Field label="Method" value={payment?.latestMethod} /><Field label="Transaction ID" value={payment?.latestTransactionId} /></Section>}
      </div>
    </Card>
  </PageLayout>;
}
