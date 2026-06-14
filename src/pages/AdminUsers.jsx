import { useEffect, useState } from 'react';
import { Edit2, Plus, Trash2, User, X } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';

const emptyForm = {
  name: '',
  username: '',
  email: '',
  password: '',
  role: 'Officer',
  campus: 'Main Campus',
  status: 'Active',
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '-';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState({ totalAdmins: 0, activeAdmins: 0, officers: 0 });
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('Campus Admin');
  const [campus, setCampus] = useState('Main Campus');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const result = await api.get('/admin-users', { page, limit: 10, search, role, campus });
      setUsers(result.data || []);
      setSummary(result.summary || { totalAdmins: 0, activeAdmins: 0, officers: 0 });
      setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      setToast({ type: 'error', title: 'Admin users error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, search, role, campus]);

  useEffect(() => {
    setPage(1);
  }, [search, role, campus]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ ...emptyForm, ...user, password: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (!form.name || !form.username || !form.email || (!editingUser && !form.password)) {
      setToast({ type: 'error', title: 'Validation error', message: 'Name, username, email, and password are required.' });
      return;
    }
    try {
      const payload = { ...form };
      if (editingUser && !payload.password) delete payload.password;
      if (editingUser) await api.patch(`/admin-users/${editingUser.id}`, payload);
      else await api.post('/admin-users', payload);
      setToast({ type: 'success', title: 'Saved', message: editingUser ? 'Admin updated.' : 'Admin added.' });
      closeModal();
      await loadUsers();
    } catch (error) {
      setToast({ type: 'error', title: 'Save failed', message: error.message });
    }
  };

  const toggleUserStatus = async (user) => {
    const nextStatus = user.status === 'Active' ? 'Disabled' : 'Active';
    const confirmation = [
      `Are you sure you want to ${nextStatus === 'Disabled' ? 'disable' : 'enable'} this admin account?`,
      '',
      `Admin: ${user.name || 'Unnamed admin'}`,
      `Email: ${user.email || 'Not provided'}`,
      `New status: ${nextStatus}`,
    ].join('\n');

    if (!window.confirm(confirmation)) return;
    try {
      await api.patch(`/admin-users/${user.id}`, { status: nextStatus });
      setToast({ type: 'success', title: 'Saved', message: 'Admin status updated.' });
      await loadUsers();
    } catch (error) {
      setToast({ type: 'error', title: 'Update failed', message: error.message });
    }
  };

  const deleteUser = async (user) => {
    const confirmation = [
      'Are you sure you want to delete this admin user?',
      '',
      `Admin: ${user.name || 'Unnamed admin'}`,
      `Email: ${user.email || 'Not provided'}`,
      'This action cannot be undone.',
    ].join('\n');

    if (!window.confirm(confirmation)) return;
    try {
      await api.delete(`/admin-users/${user.id}`);
      setToast({ type: 'success', title: 'Deleted', message: 'Admin user deleted.' });
      await loadUsers();
    } catch (error) {
      setToast({ type: 'error', title: 'Delete failed', message: error.message });
    }
  };

  return (
    <PageLayout>
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[15px]">
        <StatCard icon={User} title="Total Admins" value={summary.totalAdmins.toLocaleString()} color="#00A451" iconColor="#00A451" />
        <StatCard icon={User} title="Active Admins" value={summary.activeAdmins.toLocaleString()} color="#d97706" iconColor="#d97706" />
        <StatCard icon={User} title="Officers" value={summary.officers.toLocaleString()} color="#d97706" iconColor="#d97706" />
      </div>

      <Card className="flex items-center gap-[15px] p-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="text" className="w-full bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none focus:border-primary transition-colors placeholder-gray-500" placeholder="Search admin users" />
        </div>
        <select value={role} onChange={(event) => setRole(event.target.value)} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
          {['Campus Admin', 'Admin', 'Officer'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={campus} onChange={(event) => setCampus(event.target.value)} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
          {['Main Campus', 'Campus 2', 'Campus 3'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <button onClick={openCreate} className="bg-primary hover:bg-opacity-90 text-white rounded-xl px-6 py-3.5 text-[13px] font-medium transition-colors ml-auto whitespace-nowrap flex items-center gap-2">
          <Plus size={16} /> Add Admin
        </button>
      </Card>

      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ADMIN</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ROLE</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">TOTAL</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">APPROVED</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">REJECTED</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">PAYMENTS</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">CONTACTS</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">DATE</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={9}>Loading admin users...</td></tr>}
              {!isLoading && users.length === 0 && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={9}>No admin users found.</td></tr>}
              {!isLoading && users.map((user) => (
                <tr key={user.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-full bg-primary shrink-0"></div>
                      <div className="flex flex-col">
                        <p className="text-white text-[14px] font-medium mb-0.5">{user.name}</p>
                        <p className="text-gray-500 text-[11px] tracking-wide">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-4 py-1.5 rounded-full text-[12px] font-medium border inline-flex items-center justify-center ${user.role === 'Admin' ? 'text-primary bg-primary/10 border-primary/20' : 'text-[#d97706] bg-[#d97706]/10 border-[#d97706]/20'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{user.total}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{user.approved}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{user.rejected}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{user.payments}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{user.contacts}</td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => openEdit(user)} className="text-gray-500 hover:text-white transition-colors p-1" type="button" title="Edit"><Edit2 size={17} /></button>
                    <button onClick={() => toggleUserStatus(user)} className="text-gray-500 hover:text-[#d97706] transition-colors p-1" type="button" title="Enable or disable"><User size={17} /></button>
                    <button onClick={() => deleteUser(user)} className="text-gray-500 hover:text-red-500 transition-colors p-1" type="button" title="Delete"><Trash2 size={17} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-6 mt-auto border-t border-white/5">
          <div className="text-[13px] font-medium text-gray-500">Page {pagination.page} of {pagination.pages} - {pagination.total} admins</div>
          <div className="flex gap-3">
            <button disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="px-5 py-2 rounded-full border border-white/10 text-gray-400 text-[13px] font-medium hover:text-white hover:border-white/20 transition-all bg-transparent cursor-pointer disabled:opacity-40">Previous</button>
            <button disabled={page >= pagination.pages || isLoading} onClick={() => setPage((value) => Math.min(value + 1, pagination.pages))} className="px-5 py-2 rounded-full border border-primary bg-primary text-white text-[13px] font-medium cursor-pointer disabled:opacity-40">Next</button>
          </div>
        </div>
      </Card>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-[640px] p-7 relative">
            <button onClick={closeModal} className="absolute right-5 top-5 text-gray-400 hover:text-white" type="button"><X size={18} /></button>
            <h2 className="text-white text-[20px] font-semibold mb-6">{editingUser ? 'Edit Admin' : 'Add Admin'}</h2>
            <form onSubmit={saveUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['name', 'Name', 'text'],
                ['username', 'Username', 'text'],
                ['email', 'Email', 'email'],
                ['password', editingUser ? 'New Password' : 'Password', 'password'],
              ].map(([key, label, inputType]) => (
                <label key={key} className="flex flex-col gap-2 text-white text-[13px] font-semibold">
                  {label}
                  <input type={inputType} value={form[key] || ''} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary" />
                </label>
              ))}
              <label className="flex flex-col gap-2 text-white text-[13px] font-semibold">
                Role
                <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary">
                  <option>Admin</option>
                  <option>Officer</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-white text-[13px] font-semibold">
                Status
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3 text-[13px] outline-none focus:border-primary">
                  <option>Active</option>
                  <option>Disabled</option>
                </select>
              </label>
              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button type="button" onClick={closeModal} className="px-6 py-3 rounded-full border border-white/10 text-gray-400 text-[13px] font-semibold">Cancel</button>
                <button type="submit" className="px-6 py-3 rounded-full bg-primary text-white text-[13px] font-semibold">Save</button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </PageLayout>
  );
};

export default AdminUsers;
