import { useEffect, useState } from 'react';
import { Percent, Search, User } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';

const discountReasons = ['Regional', 'Financial Assistance', 'Scholarship', 'Other'];
const discountPercentages = [20, 25, 30, 100];
const regionalDiscountPercentage = 20;

const avatarFor = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Student')}&background=2D368D&color=fff`;

const Discount = () => {
  const [studentId, setStudentId] = useState('');
  const [foundStudent, setFoundStudent] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [reason, setReason] = useState('');
  const [percentage, setPercentage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [discountedStudents, setDiscountedStudents] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const loadDiscountedStudents = async () => {
    setIsLoadingList(true);
    try {
      const result = await api.get('/students', { hasDiscount: true, limit: 50 });
      setDiscountedStudents(result.data || []);
    } catch (error) {
      setToast({ type: 'error', title: 'Discounts error', message: error.message });
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadDiscountedStudents();
  }, []);

  const updateReason = (nextReason) => {
    setReason(nextReason);
    if (nextReason === 'Regional') {
      setPercentage(String(regionalDiscountPercentage));
    }
  };

  const selectStudent = (student) => {
    setFoundStudent(student);
    setSearchResults([]);
    setReason(student.discountReason || '');
    setPercentage(student.discountPercentage ? String(student.discountPercentage) : '');
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    const query = studentId.trim();
    if (!query) return;
    setIsSearching(true);
    setFoundStudent(null);
    setSearchResults([]);
    try {
      const result = await api.get('/students', { search: query, limit: 10 });
      const matches = result.data || [];
      if (matches.length === 0) {
        setToast({ type: 'error', title: 'Student not found', message: `No student matches "${query}".` });
      } else if (matches.length === 1) {
        selectStudent(matches[0]);
      } else {
        setSearchResults(matches);
      }
    } catch (error) {
      setToast({ type: 'error', title: 'Search failed', message: error.message });
    } finally {
      setIsSearching(false);
    }
  };

  const handleApply = async (event) => {
    event.preventDefault();
    if (!foundStudent) return;
    if (!reason || !percentage) {
      setToast({ type: 'error', title: 'Validation error', message: 'Please select a discount reason and percentage.' });
      return;
    }
    setIsSaving(true);
    try {
      const finalPercentage = reason === 'Regional' ? regionalDiscountPercentage : Number(percentage);
      const result = await api.patch(`/students/${foundStudent.id}`, { discountReason: reason, discountPercentage: finalPercentage });
      setFoundStudent(result.student);
      setToast({ type: 'success', title: 'Discount applied', message: `${result.student.fullName} now has a ${finalPercentage}% discount.` });
      await loadDiscountedStudents();
    } catch (error) {
      setToast({ type: 'error', title: 'Apply failed', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageLayout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[15px]">
        <StatCard icon={Percent} title="Students With Discount" value={discountedStudents.length.toLocaleString()} color="#2D368D" iconColor="#2D368D" />
        <StatCard icon={User} title="Regional Rate" value="20%" color="#00A451" iconColor="#00A451" />
      </div>

      <Card className="p-6 flex flex-col gap-6">
        <h2 className="text-white text-[16px] font-semibold">Find a Student</h2>
        <form onSubmit={handleSearch} className="flex items-center gap-[15px] flex-wrap">
          <div className="flex-1 relative min-w-[220px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              type="text"
              className="w-full bg-main-bg border border-white/5 text-white rounded-xl py-3.5 pl-[44px] pr-4 text-[13px] outline-none focus:border-primary transition-colors placeholder-gray-500"
              placeholder="Enter Student Name or ID (e.g. JUST-2026-0001) ..."
            />
          </div>
          <button disabled={isSearching} type="submit" className="bg-primary hover:bg-opacity-90 text-white rounded-full px-8 py-3.5 text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-50">
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {searchResults.length > 1 && (
          <div className="border-t border-white/5 pt-6 flex flex-col gap-2">
            <p className="text-gray-500 text-[12px] font-medium">Multiple students match "{studentId.trim()}" - select one:</p>
            {searchResults.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => selectStudent(student)}
                className="flex items-center gap-4 p-3 bg-main-bg border border-white/5 rounded-xl hover:border-primary transition-colors text-left cursor-pointer"
              >
                <img src={avatarFor(student.fullName)} alt={student.fullName} className="w-9 h-9 rounded-full object-cover grayscale" />
                <div>
                  <p className="text-white text-[14px] font-medium">{student.fullName}</p>
                  <p className="text-gray-500 text-[11px]">{student.studentNumber} - {student.faculty} / {student.department}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {foundStudent && (
          <div className="border-t border-white/5 pt-6 flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <img src={avatarFor(foundStudent.fullName)} alt={foundStudent.fullName} className="w-12 h-12 rounded-full object-cover grayscale" />
              <div>
                <p className="text-white text-[15px] font-semibold">{foundStudent.fullName}</p>
                <p className="text-gray-500 text-[12px]">{foundStudent.studentNumber} - {foundStudent.faculty} / {foundStudent.department}</p>
                {foundStudent.discountPercentage ? (
                  <p className="text-[#00A451] text-[12px] font-medium mt-1">Current discount: {foundStudent.discountReason} - {foundStudent.discountPercentage}%</p>
                ) : (
                  <p className="text-gray-500 text-[12px] mt-1">No discount applied yet.</p>
                )}
              </div>
            </div>

            <form onSubmit={handleApply} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 text-white text-[13px] font-semibold">
                Reason
                <select
                  value={reason}
                  onChange={(event) => updateReason(event.target.value)}
                  className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none appearance-none pr-10 cursor-pointer"
                  style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                  required
                >
                  <option value="" disabled>Select reason</option>
                  {discountReasons.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-white text-[13px] font-semibold">
                Discount Percentage
                <select
                  value={percentage}
                  onChange={(event) => setPercentage(event.target.value)}
                  disabled={reason === 'Regional'}
                  className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none appearance-none pr-10 cursor-pointer disabled:opacity-60"
                  style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}
                  required
                >
                  <option value="" disabled>Select percentage</option>
                  {discountPercentages.map((item) => <option key={item} value={item}>{item}%</option>)}
                </select>
                {reason === 'Regional' && <span className="text-gray-500 text-[11px] font-normal">Automatically set to 20% for Regional discounts.</span>}
              </label>
              <div className="md:col-span-2 flex justify-end">
                <button disabled={isSaving} type="submit" className="bg-primary hover:bg-opacity-90 text-white rounded-full px-8 py-3 text-[13px] font-semibold transition-all cursor-pointer disabled:opacity-50">
                  {isSaving ? 'Applying...' : 'Apply Discount'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Card>

      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">STUDENT</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">FACULTY</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">REASON</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">PERCENTAGE</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingList && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={4}>Loading discounts...</td></tr>}
              {!isLoadingList && discountedStudents.length === 0 && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={4}>No discounts applied yet.</td></tr>}
              {!isLoadingList && discountedStudents.map((student) => (
                <tr key={student.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
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
                  <td className="px-6 py-4 text-[13px] text-gray-400">{student.discountReason}</td>
                  <td className="px-6 py-4">
                    <span className="px-4 py-1.5 rounded-full text-[12px] font-medium border inline-flex items-center justify-center text-[#00A451] bg-[#00A451]/10 border-[#00A451]/20">
                      {student.discountPercentage}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageLayout>
  );
};

export default Discount;
