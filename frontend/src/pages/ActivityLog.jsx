import { useEffect, useState } from 'react';
import { History, Search } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';

const timeAgo = (value) => {
  if (!value) return '-';
  const minutes = Math.max(Math.floor((Date.now() - new Date(value).getTime()) / 60000), 0);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
};

const ActivityLog = () => {
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('All Modules');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const loadActivities = async () => {
    setIsLoading(true);
    try {
      const result = await api.get('/activity-log', { page, limit: 10, search, module });
      setActivities(result.data || []);
      setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      setToast({ type: 'error', title: 'Activity error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [page, search, module]);

  useEffect(() => {
    setPage(1);
  }, [search, module]);

  const exportLog = async () => {
    try {
      await api.downloadCsv('/activity-log/export/csv', 'activity-log.csv', { search, module });
    } catch (error) {
      setToast({ type: 'error', title: 'Export failed', message: error.message });
    }
  };

  const getActionBadge = (action = '') => {
    if (action.includes('Approved') || action.includes('Added') || action.includes('Resolved')) {
      return <span className="px-4 py-1.5 rounded-full text-[11px] font-semibold border text-[#00A451] bg-[#00A451]/10 border-[#00A451]/20 inline-flex items-center justify-center">{action}</span>;
    }
    if (action.includes('Rejected') || action.includes('Deleted')) {
      return <span className="px-4 py-1.5 rounded-full text-[11px] font-semibold border text-red-500 bg-red-500/10 border-red-500/20 inline-flex items-center justify-center">{action}</span>;
    }
    return <span className="px-4 py-1.5 rounded-full text-[11px] font-semibold border text-[#2D368D] bg-[#2D368D]/10 border-[#2D368D]/20 inline-flex items-center justify-center">{action}</span>;
  };

  return (
    <PageLayout className="activity-log-page admin-data-page">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex items-center gap-3 bg-transparent">
        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary">
          <History size={20} />
        </div>
        <h1 className="text-white text-[22px] font-semibold tracking-tight">System Activity Log</h1>
      </div>

      <Card className="activity-log-filters admin-search-toolbar">
        <label className="admin-search-field min-w-[220px]">
          <Search size={18} aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by admin or action"
            className=""
          />
        </label>
        <div className="min-w-[160px]">
          <select
            value={module}
            onChange={(event) => setModule(event.target.value)}
            className="admin-filter-select"
            style={{
              backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 16px center'
            }}
          >
            {['All Modules', 'Applications', 'Programs', 'Students', 'Classes', 'Payments', 'Discount', 'Admin Users', 'Contacts', 'Settings'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <button onClick={exportLog} className="admin-search-submit whitespace-nowrap cursor-pointer">
          Export Log
        </button>
      </Card>

      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ACTION</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">BEFORE ACTION</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ADMIN</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">APPLICANT PERSON</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">APPLICATION REFERENCE</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">MODULE</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">TIME</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={7}>Loading activity...</td></tr>}
              {!isLoading && activities.length === 0 && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={7}>No activity found.</td></tr>}
              {!isLoading && activities.map((item) => (
                <tr key={item.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4">{getActionBadge(item.action)}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400 font-medium">
                    {item.beforeAction ? (
                      <span className="px-3 py-1 rounded-full text-[11px] font-semibold border text-gray-400 bg-gray-400/5 border-white/5 inline-flex items-center justify-center">
                        {item.beforeAction}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <p className="text-white text-[14px] font-medium mb-0.5">{item.adminName || '-'}</p>
                      <p className="text-gray-500 text-[11px] tracking-wide">{item.adminEmail || '-'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-white font-medium">{item.applicantPerson || '-'}</td>
                  <td className="px-6 py-4 text-[13px] text-primary font-semibold">{item.applicationReference || '-'}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{item.module || '-'}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-500 font-medium">{timeAgo(item.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-6 mt-auto border-t border-white/5">
          <div className="text-[13px] font-medium text-gray-500">Page {pagination.page} of {pagination.pages} - {pagination.total} actions</div>
          <div className="flex gap-3">
            <button disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="px-5 py-2 rounded-full border border-white/10 text-gray-500 text-[13px] font-medium hover:text-white hover:border-white/20 transition-all bg-transparent cursor-pointer disabled:opacity-40">
              Previous
            </button>
            <button disabled={page >= pagination.pages || isLoading} onClick={() => setPage((value) => Math.min(value + 1, pagination.pages))} className="px-5 py-2 rounded-full border border-primary bg-primary text-white text-[13px] font-semibold cursor-pointer disabled:opacity-40">
              Next
            </button>
          </div>
        </div>
      </Card>
    </PageLayout>
  );
};

export default ActivityLog;
