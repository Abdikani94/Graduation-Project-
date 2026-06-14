import { useEffect, useMemo, useState, useRef } from 'react';
import { User, Search, Edit2, Plus, X, Image as ImageIcon, BookOpen, Clock, Calendar, Check, Trash2, Edit } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';

const fallbackImage = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
const fixedAdmissionFee = 25;

const Programs = () => {
  const [programs, setPrograms] = useState([]);
  const [summary, setSummary] = useState({ totalPrograms: 0, totalFaculties: 0, totalAdmissionFees: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Selected Faculty for Detail Modal
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [editingFaculty, setEditingFaculty] = useState(null);

  // Inline Edit Department States
  const [editingDeptIndex, setEditingDeptIndex] = useState(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editDeptDuration, setEditDeptDuration] = useState('');

  // New Faculty Modal Form State
  const [facultyName, setFacultyName] = useState('');
  const [, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef(null);

  // New Department Modal Form State
  const [deptFaculty, setDeptFaculty] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptDuration, setDeptDuration] = useState('');

  const loadPrograms = async () => {
    setIsLoading(true);
    try {
      const result = await api.get('/programs', { search });
      setPrograms(result.data || []);
      setSummary(result.summary || { totalPrograms: 0, totalFaculties: 0, totalAdmissionFees: 0 });
      if (selectedFaculty) {
        const refreshed = (result.data || []).find((program) => program.id === selectedFaculty.id);
        setSelectedFaculty(refreshed || null);
      }
    } catch (error) {
      setToast({ type: 'error', title: 'Programs error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, [search]);

  const filteredPrograms = useMemo(() => programs, [programs]);
  const money = (value) => `$${Number(value || 0).toLocaleString()}`;
  const showSuccess = (message) => setToast({ type: 'success', title: 'Saved', message });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleSaveFaculty = async (e) => {
    e.preventDefault();
    if (!facultyName) return;

    const payload = {
      title: facultyName,
      admissionFee: fixedAdmissionFee,
      image: imagePreview || editingFaculty?.image || fallbackImage,
    };

    try {
      if (editingFaculty) {
        await api.patch(`/programs/${editingFaculty.id}`, payload);
        showSuccess('Faculty updated.');
      } else {
        await api.post('/programs', { ...payload, departments: [] });
        showSuccess('Faculty added.');
      }
      handleCancelFaculty();
      await loadPrograms();
    } catch (error) {
      setToast({ type: 'error', title: 'Save failed', message: error.message });
    }
  };

  const handleCancelFaculty = () => {
    setFacultyName('');
    setSelectedImage(null);
    setImagePreview('');
    setEditingFaculty(null);
    setIsModalOpen(false);
  };

  const handleOpenFacultyEdit = (e, faculty) => {
    e.stopPropagation();
    setEditingFaculty(faculty);
    setFacultyName(faculty.title || '');
    setImagePreview(faculty.image || '');
    setIsModalOpen(true);
  };

  const handleDeleteFaculty = async (e, faculty) => {
    e.stopPropagation();
    if (!window.confirm(`Delete ${faculty.title}?`)) return;
    try {
      await api.delete(`/programs/${faculty.id}`);
      showSuccess('Faculty deleted.');
      await loadPrograms();
    } catch (error) {
      setToast({ type: 'error', title: 'Delete failed', message: error.message });
    }
  };

  const handleOpenDeptModal = (e, facultyTitle) => {
    e.stopPropagation(); // Avoid opening the Faculty Detail card
    setDeptFaculty(facultyTitle);
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptFaculty || !deptName || !deptDuration) return;

    try {
      const program = programs.find((item) => item.title === deptFaculty || item.id === deptFaculty);
      await api.post(`/programs/${program.id}/departments`, { name: deptName, durationYears: deptDuration });
      showSuccess('Department added.');
      handleCancelDept();
      await loadPrograms();
    } catch (error) {
      setToast({ type: 'error', title: 'Save failed', message: error.message });
    }
  };

  const handleCancelDept = () => {
    setDeptFaculty('');
    setDeptName('');
    setDeptDuration('');
    setIsDeptModalOpen(false);
  };

  const handleOpenDetailModal = (faculty) => {
    setSelectedFaculty(faculty);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setSelectedFaculty(null);
    setEditingDeptIndex(null);
    setIsDetailModalOpen(false);
  };

  // CRUD Registered Department Functions
  const startEditDept = (index, dept) => {
    setEditingDeptIndex(index);
    setEditDeptName(dept.name);
    setEditDeptDuration(String(dept.durationYears || dept.duration || ''));
  };

  const saveEditDept = async (index) => {
    if (!selectedFaculty || !editDeptName || !editDeptDuration) return;
    try {
      const department = selectedFaculty.departments[index];
      await api.patch(`/programs/${selectedFaculty.id}/departments/${department.id}`, {
        name: editDeptName,
        durationYears: editDeptDuration,
      });
      setEditingDeptIndex(null);
      showSuccess('Department updated.');
      await loadPrograms();
    } catch (error) {
      setToast({ type: 'error', title: 'Update failed', message: error.message });
    }
  };

  const cancelEditDept = () => {
    setEditingDeptIndex(null);
  };

  const deleteDept = async (index) => {
    if (!selectedFaculty) return;
    const department = selectedFaculty.departments[index];
    if (!window.confirm(`Delete ${department.name}?`)) return;
    try {
      await api.delete(`/programs/${selectedFaculty.id}/departments/${department.id}`);
      showSuccess('Department deleted.');
      await loadPrograms();
    } catch (error) {
      setToast({ type: 'error', title: 'Delete failed', message: error.message });
    }
  };

  return (
    <PageLayout>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[15px]">
        <StatCard icon={User} title="Total Programs" value={summary.totalPrograms.toLocaleString()} color="#00A451" iconColor="#00A451" />
        <StatCard icon={User} title="Total Faculties" value={summary.totalFaculties.toLocaleString()} color="#d97706" iconColor="#d97706" />
        <StatCard icon={User} title="Total Admission fees" value={money(summary.totalAdmissionFees)} color="#d97706" iconColor="#d97706" />
      </div>

      <Card className="flex items-center gap-[15px] p-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-main-bg border border-white/5 text-white rounded-xl py-3.5 pl-[44px] pr-4 text-[13px] outline-none focus:border-primary transition-colors placeholder-gray-500" placeholder="Search programs ..." />
        </div>
        <select className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
          <option>All Status</option>
        </select>
        <select className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
          <option>All Faculties</option>
        </select>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-opacity-90 text-white rounded-xl px-6 py-3.5 text-[13px] font-medium transition-colors ml-auto whitespace-nowrap cursor-pointer"
        >
          Add Faculty
        </button>
      </Card>

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[15px]">
        {isLoading && <Card className="p-6 text-gray-500 text-[13px]">Loading programs...</Card>}
        {!isLoading && filteredPrograms.length === 0 && <Card className="p-6 text-gray-500 text-[13px]">No programs found.</Card>}
        {filteredPrograms.map((program) => (
          <Card
            key={program.id}
            onClick={() => handleOpenDetailModal(program)}
            className="flex flex-col overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all duration-300 group"
          >
            <div className="overflow-hidden relative h-[180px]">
              <img
                src={program.image || fallbackImage}
                alt={program.title}
                className="w-full h-full object-cover grayscale opacity-90 group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090217] via-transparent to-transparent opacity-60"></div>
            </div>
            <div className="p-5 flex flex-col flex-1">
              <h3 className="text-[18px] font-semibold text-white mb-2 font-jakarta">{program.title}</h3>
              <p className="text-[16px] font-semibold text-white mb-6">
                <span className="text-[#2D368D] font-medium font-sans">Fee - </span>{money(program.admissionFee)}
              </p>

              <div className="mt-auto flex flex-col gap-3">
                <button
                  onClick={(e) => handleOpenDeptModal(e, program.title)}
                  className="flex items-center justify-center gap-2 bg-transparent text-gray-400 border border-dashed border-white/10 rounded-lg p-3 text-[14px] font-medium hover:border-white/30 hover:text-white transition-all cursor-pointer w-full"
                >
                  <Plus size={16} /> Add program
                </button>
                <button
                  onClick={(e) => handleOpenFacultyEdit(e, program)}
                  className="flex items-center justify-center gap-2 bg-transparent text-gray-400 border border-dashed border-white/10 rounded-lg p-3 text-[14px] font-medium hover:border-white/30 hover:text-white transition-all cursor-pointer w-full"
                >
                  <Edit2 size={16} /> Edit
                </button>
                <button
                  onClick={(e) => handleDeleteFaculty(e, program)}
                  className="flex items-center justify-center gap-2 bg-transparent text-red-400 border border-dashed border-red-500/20 rounded-lg p-3 text-[14px] font-medium hover:border-red-500/40 hover:text-red-300 transition-all cursor-pointer w-full"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* New Faculty Modal overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090217] border border-[#150D25] w-full max-w-[560px] rounded-[24px] p-8 relative flex flex-col animate-fade-in font-sans">
            {/* Close Button */}
            <button
              onClick={handleCancelFaculty}
              className="absolute right-8 top-8 w-8 h-8 rounded-full border border-white/10 hover:border-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Title */}
            <h2 className="text-white text-[20px] font-bold tracking-tight mb-6 font-jakarta">{editingFaculty ? 'Edit Faculty' : 'New Faculty'}</h2>

            {/* Form */}
            <form onSubmit={handleSaveFaculty} className="flex flex-col">
              {/* Upload Image Section */}
              <div
                onClick={triggerFileInput}
                className="w-full border-2 border-dashed border-[#2D368D]/30 hover:border-[#2D368D]/60 transition-all rounded-[16px] bg-[#070211]/50 h-[140px] flex flex-col items-center justify-center cursor-pointer gap-2 overflow-hidden relative"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Upload Preview" className="absolute inset-0 w-full h-full object-cover opacity-80" />
                ) : (
                  <div className="flex items-center gap-2.5 text-[#2D368D] font-semibold text-[13px]">
                    <ImageIcon size={18} />
                    <span>Click to upload</span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Faculty Name */}
              <div className="flex flex-col mt-6">
                <label className="text-white text-[13px] font-semibold mb-2.5 ml-1">Faculty Name</label>
                <input
                  type="text"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  className="w-full bg-[#070211] border border-white/5 text-white rounded-2xl px-5 py-4 text-[13px] outline-none focus:border-primary transition-colors"
                  required
                />
              </div>

              {/* Fee Admission */}
              <div className="flex flex-col mt-6">
                <label className="text-white text-[13px] font-semibold mb-2.5 ml-1">Fee (Admission)</label>
                <input
                  type="text"
                  value={`$${fixedAdmissionFee}`}
                  readOnly
                  className="w-full bg-[#070211] border border-white/5 text-white rounded-2xl px-5 py-4 text-[13px] outline-none opacity-80 cursor-not-allowed"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={handleCancelFaculty}
                  className="bg-transparent border border-white/10 hover:bg-white/5 text-white rounded-full px-8 py-3 text-[13px] font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-opacity-90 text-white rounded-full px-8 py-3 text-[13px] font-semibold transition-all cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Department Modal overlay */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090217] border border-[#150D25] w-full max-w-[560px] rounded-[24px] p-8 relative flex flex-col animate-fade-in font-sans">
            {/* Close Button */}
            <button
              onClick={handleCancelDept}
              className="absolute right-8 top-8 w-8 h-8 rounded-full border border-white/10 hover:border-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Title */}
            <h2 className="text-white text-[20px] font-bold tracking-tight mb-6 font-jakarta">New department</h2>

            {/* Form */}
            <form onSubmit={handleSaveDept} className="flex flex-col">
              {/* Faculty Select */}
              <div className="flex flex-col">
                <label className="text-white text-[13px] font-semibold mb-2.5 ml-1">Faculty</label>
                <div className="relative">
                  <select
                    value={deptFaculty}
                    onChange={(e) => setDeptFaculty(e.target.value)}
                    className="w-full bg-[#070211] border border-white/5 text-white rounded-2xl px-5 py-4 text-[13px] outline-none appearance-none pr-12 cursor-pointer"
                    style={{
                      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 20px center'
                    }}
                    required
                  >
                    <option value="" disabled>Select Faculty</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.title}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department Name */}
              <div className="flex flex-col mt-6">
                <label className="text-white text-[13px] font-semibold mb-2.5 ml-1">Department Name</label>
                <input
                  type="text"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="w-full bg-[#070211] border border-white/5 text-white rounded-2xl px-5 py-4 text-[13px] outline-none focus:border-primary transition-colors"
                  required
                />
              </div>

              {/* Duration (Year) */}
              <div className="flex flex-col mt-6">
                <label className="text-white text-[13px] font-semibold mb-2.5 ml-1">Duration (Year)</label>
                <input
                  type="text"
                  value={deptDuration}
                  onChange={(e) => setDeptDuration(e.target.value)}
                  className="w-[200px] bg-[#070211] border border-white/5 text-white rounded-2xl px-5 py-4 text-[13px] outline-none focus:border-primary transition-colors"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={handleCancelDept}
                  className="bg-transparent border border-white/10 hover:bg-white/5 text-white rounded-full px-8 py-3 text-[13px] font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary hover:bg-opacity-90 text-white rounded-full px-8 py-3 text-[13px] font-semibold transition-all cursor-pointer"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Faculty Detail Info Card Modal */}
      {isDetailModalOpen && selectedFaculty && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090217] border border-[#150D25] w-full max-w-[620px] rounded-[28px] overflow-hidden relative flex flex-col animate-fade-in font-sans shadow-2xl">
            {/* Float Close Button */}
            <button
              onClick={handleCloseDetailModal}
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hover:bg-black/60 flex items-center justify-center text-white hover:scale-105 transition-all cursor-pointer z-10"
            >
              <X size={16} />
            </button>

            {/* Banner Image */}
            <div className="w-full h-[220px] relative shrink-0">
              <img src={selectedFaculty.image || fallbackImage} alt={selectedFaculty.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090217] via-[#090217]/50 to-transparent"></div>
            </div>

            {/* Modal Content */}
            <div className="p-8 flex flex-col flex-1 min-h-0">
              <h2 className="text-white text-[24px] font-bold tracking-tight mb-2 font-jakarta">{selectedFaculty.title}</h2>
              <div className="flex items-center gap-4 text-gray-400 text-[13px] font-medium mb-6">
                <span className="flex items-center gap-1.5"><Calendar size={14} className="text-primary" /> Established: 2012</span>
                <span className="flex items-center gap-1.5"><BookOpen size={14} className="text-primary" /> {selectedFaculty.departments.length} Departments</span>
              </div>

              {/* Fee and Info metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-2xl bg-[#070211]/50 border border-white/5">
                  <p className="text-gray-500 text-[11px] font-medium uppercase tracking-wider mb-1">Admission Fee</p>
                  <p className="text-[#2D368D] text-[18px] font-bold">{money(selectedFaculty.admissionFee)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#070211]/50 border border-white/5">
                  <p className="text-gray-500 text-[11px] font-medium uppercase tracking-wider mb-1">Total Enrollment</p>
                  <p className="text-white text-[18px] font-bold">428 Students</p>
                </div>
              </div>

              <div className="border-t border-white/5 my-4"></div>

              {/* Departments Registered List */}
              <h3 className="text-white text-[15px] font-bold mb-4 font-jakarta flex items-center gap-2">
                <BookOpen size={16} className="text-primary" /> Registered Departments
              </h3>

              <div className="flex flex-col gap-3 overflow-y-auto pr-1 max-h-[220px] custom-scrollbar">
                {selectedFaculty.departments.length === 0 ? (
                  <p className="text-gray-500 text-[13px] py-4 text-center">No departments registered yet. Click "Add program" on the main screen to register one!</p>
                ) : (
                  selectedFaculty.departments.map((dept, i) => {
                    const isEditing = editingDeptIndex === i;

                    return (
                      <div key={i} className="flex items-center justify-between p-4 bg-[#070211]/40 border border-white/5 rounded-2xl hover:bg-white/[0.01] transition-all group">
                        {isEditing ? (
                          /* INLINE EDIT MODE */
                          <div className="flex items-center gap-3 w-full">
                            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-bold text-[12px]">
                              {i + 1}
                            </div>
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                value={editDeptName}
                                onChange={(e) => setEditDeptName(e.target.value)}
                                className="flex-1 bg-[#070211] border border-white/10 text-white text-[13px] rounded-lg px-3 py-1.5 outline-none focus:border-primary"
                                placeholder="Department Name"
                                required
                              />
                              <input
                                type="text"
                                value={editDeptDuration}
                                onChange={(e) => setEditDeptDuration(e.target.value)}
                                className="w-[70px] bg-[#070211] border border-white/10 text-white text-[13px] rounded-lg px-3 py-1.5 outline-none focus:border-primary text-center"
                                placeholder="Duration"
                                required
                              />
                            </div>
                            <div className="flex items-center gap-1.5 ml-2">
                              <button
                                onClick={() => saveEditDept(i)}
                                className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={cancelEditDept}
                                className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* STANDARD DISPLAY MODE */
                          <>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-[12px]">
                                {i + 1}
                              </div>
                              <span className="text-white text-[14px] font-medium">{dept.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1.5 text-gray-400 bg-white/5 border border-white/5 px-4 py-1.5 rounded-full text-[11px] font-semibold">
                                <Clock size={11} className="text-primary" /> {dept.durationYears || dept.duration} Years
                              </span>
                              {/* Edit & Delete Action Buttons */}
                              <div className="flex items-center gap-1 opacity-40 hover:opacity-100 group-hover:opacity-100 transition-all duration-200">
                                <button
                                  onClick={() => startEditDept(i, dept)}
                                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-primary/20 text-gray-400 hover:text-white transition-all flex items-center justify-center cursor-pointer"
                                  title="Edit Department"
                                >
                                  <Edit size={12} />
                                </button>
                                <button
                                  onClick={() => deleteDept(i)}
                                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-all flex items-center justify-center cursor-pointer"
                                  title="Delete Department"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Programs;
