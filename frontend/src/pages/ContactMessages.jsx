import { useEffect, useMemo, useState } from 'react';
import { User, Search, Eye, Check, Trash2, X } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';

const contactTypes = ['Type of contact', 'Admission', 'Get discount', 'Problem enrollment', 'Payment', 'Technical Support', 'General'];

const ContactMessages = () => {
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState({ replied: 0, pending: 0, cancelled: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All Status');
  const [type, setType] = useState('Type of contact');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const result = await api.get('/contact-messages', { page, limit: 10, search, status, type });
      setMessages(result.data || []);
      setSummary(result.summary || { replied: 0, pending: 0, cancelled: 0 });
      setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      setToast({ type: 'error', title: 'Messages error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, [page, search, status, type]);

  useEffect(() => {
    setPage(1);
  }, [search, status, type]);

  const statuses = useMemo(() => ['All Status', 'Pending', 'Resolved', 'Cancelled'], []);
  const statusClass = (value) => {
    if (value === 'Resolved') return 'text-[#00A451] bg-[#00A451]/10 border-[#00A451]/20';
    if (value === 'Cancelled') return 'text-red-500 bg-red-500/10 border-red-500/20';
    return 'text-[#d97706] bg-[#d97706]/10 border-[#d97706]/20';
  };

  const updateStatus = async (message, nextStatus) => {
    const action = nextStatus === 'Resolved' ? 'mark this contact message as resolved' : 'cancel this contact message';
    const confirmation = [
      `Are you sure you want to ${action}?`,
      '',
      `From: ${message.name || 'Unknown sender'}`,
      `Email: ${message.email || 'Not provided'}`,
      `New status: ${nextStatus}`,
    ].join('\n');

    if (!window.confirm(confirmation)) return;
    try {
      await api.patch(`/contact-messages/${message.id}/status`, { status: nextStatus });
      setToast({ type: 'success', title: 'Saved', message: `Message marked ${nextStatus.toLowerCase()}.` });
      await loadMessages();
    } catch (error) {
      setToast({ type: 'error', title: 'Update failed', message: error.message });
    }
  };

  const deleteMessage = async (message) => {
    const confirmation = [
      'Are you sure you want to delete this contact message?',
      '',
      `From: ${message.name || 'Unknown sender'}`,
      `Email: ${message.email || 'Not provided'}`,
      'This action cannot be undone.',
    ].join('\n');

    if (!window.confirm(confirmation)) return;
    try {
      await api.delete(`/contact-messages/${message.id}`);
      setToast({ type: 'success', title: 'Deleted', message: 'Contact message deleted.' });
      await loadMessages();
    } catch (error) {
      setToast({ type: 'error', title: 'Delete failed', message: error.message });
    }
  };

  return (
    <PageLayout>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[15px]">
        <StatCard icon={User} title="Replied contact" value={summary.replied.toLocaleString()} color="#00A451" iconColor="#00A451" />
        <StatCard icon={User} title="Pending contact" value={summary.pending.toLocaleString()} color="#d97706" iconColor="#d97706" />
        <StatCard icon={User} title="Cancelled contacts" value={summary.cancelled.toLocaleString()} color="#d97706" iconColor="#d97706" />
      </div>

      <Card className="flex items-center gap-[15px] p-4 flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="text" className="w-full bg-main-bg border border-white/5 text-white rounded-xl py-3.5 pl-[44px] pr-4 text-[13px] outline-none focus:border-primary transition-colors placeholder-gray-500" placeholder="Search name, email, phone, message ..." />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
          {statuses.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={type} onChange={(event) => setType(event.target.value)} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
          {contactTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
      </Card>

      <Card className="flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 w-[60px]"><div className="w-4 h-4 rounded-full border-[1.5px] border-primary opacity-70"></div></th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">FROM</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">PHINE NUMBER</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">TYPE OF CONTACT</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">TYPE OF CONTACT</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">STATUS</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={7}>Loading contact messages...</td></tr>}
              {!isLoading && messages.length === 0 && <tr><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={7}>No contact messages found.</td></tr>}
              {!isLoading && messages.map((contact) => (
                <tr key={contact.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4"><div className="w-4 h-4 rounded-full border-[1.5px] border-primary opacity-70"></div></td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <p className="text-white text-[14px] font-medium mb-0.5">{contact.name}</p>
                      <p className="text-gray-500 text-[11px] tracking-wide">{contact.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-400">{contact.phone}</td>
                  <td className="px-6 py-4">
                    <span className="px-4 py-1.5 rounded-full text-[12px] font-medium border inline-flex items-center justify-center text-[#2D368D] bg-[#2D368D]/10 border-[#2D368D]/20">
                      {contact.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-400 max-w-[300px] truncate">{contact.message}</td>
                  <td className="px-6 py-4">
                    <span className={`px-4 py-1.5 rounded-full text-[12px] font-medium border inline-flex items-center justify-center ${statusClass(contact.status)}`}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => setSelectedMessage(contact)} className="text-gray-500 hover:text-white transition-colors p-1" type="button" title="View">
                      <Eye size={18} />
                    </button>
                    <button onClick={() => updateStatus(contact, 'Resolved')} className="text-gray-500 hover:text-[#00A451] transition-colors p-1" type="button" title="Resolve">
                      <Check size={17} />
                    </button>
                    <button onClick={() => updateStatus(contact, 'Cancelled')} className="text-gray-500 hover:text-red-500 transition-colors p-1" type="button" title="Cancel">
                      <X size={17} />
                    </button>
                    <button onClick={() => deleteMessage(contact)} className="text-gray-500 hover:text-red-500 transition-colors p-1" type="button" title="Delete">
                      <Trash2 size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex items-center justify-between p-6 mt-auto border-t border-white/5">
          <div className="text-[13px] font-medium text-gray-500">Page {pagination.page} of {pagination.pages} - {pagination.total} messages</div>
          <div className="flex gap-3">
            <button disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="px-5 py-2 rounded-full border border-white/10 text-gray-400 text-[13px] font-medium hover:text-white hover:border-white/20 transition-all bg-transparent cursor-pointer disabled:opacity-40">Previous</button>
            <button disabled={page >= pagination.pages || isLoading} onClick={() => setPage((value) => Math.min(value + 1, pagination.pages))} className="px-5 py-2 rounded-full border border-primary bg-primary text-white text-[13px] font-medium cursor-pointer disabled:opacity-40">Next</button>
          </div>
        </div>
      </Card>

      {selectedMessage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto p-7 relative">
            <button onClick={() => setSelectedMessage(null)} className="absolute right-5 top-5 text-gray-400 hover:text-white" type="button"><X size={18} /></button>
            <h2 className="text-white text-[20px] font-semibold mb-1">{selectedMessage.name}</h2>
            <p className="text-gray-500 text-[12px] mb-5">{selectedMessage.email} - {selectedMessage.phone}</p>
            <span className={`w-fit px-4 py-1.5 rounded-full text-[12px] font-medium border inline-flex items-center justify-center ${statusClass(selectedMessage.status)}`}>{selectedMessage.status}</span>
            <p className="text-gray-300 text-[13px] leading-6 whitespace-pre-wrap mt-5">{selectedMessage.message}</p>
          </Card>
        </div>
      )}
    </PageLayout>
  );
};

export default ContactMessages;
