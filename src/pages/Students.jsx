import { useEffect, useMemo, useState } from 'react';
import { Edit2, Eye, Search, User, X } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';

const avatarFor = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Student')}&background=2D368D&color=fff`;

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : 'Not provided';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({ total: 0, whatsappSent: 0, whatsappPending: 0 });
  const [search, setSearch] = useState('');
  const [faculty, setFaculty] = useState('All Faculties');
  const [campus, setCampus] = useState('All Campuses');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const result = await api.get('/students', { page, limit: 10, search, faculty, campus });
      setStudents(result.data || []);
      setSummary(result.summary || { total: 0, whatsappSent: 0, whatsappPending: 0 });
      setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      setToast({ type: 'error', title: 'Students error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [page, search, faculty, campus]);

  useEffect(() => {
    setPage(1);
  }, [search, faculty, campus]);

  const faculties = useMemo(() => ['All Faculties', ...new Set(students.map((student) => student.faculty).filter(Boolean))], [students]);
  const campuses = useMemo(() => ['All Campuses', ...new Set(students.map((student) => student.campus).filter(Boolean))], [students]);

  const resetFilters = () => {
    setSearch('');
    setFaculty('All Faculties');
    setCampus('All Campuses');
  };

  const openPreview = async (student) => {
    try {
      const result = await api.get(`/students/${student.id}`);
      setSelectedStudent(result.student || student);
    } catch (error) {
      setToast({ type: 'error', title: 'Preview failed', message: error.message });
    }
  };

  const openEdit = (student) => {
    setEditingStudent(student);
    setEditForm({
      fullName: student.fullName || '',
      email: student.email || '',
      mobile: student.mobile || '',
      faculty: student.faculty || '',
      department: student.department || '',
      campus: student.campus || '',
      status: student.status || 'Enrolled',
    });
  };

  const updateEditForm = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editForm.fullName?.trim() || !editForm.email?.trim() || !editForm.mobile?.trim()) {
      setToast({ type: 'error', title: 'Validation error', message: 'Full name, email, and mobile are required.' });
      return;
    }
    setIsSaving(true);
    try {
      await api.patch(`/students/${editingStudent.id}`, editForm);
      setToast({ type: 'success', title: 'Student updated', message: 'Student information was saved successfully.' });
      setEditingStudent(null);
      await loadStudents();
    } catch (error) {
      setToast({ type: 'error', title: 'Update failed', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleWhatsAppAll = async () => {
    const phoneNumbers = students.map((student) => student.mobile).filter(Boolean);
    if (phoneNumbers.length === 0) {
      setToast({ type: 'error', title: 'No phone numbers', message: 'No filtered students have phone numbers.' });
      return;
    }
    try {
      await Promise.all(students.map((student) => api.patch(`/students/${student.id}/whatsapp-sent`, {})));
      setToast({ type: 'success', title: 'WhatsApp ready', message: `Prepared ${phoneNumbers.length} filtered student numbers.` });
      window.open(`https://wa.me/?text=${encodeURIComponent(phoneNumbers.join('\n'))}`, '_blank');
      await loadStudents();
    } catch (error) {
      setToast({ type: 'error', title: 'WhatsApp failed', message: error.message });
    }
  };

  return (
    <PageLayout>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[15px]">
        <StatCard icon={User} title="Total Students" value={summary.total.toLocaleString()} color="#00A451" iconColor="#00A451" />
        <StatCard icon={User} title="Send students" value={summary.whatsappSent.toLocaleString()} color="#d97706" iconColor="#d97706" />
        <StatCard icon={User} title="Un-sends students" value={summary.whatsappPending.toLocaleString()} color="#2D368D" iconColor="#2D368D" />
      </div>

      <Card className="flex items-center gap-[15px] p-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="text" className="w-full bg-main-bg border border-white/5 text-white rounded-xl py-3.5 pl-[44px] pr-4 text-[13px] outline-none focus:border-primary transition-colors placeholder-gray-500" placeholder="Search name, email, student ID ..." />
        </div>
        <select value={faculty} onChange={(event) => setFaculty(event.target.value)} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
          {faculties.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={campus} onChange={(event) => setCampus(event.target.value)} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
          {campuses.map((item) => <option key={item}>{item}</option>)}
        </select>
        <button onClick={resetFilters} className="bg-primary hover:bg-opacity-90 text-white rounded-full px-8 py-3.5 text-[13px] font-medium transition-colors cursor-pointer">Reset</button>
        <button onClick={handleWhatsAppAll} className="bg-[#00A451] hover:bg-opacity-90 text-white rounded-full px-6 py-3.5 text-[13px] font-medium transition-colors cursor-pointer md:ml-auto flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          WhatsApp all filtered
        </button>
      </Card>

      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 w-[60px]"><div className="w-4 h-4 rounded-full border-[1.5px] border-primary opacity-70"></div></th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">APPLICANT</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">FACULTY</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">PROGRAM</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">CAMPUS</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">DATE</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">STATUS</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={8}>Loading students...</td></tr>}
              {!isLoading && students.length === 0 && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={8}>No students found.</td></tr>}
              {!isLoading && students.map((student) => (
                <tr key={student.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4"><div className="w-4 h-4 rounded-full border-[1.5px] border-primary opacity-70"></div></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img src={avatarFor(student.fullName)} alt={student.fullName} className="w-9 h-9 rounded-full object-cover grayscale" />
                      <div className="flex flex-col">
                        <p className="text-white text-[14px] font-medium mb-0.5">{student.fullName}</p>
                        <p className="text-gray-500 text-[11px] tracking-wide">{student.studentNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{student.faculty}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{student.department}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{student.campus}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{formatDate(student.enrolledAt || student.createdAt)}</td>
                  <td className="px-6 py-4">
                    <span className="px-4 py-1.5 rounded-full text-[12px] font-medium border inline-flex items-center justify-center text-[#00A451] bg-[#00A451]/10 border-[#00A451]/20">
                      {student.status || 'Enrolled'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openPreview(student)} className="text-gray-500 hover:text-primary transition-colors p-1" type="button" title="Preview student">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => openEdit(student)} className="text-gray-500 hover:text-primary transition-colors p-1" type="button" title="Edit student">
                        <Edit2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex items-center justify-between p-6 mt-auto border-t border-white/5">
          <div className="text-[13px] font-medium text-gray-500">Page {pagination.page} of {pagination.pages} - {pagination.total} students</div>
          <div className="flex gap-3">
            <button disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="px-5 py-2 rounded-full border border-white/10 text-gray-400 text-[13px] font-medium hover:text-white hover:border-white/20 transition-all bg-transparent cursor-pointer disabled:opacity-40">Previous</button>
            <button disabled={page >= pagination.pages || isLoading} onClick={() => setPage((value) => Math.min(value + 1, pagination.pages))} className="px-5 py-2 rounded-full border border-primary bg-primary text-white text-[13px] font-medium cursor-pointer disabled:opacity-40">Next</button>
          </div>
        </div>
      </Card>

      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-[720px] max-h-[90vh] overflow-y-auto p-7 relative">
            <button onClick={() => setSelectedStudent(null)} className="absolute right-5 top-5 text-gray-400 hover:text-primary" type="button">
              <X size={18} />
            </button>
            <div className="flex items-center gap-4 mb-6">
              <img src={avatarFor(selectedStudent.fullName)} alt={selectedStudent.fullName} className="w-14 h-14 rounded-full object-cover grayscale" />
              <div>
                <h2 className="text-white text-[22px] font-semibold">{selectedStudent.fullName || 'Unnamed student'}</h2>
                <p className="text-gray-500 text-[13px]">{selectedStudent.studentNumber || 'No student number'}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
              {[
                ['Email', selectedStudent.email],
                ['Mobile', selectedStudent.mobile],
                ['Faculty', selectedStudent.faculty],
                ['Program', selectedStudent.department],
                ['Campus', selectedStudent.campus],
                ['Status', selectedStudent.status],
                ['WhatsApp', selectedStudent.whatsappSent ? 'Sent' : 'Pending'],
                ['Enrolled', formatDate(selectedStudent.enrolledAt || selectedStudent.createdAt)],
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

      {editingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-[720px] max-h-[90vh] overflow-y-auto p-7 relative">
            <button onClick={() => setEditingStudent(null)} className="absolute right-5 top-5 text-gray-400 hover:text-primary" type="button">
              <X size={18} />
            </button>
            <h2 className="text-white text-[22px] font-semibold mb-1">Edit Student Information</h2>
            <p className="text-gray-500 text-[13px] mb-6">{editingStudent.studentNumber}</p>
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['fullName', 'Full Name', 'text'],
                ['email', 'Email', 'email'],
                ['mobile', 'Mobile', 'tel'],
                ['faculty', 'Faculty', 'text'],
                ['department', 'Program', 'text'],
                ['campus', 'Campus', 'text'],
              ].map(([name, label, type]) => (
                <label key={name} className="flex flex-col gap-2 text-white text-[13px] font-semibold">
                  {label}
                  <input
                    name={name}
                    type={type}
                    value={editForm[name] || ''}
                    onChange={updateEditForm}
                    className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary"
                  />
                </label>
              ))}
              <label className="flex flex-col gap-2 text-white text-[13px] font-semibold">
                Status
                <select
                  name="status"
                  value={editForm.status || 'Enrolled'}
                  onChange={updateEditForm}
                  className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary"
                >
                  {['Enrolled', 'Active', 'Graduated', 'Suspended', 'Withdrawn'].map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setEditingStudent(null)} className="px-6 py-3 rounded-full border border-white/10 text-gray-400 text-[13px] font-semibold">
                  Cancel
                </button>
                <button disabled={isSaving} type="submit" className="px-6 py-3 rounded-full bg-primary text-white text-[13px] font-semibold disabled:opacity-50">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </PageLayout>
  );
};

export default Students;
