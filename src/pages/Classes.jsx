import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Plus, Edit2, Trash2, X } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';

const currentUser = JSON.parse(localStorage.getItem('authUser') || 'null');
const isAdmin = currentUser?.role === 'Admin';

const emptyForm = { name: '', faculty: '', department: '', capacity: '' };

const statusClass = (status) =>
  status === 'Full' ? 'text-red-500 bg-red-500/10 border-red-500/20' : 'text-[#00A451] bg-[#00A451]/10 border-[#00A451]/20';

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, open: 0, full: 0 });
  const [programs, setPrograms] = useState([]);
  const [search, setSearch] = useState('');
  const [faculty, setFaculty] = useState('All Faculties');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const loadClasses = async () => {
    setIsLoading(true);
    try {
      const result = await api.get('/classes', { page, limit: 10, search, faculty });
      setClasses(result.data || []);
      setSummary(result.summary || { total: 0, open: 0, full: 0 });
      setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      setToast({ type: 'error', title: 'Classes error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPrograms = async () => {
    try {
      const result = await api.get('/programs');
      setPrograms(result.data || []);
    } catch (error) {
      setToast({ type: 'error', title: 'Faculties error', message: error.message });
    }
  };

  useEffect(() => {
    loadClasses();
  }, [page, search, faculty]);

  useEffect(() => {
    setPage(1);
  }, [search, faculty]);

  useEffect(() => {
    loadPrograms();
  }, []);

  const faculties = useMemo(() => ['All Faculties', ...programs.map((program) => program.title)], [programs]);
  const departmentOptions = useMemo(() => {
    const program = programs.find((item) => item.title === form.faculty);
    return program?.departments || [];
  }, [programs, form.faculty]);

  const openCreate = () => {
    setEditingClass(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (classItem) => {
    setEditingClass(classItem);
    setForm({
      name: classItem.name,
      faculty: classItem.faculty,
      department: classItem.department,
      capacity: String(classItem.capacity),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingClass(null);
    setForm(emptyForm);
  };

  const updateForm = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'faculty' ? { department: '' } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.faculty || !form.department || !form.capacity) {
      setToast({ type: 'error', title: 'Validation error', message: 'Please complete all class fields.' });
      return;
    }
    setIsSaving(true);
    try {
      const payload = { name: form.name.trim(), faculty: form.faculty, department: form.department, capacity: Number(form.capacity) };
      if (editingClass) {
        await api.patch(`/classes/${editingClass.id}`, payload);
        setToast({ type: 'success', title: 'Class updated', message: 'Class details were saved.' });
      } else {
        await api.post('/classes', payload);
        setToast({ type: 'success', title: 'Class created', message: 'The new class is ready for student assignment.' });
      }
      closeModal();
      await loadClasses();
    } catch (error) {
      setToast({ type: 'error', title: 'Save failed', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (classItem) => {
    if (!window.confirm(`Delete class "${classItem.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/classes/${classItem.id}`);
      setToast({ type: 'success', title: 'Class deleted', message: `"${classItem.name}" was removed.` });
      await loadClasses();
    } catch (error) {
      setToast({ type: 'error', title: 'Delete failed', message: error.message });
    }
  };

  return (
    <PageLayout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[15px]">
        <StatCard icon={GraduationCap} title="Total Classes" value={summary.total.toLocaleString()} color="#2D368D" iconColor="#2D368D" />
        <StatCard icon={GraduationCap} title="Open Classes" value={summary.open.toLocaleString()} color="#00A451" iconColor="#00A451" />
        <StatCard icon={GraduationCap} title="Full Classes" value={summary.full.toLocaleString()} color="#fb923c" iconColor="#fb923c" />
      </div>

      <Card className="flex items-center gap-[15px] p-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            type="text"
            className="w-full bg-main-bg border border-white/5 text-white rounded-xl py-3.5 px-4 text-[13px] outline-none focus:border-primary transition-colors placeholder-gray-500"
            placeholder="Search class name, faculty, department ..."
          />
        </div>
        <select
          value={faculty}
          onChange={(event) => setFaculty(event.target.value)}
          className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer"
          style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
        >
          {faculties.map((item) => <option key={item}>{item}</option>)}
        </select>
        {isAdmin && (
          <button onClick={openCreate} className="bg-primary hover:bg-opacity-90 text-white rounded-full px-6 py-3.5 text-[13px] font-medium transition-colors cursor-pointer md:ml-auto flex items-center gap-2" type="button">
            <Plus size={16} />
            Add Class
          </button>
        )}
      </Card>

      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">CLASS NAME</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">FACULTY</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">DEPARTMENT</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ENROLLED / CAPACITY</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">STATUS</th>
                {isAdmin && <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ACTION</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={6}>Loading classes...</td></tr>}
              {!isLoading && classes.length === 0 && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={6}>No classes found.</td></tr>}
              {!isLoading && classes.map((classItem) => (
                <tr key={classItem.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4 text-white text-[14px] font-medium">{classItem.name}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{classItem.faculty}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{classItem.department}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{classItem.enrolled} / {classItem.capacity}</td>
                  <td className="px-6 py-4">
                    <span className={`px-4 py-1.5 rounded-full text-[12px] font-medium border inline-flex items-center justify-center ${statusClass(classItem.status)}`}>
                      {classItem.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(classItem)} className="text-gray-500 hover:text-primary transition-colors p-1" type="button" title="Edit class">
                          <Edit2 size={17} />
                        </button>
                        <button onClick={() => handleDelete(classItem)} className="text-gray-500 hover:text-red-500 transition-colors p-1" type="button" title="Delete class">
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-6 mt-auto border-t border-white/5">
          <div className="text-[13px] font-medium text-gray-500">Page {pagination.page} of {pagination.pages} - {pagination.total} classes</div>
          <div className="flex gap-3">
            <button disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="px-5 py-2 rounded-full border border-white/10 text-gray-400 text-[13px] font-medium hover:text-white hover:border-white/20 transition-all bg-transparent cursor-pointer disabled:opacity-40" type="button">Previous</button>
            <button disabled={page >= pagination.pages || isLoading} onClick={() => setPage((value) => Math.min(value + 1, pagination.pages))} className="px-5 py-2 rounded-full border border-primary bg-primary text-white text-[13px] font-medium cursor-pointer disabled:opacity-40" type="button">Next</button>
          </div>
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090217] border border-[#150D25] w-full max-w-[560px] rounded-[24px] p-8 relative flex flex-col animate-fade-in font-sans">
            <button onClick={closeModal} className="absolute right-8 top-8 w-8 h-8 rounded-full border border-white/10 hover:border-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer" type="button">
              <X size={16} />
            </button>
            <h2 className="text-white text-[20px] font-bold tracking-tight mb-6 font-jakarta">{editingClass ? 'Edit Class' : 'New Class'}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col">
                <label className="text-white text-[13px] font-semibold mb-2.5 ml-1">Class Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => updateForm('name', event.target.value)}
                  placeholder="e.g. CS-101 Morning"
                  className="w-full bg-[#070211] border border-white/5 text-white rounded-2xl px-5 py-4 text-[13px] outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
              <div className="flex flex-col">
                <label className="text-white text-[13px] font-semibold mb-2.5 ml-1">Faculty</label>
                <select
                  value={form.faculty}
                  onChange={(event) => updateForm('faculty', event.target.value)}
                  className="w-full bg-[#070211] border border-white/5 text-white rounded-2xl px-5 py-4 text-[13px] outline-none appearance-none pr-12 cursor-pointer"
                  style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 20px center' }}
                  required
                >
                  <option value="" disabled>Select Faculty</option>
                  {programs.map((program) => <option key={program.id} value={program.title}>{program.title}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-white text-[13px] font-semibold mb-2.5 ml-1">Department</label>
                <select
                  value={form.department}
                  onChange={(event) => updateForm('department', event.target.value)}
                  disabled={!form.faculty}
                  className="w-full bg-[#070211] border border-white/5 text-white rounded-2xl px-5 py-4 text-[13px] outline-none appearance-none pr-12 cursor-pointer disabled:opacity-50"
                  style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 20px center' }}
                  required
                >
                  <option value="" disabled>Select Department</option>
                  {departmentOptions.map((department) => <option key={department.id} value={department.name}>{department.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-white text-[13px] font-semibold mb-2.5 ml-1">Capacity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.capacity}
                  onChange={(event) => updateForm('capacity', event.target.value)}
                  placeholder="e.g. 40"
                  className="w-full bg-[#070211] border border-white/5 text-white rounded-2xl px-5 py-4 text-[13px] outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={closeModal} className="bg-transparent border border-white/10 hover:bg-white/5 text-white rounded-full px-8 py-3 text-[13px] font-semibold transition-all cursor-pointer">
                  Cancel
                </button>
                <button disabled={isSaving} type="submit" className="bg-primary hover:bg-opacity-90 text-white rounded-full px-8 py-3 text-[13px] font-semibold transition-all cursor-pointer disabled:opacity-50">
                  {isSaving ? 'Saving...' : editingClass ? 'Save Changes' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Classes;
