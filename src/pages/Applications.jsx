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
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Applicant')}&background=894EEF&color=fff`;

const statusClass = (status) => {
  if (status === 'Approved') return 'text-[#00A451] bg-[#00A451]/10 border-[#00A451]/20';
  if (status === 'Rejected') return 'text-red-500 bg-red-500/10 border-red-500/20';
  return 'text-[#d97706] bg-[#d97706]/10 border-[#d97706]/20';
};

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

  const handleDelete = async (app) => {
    if (!window.confirm(`Delete application ${app.reference}?`)) return;
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

  const openEdit = (app) => {
    setEditingApplication(app);
    setEditForm({
      fullName: app.fullName || '',
      email: app.email || '',
      mobile: app.mobile || '',
      faculty: app.faculty || '',
      department: app.department || '',
      campus: app.campus || '',
      paymentStatus: app.paymentStatus || 'Pending',
      notes: app.notes || '',
    });
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editForm.fullName || !editForm.email || !editForm.mobile) {
      setToast({ type: 'error', title: 'Validation error', message: 'Name, email, and mobile are required.' });
      return;
    }
    setIsSaving(true);
    try {
      await api.patch(`/applications/${editingApplication.id}`, editForm);
      setEditingApplication(null);
      showSuccess('Application updated.');
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
                    <button disabled={isSaving} onClick={() => handleStatus(app, 'Approved')} className="text-gray-500 hover:text-[#00A451] transition-colors p-1 disabled:opacity-40" type="button" title="Approve">
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
          <Card className="w-full max-w-[620px] p-7 relative">
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
          </Card>
        </div>
      )}

      {editingApplication && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-[640px] p-7 relative">
            <button onClick={() => setEditingApplication(null)} className="absolute right-5 top-5 text-gray-400 hover:text-white" type="button"><X size={18} /></button>
            <h2 className="text-white text-[20px] font-semibold mb-6">Edit Application</h2>
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['fullName', 'Full Name'],
                ['email', 'Email'],
                ['mobile', 'Mobile'],
                ['faculty', 'Faculty'],
                ['department', 'Program'],
                ['campus', 'Campus'],
                ['paymentStatus', 'Payment Status'],
              ].map(([key, label]) => (
                <label key={key} className="flex flex-col gap-2 text-white text-[13px] font-semibold">
                  {label}
                  <input value={editForm[key] || ''} onChange={(event) => setEditForm((form) => ({ ...form, [key]: event.target.value }))} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary" />
                </label>
              ))}
              <label className="md:col-span-2 flex flex-col gap-2 text-white text-[13px] font-semibold">
                Notes
                <textarea value={editForm.notes || ''} onChange={(event) => setEditForm((form) => ({ ...form, notes: event.target.value }))} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary min-h-[90px]" />
              </label>
              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setEditingApplication(null)} className="px-6 py-3 rounded-full border border-white/10 text-gray-400 text-[13px] font-semibold">Cancel</button>
                <button disabled={isSaving} type="submit" className="px-6 py-3 rounded-full bg-primary text-white text-[13px] font-semibold disabled:opacity-50">Save</button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </PageLayout>
  );
};

export default Applications;
