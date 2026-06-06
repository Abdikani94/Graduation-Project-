import { useEffect, useMemo, useState } from 'react';
import { User, Search, Eye } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';

const apiBaseUrl = 'http://127.0.0.1:4000';

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
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const loadApplications = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoading(false);
        setToast({
          type: 'error',
          title: 'Login required',
          message: 'Please login as admin to view submitted applications.',
        });
        return;
      }

      try {
        const response = await fetch(`${apiBaseUrl}/api/applications?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || 'Unable to load applications.');
        }

        setApplications(result.data || []);
        setSummary(result.summary || { total: 0, approved: 0, pending: 0, rejected: 0 });
      } catch (error) {
        setToast({
          type: 'error',
          title: 'Applications error',
          message: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadApplications();
  }, []);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return applications.filter((app) => {
      const matchesSearch = !query || [app.fullName, app.email, app.mobile, app.reference, app.department]
        .some((value) => String(value || '').toLowerCase().includes(query));
      const matchesStatus = status === 'All Status' || app.status === status;
      const matchesFaculty = faculty === 'All Faculties' || app.faculty === faculty;
      const matchesCampus = campus === 'All Campuses' || app.campus === campus;
      return matchesSearch && matchesStatus && matchesFaculty && matchesCampus;
    });
  }, [applications, campus, faculty, search, status]);

  const faculties = ['All Faculties', ...new Set(applications.map((app) => app.faculty).filter(Boolean))];
  const campuses = ['All Campuses', ...new Set(applications.map((app) => app.campus).filter(Boolean))];

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
              {!isLoading && filteredApplications.length === 0 && (
                <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={8}>No applications found.</td></tr>
              )}
              {!isLoading && filteredApplications.map((app) => (
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
                    <button className="text-gray-500 hover:text-white transition-colors p-1" type="button">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-6 mt-auto border-t border-white/5">
          <div className="text-[13px] font-medium text-gray-500">Showing {filteredApplications.length} of {applications.length}</div>
          <div className="flex gap-3">
            <button className="px-5 py-2 rounded-full border border-white/10 text-gray-400 text-[13px] font-medium hover:text-white hover:border-white/20 transition-all bg-transparent cursor-pointer" type="button">Previous</button>
            <button className="px-5 py-2 rounded-full border border-primary bg-primary text-white text-[13px] font-medium cursor-pointer" type="button">Next</button>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
};

export default Applications;
