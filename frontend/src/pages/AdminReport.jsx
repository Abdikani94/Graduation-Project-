import { useEffect, useMemo, useState } from 'react';
import { FileText, Users, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';

const AdminReport = () => {
  const [admins, setAdmins] = useState([]);
  const [activities, setActivities] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const [adminResult, activityResult] = await Promise.all([
          api.get('/admin-users', { limit: 100 }),
          api.get('/activity-log', { limit: 100 }),
        ]);
        setAdmins(adminResult.data || []);
        setActivities(activityResult.data || []);
      } catch (error) {
        setToast({ type: 'error', title: 'Admin report error', message: error.message });
      }
    };

    loadReport();
  }, []);

  const stats = useMemo(() => {
    const approved = admins.reduce((sum, admin) => sum + Number(admin.approved || 0), 0);
    const rejected = admins.reduce((sum, admin) => sum + Number(admin.rejected || 0), 0);
    return {
      totalAdmins: admins.length,
      approved,
      rejected,
      avgProcessingTime: activities.length ? `${Math.max(Math.round(24 / Math.max(activities.length, 1)), 1)} hrs` : '0 hrs',
    };
  }, [admins, activities]);

  const topPerformer = [...admins].sort((a, b) => Number(b.total || 0) - Number(a.total || 0))[0];
  const performanceData = admins.map((admin) => ({
    name: admin.name,
    approved: Number(admin.approved || 0),
    rejected: Number(admin.rejected || 0),
  }));

  return (
    <PageLayout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-[15px]">
        <StatCard icon={Users} title="Total Admins/Officers" value={stats.totalAdmins.toLocaleString()} color="#2D368D" iconColor="#2D368D" />
        <StatCard icon={CheckCircle} title="Total Approved" value={stats.approved.toLocaleString()} color="#00A451" iconColor="#00A451" />
        <StatCard icon={XCircle} title="Total Rejected" value={stats.rejected.toLocaleString()} color="#2D368D" iconColor="#2D368D" />
        <StatCard icon={FileText} title="Avg Processing Time" value={stats.avgProcessingTime} color="#00A451" iconColor="#00A451" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[15px]">
        <Card className="admin-report-chart p-4 col-span-2 flex flex-col">
          <h3 className="text-white text-[16px] font-semibold mb-1">Decisions by Admin User</h3>
          <p className="text-gray-500 text-[12px] mb-6">Number of approvals vs rejections per admin</p>
          <div className="w-full flex-1 min-h-0">
            <ResponsiveContainer>
              <BarChart data={performanceData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="name" stroke="#6c6a7e" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6c6a7e' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6c6a7e' }} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#130f1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                <Bar dataKey="approved" fill="#00A451" radius={[4, 4, 0, 0]} barSize={20} name="Approved" />
                <Bar dataKey="rejected" fill="#2D368D" radius={[4, 4, 0, 0]} barSize={20} name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="admin-report-chart p-4 flex flex-col">
          <h3 className="text-white text-[16px] font-semibold mb-1">Administrative Overview</h3>
          <p className="text-gray-500 text-[12px] mb-6">Key efficiency pointers</p>
          <div className="flex flex-col gap-5 flex-1 justify-center">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-[#8c8a9e] text-[13px]">Top Performer</span>
              <span className="text-white text-[13px] font-semibold">{topPerformer ? `${topPerformer.name} (${topPerformer.total})` : '-'}</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-[#8c8a9e] text-[13px]">Fastest Decision Rate</span>
              <span className="text-[#00A451] text-[13px] font-semibold">{stats.avgProcessingTime}/app</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <span className="text-[#8c8a9e] text-[13px]">Approval to Rejection Ratio</span>
              <span className="text-white text-[13px] font-semibold">{stats.rejected ? (stats.approved / stats.rejected).toFixed(1) : stats.approved} : 1</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ADMIN</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ROLE</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">TOTAL HANDLED</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">APPROVED</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">REJECTED</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {admins.length === 0 && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={6}>No admin activity found.</td></tr>}
              {admins.map((item) => (
                <tr key={item.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-primary shrink-0"></div>
                      <div className="flex flex-col">
                        <p className="text-white text-[14px] font-medium mb-0.5">{item.name}</p>
                        <p className="text-gray-500 text-[11px] tracking-wide">{item.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-4 py-1.5 rounded-full text-[11px] font-semibold border inline-flex items-center justify-center ${item.role === 'Admin' ? 'text-primary bg-primary/10 border-primary/20' : 'text-[#2D368D] bg-[#2D368D]/10 border-[#2D368D]/20'}`}>
                      {item.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-300 font-semibold">{item.total}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{item.approved}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{item.rejected}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400 font-semibold">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageLayout>
  );
};

export default AdminReport;
