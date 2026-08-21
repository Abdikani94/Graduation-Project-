import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, Edit2, Eye, Image as ImageIcon, Plus, Search, Trash2, University, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';
import { confirmDialog } from '../services/dialogService';
import { isSuperAdmin } from '../utils/accessControl';
import medicineImage from '../images/faculty-medicine-landscape.jpg';
import computerImage from '../images/faculty-computer-landscape.jpg';
import engineeringImage from '../images/faculty-engineering-landscape.jpg';
import veterinaryImage from '../images/faculty-veterinary-landscape.jpg';
import economicsImage from '../images/faculty-economics-landscape.jpg';
import educationImage from '../images/faculty-education-landscape.jpg';

const ADMISSION_FEE = 25;
const facultyImages = [
  { terms: ['medicine', 'health', 'nursing'], image: medicineImage },
  { terms: ['computer', 'information technology', ' it'], image: computerImage },
  { terms: ['engineering'], image: engineeringImage },
  { terms: ['agro', 'veterinary', 'agriculture'], image: veterinaryImage },
  { terms: ['economics', 'management', 'business'], image: economicsImage },
  { terms: ['education', 'teaching'], image: educationImage },
];
const facultyImage = (faculty) => facultyImages.find(({ terms }) => terms.some((term) => String(faculty?.title || '').toLowerCase().includes(term)))?.image || faculty?.image || computerImage;
const money = (value = ADMISSION_FEE) => `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const blankFaculty = { title: '', description: '', status: 'Active', image: '' };
const blankProgram = { name: '', code: '', durationYears: 5, status: 'Active', description: '' };
const MAX_IMAGE_FILE_BYTES = 8 * 1024 * 1024;
const resizeFacultyImage = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('The selected image could not be read.'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('The selected file is not a valid image.'));
    image.onload = () => {
      const maximumWidth = 1600;
      const maximumHeight = 1000;
      const scale = Math.min(1, maximumWidth / image.width, maximumHeight / image.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

const LoadingCards = () => <div className="programs-card-grid" aria-label="Loading faculties">{[1, 2, 3].map((item) => <div className="faculty-skeleton" key={item}><span /><i /><i /></div>)}</div>;
const ErrorState = ({ message, retry }) => <Card className="program-state"><strong>Unable to load faculties</strong><p>{message}</p><button className="admin-button admin-button--secondary" onClick={retry}>Retry</button></Card>;

const FacultyForm = ({ initial, onClose, onSaved }) => {
  const [form, setForm] = useState(initial ? { ...blankFaculty, ...initial } : blankFaculty);
  const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const inputRef = useRef(null);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (!file.type.startsWith('image/')) return setError('Please choose a valid image file.');
    if (file.size > MAX_IMAGE_FILE_BYTES) return setError('The image must be 8 MB or smaller.');
    try {
      const optimizedImage = await resizeFacultyImage(file);
      setForm((current) => ({ ...current, image: optimizedImage }));
    } catch (imageError) {
      setError(imageError.message);
    }
  };
  const submit = async (event) => { event.preventDefault(); setError(''); setSaving(true); try { const payload = { title: form.title.trim(), description: form.description.trim(), status: form.status, image: form.image, admissionFee: ADMISSION_FEE }; if (initial?.id) await api.patch(`/programs/${initial.id}`, payload); else await api.post('/programs', { ...payload, departments: [] }); onSaved(initial ? 'Faculty updated.' : 'Faculty added.'); } catch (requestError) { setError(requestError.message); } finally { setSaving(false); } };
  return <div className="management-modal" role="dialog" aria-modal="true"><div className="management-modal__panel"><button className="management-modal__close" onClick={onClose} aria-label="Close"><X size={20} /></button><h2>{initial ? 'Edit Faculty' : 'Add Faculty'}</h2><p className="management-modal__intro">Manage faculty information without mixing program-specific fields.</p><form onSubmit={submit} className="management-form">
    <button type="button" className="faculty-image-picker" onClick={() => inputRef.current?.click()}>{form.image ? <img src={form.image} alt="Faculty preview" /> : <><ImageIcon size={22} /><span>Choose faculty image</span></>}<input ref={inputRef} hidden type="file" accept="image/*" onChange={upload} /></button>
    <label>Faculty Name *<input name="title" value={form.title} onChange={change} required /></label><label>Description<textarea name="description" rows="3" value={form.description} onChange={change} /></label><label>Status<select name="status" value={form.status} onChange={change}><option>Active</option><option>Inactive</option></select></label><label>Admission Fee<input value={money()} readOnly /></label>
    {error && <p className="form-error" role="alert">{error}</p>}<div className="management-form__actions"><button type="button" className="admin-button admin-button--secondary" onClick={onClose}>Cancel</button><button disabled={saving} className="admin-button admin-button--primary">{saving ? 'Saving…' : 'Save Faculty'}</button></div>
  </form></div></div>;
};

const ProgramForm = ({ faculty, initial, onClose, onSaved }) => {
  const [form, setForm] = useState(initial ? { ...blankProgram, ...initial } : blankProgram); const [saving, setSaving] = useState(false); const [error, setError] = useState('');
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => { event.preventDefault(); setError(''); setSaving(true); const payload = { ...form, name: form.name.trim(), code: form.code.trim().toUpperCase(), durationYears: Number(form.durationYears), admissionFee: ADMISSION_FEE }; try { if (initial?.id) await api.patch(`/programs/${faculty.id}/departments/${initial.id}`, payload); else await api.post(`/programs/${faculty.id}/departments`, payload); onSaved(initial ? 'Program updated.' : 'Program added.'); } catch (requestError) { setError(requestError.message); } finally { setSaving(false); } };
  return <div className="management-modal" role="dialog" aria-modal="true"><div className="management-modal__panel"><button className="management-modal__close" onClick={onClose} aria-label="Close"><X size={20} /></button><h2>{initial ? 'Edit Program' : 'Add Program'}</h2><p className="management-modal__intro">Faculty: {faculty.title}</p><form onSubmit={submit} className="management-form management-form--two-column">
    <label>Program Name *<input name="name" value={form.name} onChange={change} required /></label><label>Program Code *<input name="code" value={form.code} onChange={change} required /></label><label>Faculty<input value={faculty.title} readOnly /></label><label>Duration (Years) *<input name="durationYears" type="number" min="5" max="10" value={form.durationYears} onChange={change} required /></label><label>Admission Fee<input value={money()} readOnly /></label><label>Status<select name="status" value={form.status} onChange={change}><option>Active</option><option>Inactive</option></select></label><label className="management-form__wide">Description<textarea name="description" rows="3" value={form.description || ''} onChange={change} /></label>
    {error && <p className="form-error management-form__wide" role="alert">{error}</p>}<div className="management-form__actions management-form__wide"><button type="button" className="admin-button admin-button--secondary" onClick={onClose}>Cancel</button><button disabled={saving} className="admin-button admin-button--primary">{saving ? 'Saving…' : 'Save Program'}</button></div>
  </form></div></div>;
};

const FacultyListing = () => {
  const navigate = useNavigate(); const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}'); const canManage = isSuperAdmin(currentUser);
  const [faculties, setFaculties] = useState([]); const [allFaculties, setAllFaculties] = useState([]); const [summary, setSummary] = useState({ totalPrograms: 0, totalFaculties: 0, admissionFee: ADMISSION_FEE }); const [search, setSearch] = useState(''); const [status, setStatus] = useState('All'); const [facultyId, setFacultyId] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [showForm, setShowForm] = useState(false); const [toast, setToast] = useState(null);
  const loadOptions = useCallback(async () => { try { const result = await api.get('/programs'); setAllFaculties(result.data || []); } catch { /* Main request presents the actionable error. */ } }, []);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const result = await api.get('/programs', { search, status, facultyId }); setFaculties(result.data || []); setSummary(result.summary || {}); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); } }, [search, status, facultyId]);
  useEffect(() => { loadOptions(); }, [loadOptions]); useEffect(() => { const timer = setTimeout(load, 220); return () => clearTimeout(timer); }, [load]);
  const saved = async (message) => { setShowForm(false); setToast({ type: 'success', title: 'Saved', message }); await Promise.all([load(), loadOptions()]); };
  return <PageLayout className="programs-admin-page admin-data-page"><Toast toast={toast} onClose={() => setToast(null)} /><div className="program-page-heading"><div><p>Academic Management</p><h1>Programs & Faculties</h1><span>Manage faculties and their academic programs.</span></div></div>
    <div className="programs-summary-grid"><StatCard icon={BookOpen} title="Active Programs" value={Number(summary.totalPrograms || 0).toLocaleString()} color="#00A451" iconColor="#00A451" /><StatCard icon={University} title="Total Faculties" value={Number(summary.totalFaculties || 0).toLocaleString()} color="#2D368D" iconColor="#2D368D" /><StatCard icon={CheckCircle2} title="Standard Admission Fee" value={money(summary.admissionFee)} color="#2D368D" iconColor="#2D368D" /></div>
    <Card className="admin-search-toolbar programs-toolbar"><div className="admin-search-field"><Search size={19} /><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search faculty, program, or code" /></div><select className="admin-filter-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="All">All Status</option><option>Active</option><option>Inactive</option></select><select className="admin-filter-select" value={facultyId} onChange={(e) => setFacultyId(e.target.value)}><option value="">All Faculties</option>{allFaculties.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>{canManage && <button className="admin-button admin-button--primary programs-add-faculty" onClick={() => setShowForm(true)}><Plus size={18} /> Add Faculty</button>}</Card>
    {loading ? <LoadingCards /> : error ? <ErrorState message={error} retry={load} /> : faculties.length === 0 ? <Card className="program-state"><University size={28} /><strong>No faculties found.</strong><p>Try changing your search or filters.</p></Card> : <div className="programs-card-grid">{faculties.map((faculty) => <button type="button" key={faculty.id} className="program-faculty-card" onClick={() => navigate(`/admin/programs/${faculty.id}`)}><div className="program-faculty-card__media"><img src={facultyImage(faculty)} alt="" /><span>{faculty.departments?.length || 0} programs</span></div><div className="program-faculty-card__body"><div><span className={`status-pill status-pill--${(faculty.status || 'Active').toLowerCase()}`}>{faculty.status || 'Active'}</span><h2>{faculty.title}</h2></div><p><span>Admission fee</span><strong>{money(faculty.admissionFee)}</strong></p><span className="faculty-view-link">View Faculty <ArrowRight size={17} /></span></div></button>)}</div>}{showForm && <FacultyForm onClose={() => setShowForm(false)} onSaved={saved} />}
  </PageLayout>;
};

const FacultyDetail = () => {
  const { facultyId } = useParams(); const navigate = useNavigate(); const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}'); const canManage = isSuperAdmin(currentUser);
  const [faculty, setFaculty] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [search, setSearch] = useState(''); const [status, setStatus] = useState('All'); const [facultyForm, setFacultyForm] = useState(false); const [programForm, setProgramForm] = useState(null); const [viewProgram, setViewProgram] = useState(null); const [toast, setToast] = useState(null);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const result = await api.get(`/programs/${facultyId}`); setFaculty(result.program); } catch (requestError) { setError(requestError.message); } finally { setLoading(false); } }, [facultyId]); useEffect(() => { load(); }, [load]);
  const programs = useMemo(() => (faculty?.departments || []).filter((item) => status === 'All' || (item.status || 'Active') === status).filter((item) => [item.name, item.code].some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))), [faculty, search, status]);
  const saved = async (message) => { setFacultyForm(false); setProgramForm(null); setToast({ type: 'success', title: 'Saved', message }); await load(); };
  const removeFaculty = async () => { if (!await confirmDialog(`Are you sure you want to delete ${faculty.title}?\n\nThe faculty must have no programs. This action cannot be undone.`, { title: 'Delete faculty', confirmLabel: 'Delete Faculty', destructive: true })) return; try { await api.delete(`/programs/${faculty.id}`); navigate('/admin/programs'); } catch (requestError) { setToast({ type: 'error', title: 'Delete blocked', message: requestError.message }); } };
  const removeProgram = async (program) => { if (!await confirmDialog(`Are you sure you want to delete this program?\n\nProgram: ${program.name}\nThis action cannot be undone.`, { title: 'Delete program', confirmLabel: 'Delete Program', destructive: true })) return; try { await api.delete(`/programs/${faculty.id}/departments/${program.id}`); setToast({ type: 'success', title: 'Deleted', message: 'Program deleted.' }); await load(); } catch (requestError) { setToast({ type: 'error', title: 'Delete failed', message: requestError.message }); } };
  if (loading) return <PageLayout className="programs-admin-page"><LoadingCards /></PageLayout>; if (error || !faculty) return <PageLayout className="programs-admin-page"><button className="faculty-back" onClick={() => navigate('/admin/programs')}><ArrowLeft size={18} /> Back to Faculties</button><ErrorState message={error || 'Faculty not found.'} retry={load} /></PageLayout>;
  return <PageLayout className="programs-admin-page faculty-detail-page"><Toast toast={toast} onClose={() => setToast(null)} /><button className="faculty-back" onClick={() => navigate('/admin/programs')}><ArrowLeft size={18} /> Back to Faculties</button><section className="faculty-hero"><img src={facultyImage(faculty)} alt="" /><div className="faculty-hero__overlay"><span className={`status-pill status-pill--${(faculty.status || 'Active').toLowerCase()}`}>{faculty.status || 'Active'}</span><h1>{faculty.title}</h1><p>{faculty.description || 'Faculty academic programs and department management.'}</p><div className="faculty-hero__metrics"><span><BookOpen size={18} /><strong>{faculty.departments?.length || 0}</strong> Programs</span><span><strong>{money(faculty.admissionFee)}</strong> Admission Fee</span></div></div></section>
    {canManage && <div className="faculty-management-actions"><button className="admin-button admin-button--secondary" onClick={() => setFacultyForm(true)}><Edit2 size={17} /> Edit Faculty</button><button className="admin-button admin-button--danger" onClick={removeFaculty}><Trash2 size={17} /> Delete Faculty</button></div>}
    <section className="faculty-programs-section"><div className="faculty-programs-heading"><div><h2>Programs & Departments</h2><p>Only programs assigned to {faculty.title} are shown.</p></div><button className="admin-button admin-button--primary" onClick={() => setProgramForm({})}><Plus size={18} /> Add Program</button></div><div className="program-detail-toolbar"><div className="admin-search-field"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search programs or codes" /></div><select className="admin-filter-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="All">All Status</option><option>Active</option><option>Inactive</option></select></div>
      {programs.length === 0 ? <Card className="program-state"><BookOpen size={28} /><strong>{faculty.departments?.length ? 'No programs match your filters.' : 'No programs have been added to this faculty yet.'}</strong>{!faculty.departments?.length && <button className="admin-button admin-button--primary" onClick={() => setProgramForm({})}><Plus size={17} /> Add Program</button>}</Card> : <div className="department-grid">{programs.map((program) => <article className="department-card" key={program.id}><div className="department-card__top"><span className="department-code">{program.code}</span><span className={`status-pill status-pill--${(program.status || 'Active').toLowerCase()}`}>{program.status || 'Active'}</span></div><h3>{program.name}</h3><p className="department-description">{program.description || `Academic program offered by ${faculty.title}.`}</p><dl><div><dt>Faculty</dt><dd>{faculty.title}</dd></div><div><dt>Duration</dt><dd><Clock size={15} /> {program.durationYears || 5} Years</dd></div><div><dt>Admission Fee</dt><dd>{money(program.admissionFee)}</dd></div></dl><div className="department-card__actions"><button onClick={() => setViewProgram(program)}><Eye size={16} /> View</button><button onClick={() => setProgramForm(program)}><Edit2 size={16} /> Edit</button>{canManage && <button className="danger" onClick={() => removeProgram(program)}><Trash2 size={16} /> Delete</button>}</div></article>)}</div>}
    </section>{facultyForm && <FacultyForm initial={faculty} onClose={() => setFacultyForm(false)} onSaved={saved} />}{programForm && <ProgramForm faculty={faculty} initial={programForm.id ? programForm : null} onClose={() => setProgramForm(null)} onSaved={saved} />}
    {viewProgram && <div className="management-modal" role="dialog" aria-modal="true"><div className="management-modal__panel program-view-modal"><button className="management-modal__close" onClick={() => setViewProgram(null)}><X size={20} /></button><span className="department-code">{viewProgram.code}</span><h2>{viewProgram.name}</h2><p>{viewProgram.description || 'No description has been added.'}</p><dl><div><dt>Faculty</dt><dd>{faculty.title}</dd></div><div><dt>Duration</dt><dd>{viewProgram.durationYears || 5} Years</dd></div><div><dt>Admission Fee</dt><dd>{money(viewProgram.admissionFee)}</dd></div><div><dt>Status</dt><dd>{viewProgram.status || 'Active'}</dd></div></dl></div></div>}
  </PageLayout>;
};

const Programs = () => useParams().facultyId ? <FacultyDetail /> : <FacultyListing />;
export default Programs;
