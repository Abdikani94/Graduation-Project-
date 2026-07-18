import { useEffect, useMemo, useState } from 'react';
import { User, Search, Eye, Check, X, Trash2, Edit2 } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';

const formatDate = (value) => {
  if (!value) return 'Not provided';
  return new Date(value).toLocaleDateString();
};

const avatarFor = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Applicant')}&background=2D368D&color=fff`;

const statusClass = (status) => {
  if (status === 'Approved') return 'text-[#00A451] bg-[#00A451]/10 border-[#00A451]/20';
  if (status === 'Rejected') return 'text-red-500 bg-red-500/10 border-red-500/20';
  return 'text-[#d97706] bg-[#d97706]/10 border-[#d97706]/20';
};

// Every field a student submits during application. Values map 1:1 to the
// backend application record, whose PATCH endpoint already whitelists them.
const EDIT_SECTIONS = [
  {
    title: 'Personal Information',
    fields: [
      { key: 'fullName', label: 'Full Name' },
      { key: 'motherName', label: "Mother's Name" },
      { key: 'nationality', label: 'Nationality' },
      { key: 'nationalId', label: 'National ID' },
      { key: 'rollNumber', label: 'Roll Number' },
      { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
      { key: 'placeOfBirth', label: 'Place of Birth' },
      { key: 'district', label: 'District' },
      { key: 'area', label: 'Area' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'sex', label: 'Sex', options: ['Male', 'Female'] },
      { key: 'maritalStatus', label: 'Marital Status', options: ['Single', 'Marriage', 'Divorced', 'Widowed'] },
      { key: 'campus', label: 'Campus' },
    ],
  },
  {
    title: 'Emergency Contact & School',
    fields: [
      { key: 'emergencyName', label: 'Emergency Contact Name' },
      { key: 'emergencyTell', label: 'Emergency Phone' },
      { key: 'relationship', label: 'Relationship', options: ['Mother', 'Father', 'Brother', 'Sister', 'Other specify'] },
      { key: 'familyStudied', label: 'Family Studied Here', options: ['Haa', 'Maya'] },
      { key: 'schoolName', label: 'Secondary School' },
      { key: 'schoolDistrict', label: 'School District' },
      { key: 'graduationYear', label: 'Graduation Year' },
      { key: 'percentage', label: 'Passing Grade', options: ['A', 'A-', 'B+', 'B', 'B-'] },
      { key: 'heardFrom', label: 'Heard About Us From', options: ['Social Media', 'Friends', 'University came to our School', 'Parents', 'Seminars of the University', 'Other specify'] },
    ],
  },
  {
    title: 'Program & Payment',
    fields: [
      { key: 'faculty', label: 'Faculty' },
      { key: 'department', label: 'Program' },
      { key: 'modeOfStudy', label: 'Mode of Study', options: ['Full Time', 'Part Time'] },
      { key: 'paymentPlan', label: 'Payment Plan', options: ['Admission fee only', 'Semester payment', 'Full year payment'] },
      { key: 'paymentMethod', label: 'Payment Method', options: ['EVC Plus', 'Card', 'eDahab', 'Zaad', 'Sahal'] },
      { key: 'paymentPhone', label: 'Payment Phone' },
      { key: 'paymentAmount', label: 'Payment Amount' },
      { key: 'paymentTransactionId', label: 'Transaction ID' },
      { key: 'paymentStatus', label: 'Payment Status', options: ['Pending', 'Paid', 'Failed'] },
    ],
  },
];

const EDIT_FIELD_KEYS = EDIT_SECTIONS.flatMap((section) => section.fields.map((field) => field.key));

const editInputClass = 'bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary w-full';

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All Status');
  const [faculty, setFaculty] = useState('All Faculties');
  const [campus, setCampus] = useState('All Campuses');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [editingApplication, setEditingApplication] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [approvingApp, setApprovingApp] = useState(null);
  const [approveClasses, setApproveClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [isLoadingApproveClasses, setIsLoadingApproveClasses] = useState(false);
  const [editClasses, setEditClasses] = useState([]);
  const [isLoadingEditClasses, setIsLoadingEditClasses] = useState(false);

  const loadApplications = async () => {
    setIsLoading(true);
    try {
      const result = await api.get('/applications', {
        page,
        limit: 10,
        search,
        status,
        faculty,
        campus,
      });
      setApplications(result.data || []);
      setSummary(result.summary || { total: 0, approved: 0, pending: 0, rejected: 0 });
      setPagination(result.pagination || { page: 1, pages: 1, total: 0, limit: 10 });
    } catch (error) {
      setToast({ type: 'error', title: 'Applications error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [page, search, status, faculty, campus]);

  useEffect(() => {
    setPage(1);
  }, [search, status, faculty, campus]);

  const faculties = useMemo(() => ['All Faculties', ...new Set(applications.map((app) => app.faculty).filter(Boolean))], [applications]);
  const campuses = useMemo(() => ['All Campuses', ...new Set(applications.map((app) => app.campus).filter(Boolean))], [applications]);

  const showSuccess = (message) => setToast({ type: 'success', title: 'Saved', message });

  const handleStatus = async (app, nextStatus) => {
    const applicant = app.fullName || 'this applicant';
    const confirmation = [
      'Are you sure you want to reject this application?',
      '',
      `Applicant: ${applicant}`,
      `Reference: ${app.reference || 'Not provided'}`,
      `The application status will be changed to ${nextStatus}.`,
    ].join('\n');

    if (!window.confirm(confirmation)) return;
    setIsSaving(true);
    try {
      await api.patch(`/applications/${app.id}/status`, { status: nextStatus });
      showSuccess(`Application ${nextStatus.toLowerCase()}.`);
      await loadApplications();
    } catch (error) {
      setToast({ type: 'error', title: 'Action failed', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const openApprove = async (app) => {
    setApprovingApp(app);
    setSelectedClassId('');
    setApproveClasses([]);
    setIsLoadingApproveClasses(true);
    try {
      const result = await api.get('/classes', { faculty: app.faculty, department: app.department, status: 'Open', limit: 100 });
      const openClasses = result.data || [];
      setApproveClasses(openClasses);
      if (app.classId && openClasses.some((item) => item.id === app.classId)) {
        setSelectedClassId(app.classId);
      } else if (openClasses.length === 1) {
        setSelectedClassId(openClasses[0].id);
      }
    } catch (error) {
      setToast({ type: 'error', title: 'Classes error', message: error.message });
    } finally {
      setIsLoadingApproveClasses(false);
    }
  };

  const closeApprove = () => {
    setApprovingApp(null);
    setApproveClasses([]);
    setSelectedClassId('');
  };

  const confirmApprove = async () => {
    if (!approvingApp || !selectedClassId) return;
    setIsSaving(true);
    try {
      await api.patch(`/applications/${approvingApp.id}/status`, { status: 'Approved', classId: selectedClassId });
      showSuccess(`${approvingApp.fullName || 'Applicant'} approved and assigned to class.`);
      closeApprove();
      await loadApplications();
    } catch (error) {
      setToast({ type: 'error', title: 'Approval failed', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (app) => {
    const confirmation = [
      'Are you sure you want to delete this person/application?',
      '',
      `Applicant: ${app.fullName || 'Unnamed applicant'}`,
      `Reference: ${app.reference || 'Not provided'}`,
      'This action cannot be undone.',
    ].join('\n');

    if (!window.confirm(confirmation)) return;
    setIsSaving(true);
    try {
      await api.delete(`/applications/${app.id}`);
      showSuccess('Application deleted.');
      await loadApplications();
    } catch (error) {
      setToast({ type: 'error', title: 'Delete failed', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = async (app) => {
    setSelectedApplication(null);
    setEditingApplication(app);
    setEditForm({
      ...Object.fromEntries(EDIT_FIELD_KEYS.map((key) => [key, app[key] ?? ''])),
      paymentStatus: app.paymentStatus || 'Pending',
      notes: app.notes || '',
      classId: app.classId || '',
    });
    setEditClasses([]);
    setIsLoadingEditClasses(true);
    try {
      const result = await api.get('/classes', { faculty: app.faculty, department: app.department, limit: 100 });
      setEditClasses(result.data || []);
    } catch (error) {
      setToast({ type: 'error', title: 'Classes error', message: error.message });
    } finally {
      setIsLoadingEditClasses(false);
    }
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editForm.fullName || !editForm.email || !editForm.mobile) {
      setToast({ type: 'error', title: 'Validation error', message: 'Name, email, and mobile are required.' });
      return;
    }
    setIsSaving(true);
    try {
      await api.patch(`/applications/${editingApplication.id}`, { ...editForm, classId: editForm.classId || null });
      setEditingApplication(null);
      showSuccess('Student information updated.');
      await loadApplications();
    } catch (error) {
      setToast({ type: 'error', title: 'Update failed', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageLayout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[15px]">
        <StatCard icon={User} title="Total Applications" value={summary.total.toLocaleString()} color="#00A451" iconColor="#00A451" />
        <StatCard icon={User} title="Approved Applications" value={summary.approved.toLocaleString()} color="#d97706" iconColor="#d97706" />
        <StatCard icon={User} title="Pending Application" value={summary.pending.toLocaleString()} color="#d97706" iconColor="#d97706" />
        <StatCard icon={User} title="Rejected Applications" value={summary.rejected.toLocaleString()} color="#2D368D" iconColor="#2D368D" />
      </div>

      <Card className="flex items-center gap-[15px] p-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full bg-main-bg border border-white/5 text-white rounded-xl py-3.5 pl-[44px] pr-4 text-[13px] outline-none focus:border-primary transition-colors placeholder-gray-500"
            placeholder="Search name, email, reference ..."
          />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
          {['All Status', 'Pending', 'Approved', 'Rejected', 'Waitlisted', 'Cancelled'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={faculty} onChange={(event) => setFaculty(event.target.value)} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
          {faculties.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={campus} onChange={(event) => setCampus(event.target.value)} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
          {campuses.map((item) => <option key={item}>{item}</option>)}
        </select>
      </Card>

      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 w-[60px]"><div className="w-4 h-4 rounded-full border-[1.5px] border-primary opacity-70" /></th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">APPLICANT</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">FACULTY</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">PROGRAM</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">CAMPUS</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">STATUS</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">DATE</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={8}>Loading applications...</td></tr>
              )}
              {!isLoading && applications.length === 0 && (
                <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={8}>No applications found.</td></tr>
              )}
              {!isLoading && applications.map((app) => (
                <tr key={app.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4"><div className="w-4 h-4 rounded-full border-[1.5px] border-primary opacity-70" /></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img src={avatarFor(app.fullName)} alt={app.fullName} className="w-9 h-9 rounded-full object-cover grayscale" />
                      <div className="flex flex-col">
                        <p className="text-white text-[14px] font-medium mb-0.5">{app.fullName || 'Unnamed applicant'}</p>
                        <p className="text-gray-500 text-[11px] tracking-wide">{app.reference}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{app.faculty || 'Not provided'}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{app.department || 'Not provided'}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{app.campus || 'Not provided'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-4 py-1.5 rounded-full text-[12px] font-medium border inline-flex items-center justify-center ${statusClass(app.status)}`}>
                      {app.status || 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{formatDate(app.createdAt)}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => setSelectedApplication(app)} className="text-gray-500 hover:text-white transition-colors p-1" type="button" title="View">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => openEdit(app)} className="text-gray-500 hover:text-white transition-colors p-1" type="button" title="Edit">
                      <Edit2 size={17} />
                    </button>
                    <button disabled={isSaving || app.status === 'Approved'} onClick={() => openApprove(app)} className="text-gray-500 hover:text-[#00A451] transition-colors p-1 disabled:opacity-40" type="button" title="Approve">
                      <Check size={17} />
                    </button>
                    <button disabled={isSaving} onClick={() => handleStatus(app, 'Rejected')} className="text-gray-500 hover:text-red-500 transition-colors p-1 disabled:opacity-40" type="button" title="Reject">
                      <X size={17} />
                    </button>
                    <button disabled={isSaving} onClick={() => handleDelete(app)} className="text-gray-500 hover:text-red-500 transition-colors p-1 disabled:opacity-40" type="button" title="Delete">
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-6 mt-auto border-t border-white/5">
          <div className="text-[13px] font-medium text-gray-500">Page {pagination.page} of {pagination.pages} - {pagination.total} applications</div>
          <div className="flex gap-3">
            <button disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="px-5 py-2 rounded-full border border-white/10 text-gray-400 text-[13px] font-medium hover:text-white hover:border-white/20 transition-all bg-transparent cursor-pointer disabled:opacity-40" type="button">Previous</button>
            <button disabled={page >= pagination.pages || isLoading} onClick={() => setPage((value) => Math.min(value + 1, pagination.pages))} className="px-5 py-2 rounded-full border border-primary bg-primary text-white text-[13px] font-medium cursor-pointer disabled:opacity-40" type="button">Next</button>
          </div>
        </div>
      </Card>

      {selectedApplication && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-[620px] max-h-[90vh] overflow-y-auto p-7 relative">
            <button onClick={() => setSelectedApplication(null)} className="absolute right-5 top-5 text-gray-400 hover:text-white" type="button"><X size={18} /></button>
            <h2 className="text-white text-[20px] font-semibold mb-1">{selectedApplication.fullName}</h2>
            <p className="text-gray-500 text-[12px] mb-6">{selectedApplication.reference}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
              {[
                ['Email', selectedApplication.email],
                ['Mobile', selectedApplication.mobile],
                ['Faculty', selectedApplication.faculty],
                ['Program', selectedApplication.department],
                ['Campus', selectedApplication.campus],
                ['Payment', selectedApplication.paymentStatus],
                ['Status', selectedApplication.status],
                ['Submitted', formatDate(selectedApplication.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="bg-main-bg border border-white/5 rounded-xl p-4">
                  <p className="text-gray-500 text-[11px] uppercase mb-1">{label}</p>
                  <p className="text-white">{value || 'Not provided'}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedApplication(null)}
                className="px-6 py-3 rounded-full border border-white/10 text-gray-400 text-[13px] font-semibold"
                type="button"
              >
                Close
              </button>
            </div>
          </Card>
        </div>
      )}

      {editingApplication && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-[760px] max-h-[90vh] overflow-y-auto p-7 relative">
            <button onClick={() => setEditingApplication(null)} className="absolute right-5 top-5 text-gray-400 hover:text-white" type="button"><X size={18} /></button>
            <h2 className="text-white text-[20px] font-semibold mb-1">Edit Student Information</h2>
            <p className="text-gray-500 text-[12px] mb-6">{editingApplication.reference}</p>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-7">
              {EDIT_SECTIONS.map((section) => (
                <div key={section.title} className="flex flex-col gap-4">
                  <h3 className="text-primary text-[12px] font-bold uppercase tracking-[0.06em] border-b border-border-color pb-2">{section.title}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.fields.map(({ key, label, type, options }) => (
                      <label key={key} className="flex flex-col gap-2 text-text-dark text-[13px] font-semibold">
                        {label}
                        {options ? (
                          <select
                            value={editForm[key] ?? ''}
                            onChange={(event) => setEditForm((form) => ({ ...form, [key]: event.target.value }))}
                            className={editInputClass}
                          >
                            <option value="">{`Select ${label.toLowerCase()}`}</option>
                            {(editForm[key] && !options.includes(editForm[key]) ? [editForm[key], ...options] : options).map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={type || 'text'}
                            value={editForm[key] ?? ''}
                            onChange={(event) => setEditForm((form) => ({ ...form, [key]: event.target.value }))}
                            className={editInputClass}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex flex-col gap-4">
                <h3 className="text-primary text-[12px] font-bold uppercase tracking-[0.06em] border-b border-border-color pb-2">Enrollment</h3>
                <label className="flex flex-col gap-2 text-text-dark text-[13px] font-semibold">
                  Class ({editingApplication.faculty} / {editingApplication.department})
                  <select
                    value={editForm.classId || ''}
                    onChange={(event) => setEditForm((form) => ({ ...form, classId: event.target.value }))}
                    disabled={isLoadingEditClasses}
                    className={`${editInputClass} disabled:opacity-60`}
                  >
                    <option value="">{isLoadingEditClasses ? 'Loading classes...' : 'No class assigned'}</option>
                    {editClasses.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name} ({classItem.enrolled}/{classItem.capacity}{classItem.status === 'Full' ? ' - Full' : ''})
                      </option>
                    ))}
                  </select>
                  {!isLoadingEditClasses && editClasses.length === 0 && (
                    <span className="text-[#d97706] text-[12px] font-normal">No classes exist yet for this department. Create one on the Classes page.</span>
                  )}
                </label>
                <label className="flex flex-col gap-2 text-text-dark text-[13px] font-semibold">
                  Notes
                  <textarea value={editForm.notes || ''} onChange={(event) => setEditForm((form) => ({ ...form, notes: event.target.value }))} className={`${editInputClass} min-h-[90px]`} />
                </label>
              </div>

              <div className="flex justify-end gap-3 mt-1">
                <button type="button" onClick={() => setEditingApplication(null)} className="px-6 py-3 rounded-full border border-border-color text-text-muted text-[13px] font-semibold hover:bg-main-bg transition-colors">Cancel</button>
                <button disabled={isSaving} type="submit" className="px-6 py-3 rounded-full bg-primary text-white text-[13px] font-semibold disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {approvingApp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto p-7 relative">
            <button onClick={closeApprove} className="absolute right-5 top-5 text-gray-400 hover:text-white" type="button"><X size={18} /></button>
            <h2 className="text-white text-[20px] font-semibold mb-1">Approve Application</h2>
            <p className="text-gray-500 text-[12px] mb-6">{approvingApp.fullName} - {approvingApp.reference}</p>

            {isLoadingApproveClasses && <p className="text-gray-400 text-[13px]">Loading available classes...</p>}

            {!isLoadingApproveClasses && approveClasses.length === 0 && (
              <p className="text-red-400 text-[13px] leading-relaxed">
                No open classes available in {approvingApp.department} ({approvingApp.faculty}). An Admin must create a new class before this application can be approved.
              </p>
            )}

            {!isLoadingApproveClasses && approveClasses.length > 0 && (
              <label className="flex flex-col gap-2 text-white text-[13px] font-semibold">
                Assign to Class
                <select
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary"
                >
                  <option value="" disabled>Select a class</option>
                  {approveClasses.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name} ({classItem.enrolled}/{classItem.capacity})
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeApprove} className="px-6 py-3 rounded-full border border-white/10 text-gray-400 text-[13px] font-semibold" type="button">
                Cancel
              </button>
              {approveClasses.length > 0 && (
                <button disabled={isSaving || !selectedClassId} onClick={confirmApprove} className="px-6 py-3 rounded-full bg-primary text-white text-[13px] font-semibold disabled:opacity-50" type="button">
                  {isSaving ? 'Approving...' : 'Approve & Assign'}
                </button>
              )}
            </div>
          </Card>
        </div>
      )}
    </PageLayout>
  );
};

export default Applications;
