import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Search, ShieldCheck } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';

const statusClass = (status) => status === 'Full'
  ? 'text-[#2D368D] bg-[#2D368D]/10 border-[#2D368D]/20'
  : 'text-[#00A451] bg-[#00A451]/10 border-[#00A451]/20';

const Classes = () => {
  const [classes, setClasses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, open: 0, full: 0 });
  const [search, setSearch] = useState('');
  const [faculty, setFaculty] = useState('All Faculties');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

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

  useEffect(() => { loadClasses(); }, [page, search, faculty]);
  useEffect(() => setPage(1), [search, faculty]);
  const faculties = useMemo(() => ['All Faculties', ...new Set(classes.map((item) => item.faculty).filter(Boolean))], [classes]);

  return (
    <PageLayout>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[15px]">
        <StatCard icon={GraduationCap} title="Total Classes" value={summary.total.toLocaleString()} color="#2D368D" iconColor="#2D368D" />
        <StatCard icon={GraduationCap} title="Open Classes" value={summary.open.toLocaleString()} color="#00A451" iconColor="#00A451" />
        <StatCard icon={GraduationCap} title="Full Classes" value={summary.full.toLocaleString()} color="#2D368D" iconColor="#2D368D" />
      </div>

      <Card className="flex items-center gap-4 p-4 flex-wrap">
        <div className="flex-1 relative min-w-[220px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="admin-field w-full pl-11" placeholder="Search class code, faculty, or department" />
        </div>
        <select value={faculty} onChange={(event) => setFaculty(event.target.value)} className="admin-field min-w-[220px]">
          {faculties.map((item) => <option key={item}>{item}</option>)}
        </select>
      </Card>

      <Card className="flex items-start gap-3 border border-[#00A451]/20 bg-[#00A451]/5 p-4">
        <ShieldCheck className="mt-0.5 shrink-0 text-[#00A451]" size={20} />
        <div>
          <h2 className="text-[14px] font-semibold text-white">Automatic class management</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-gray-400">Classes are generated when a student is approved. Each class holds exactly 60 active students; the next numbered class is created only when all existing classes for that department and academic year are full.</p>
        </div>
      </Card>

      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead><tr className="border-b border-white/5">
              {['Class Code', 'Faculty', 'Department', 'Academic Year', 'Sequence', 'Enrolled / Capacity', 'Status'].map((heading) => (
                <th key={heading} className="px-5 py-4 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{heading}</th>
              ))}
            </tr></thead>
            <tbody>
              {isLoading && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={7}>Loading classes...</td></tr>}
              {!isLoading && classes.length === 0 && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={7}>No generated classes yet. The first class will appear after an application is approved.</td></tr>}
              {!isLoading && classes.map((item) => (
                <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4 text-white text-[14px] font-semibold">{item.classCode || item.name}</td>
                  <td className="px-5 py-4 text-[13px] text-gray-400">{item.faculty}</td>
                  <td className="px-5 py-4 text-[13px] text-gray-400">{item.department}</td>
                  <td className="px-5 py-4 text-[13px] text-gray-400">{item.academicYear || 'Current'}</td>
                  <td className="px-5 py-4 text-[13px] text-gray-400">{item.sequenceNumber || 1}</td>
                  <td className="px-5 py-4 text-[13px] text-gray-400">{item.enrolled} / 60</td>
                  <td className="px-5 py-4"><span className={`px-3 py-1 rounded-full text-[11px] font-medium border ${statusClass(item.status)}`}>{item.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-4 p-5 mt-auto border-t border-white/5">
          <span className="text-[12px] text-gray-500">Page {pagination.page} of {pagination.pages} · {pagination.total} classes</span>
          <div className="flex gap-2">
            <button disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="admin-button admin-button--secondary" type="button">Previous</button>
            <button disabled={page >= pagination.pages || isLoading} onClick={() => setPage((value) => Math.min(value + 1, pagination.pages))} className="admin-button admin-button--primary" type="button">Next</button>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
};

export default Classes;
