import { useEffect, useMemo, useState } from 'react';
import { User, Search, Eye, Mail, Send, Trash2, X } from 'lucide-react';
import StatCard from '../components/StatCard';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';
import { confirmDialog } from '../services/dialogService';
import { isSuperAdmin } from '../utils/accessControl';

const contactTypes = ['Type of contact', 'Admission', 'Get discount', 'Problem enrollment', 'Payment', 'Technical Support', 'General'];

const ContactMessages = () => {
  const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
  const canDeleteMessages = isSuperAdmin(currentUser);
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState({ replied: 0, pending: 0, cancelled: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All Status');
  const [type, setType] = useState('Type of contact');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [reply, setReply] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const result = await api.get('/contact-messages', { page, limit: 10, search, status, type });
      setMessages(result.data || []);
      setSummary(result.summary || { replied: 0, pending: 0, cancelled: 0 });
      setPagination(result.pagination || { page: 1, pages: 1, total: 0 });
      setEmailConfigured(Boolean(result.emailConfigured));
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
    return 'text-[#2D368D] bg-[#2D368D]/10 border-[#2D368D]/20';
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

    if (!await confirmDialog(confirmation, { title: 'Update message status', confirmLabel: 'Update Status' })) return;
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

    if (!await confirmDialog(confirmation, { title: 'Delete contact message', confirmLabel: 'Delete Message', destructive: true })) return;
    try {
      await api.delete(`/contact-messages/${message.id}`);
      setToast({ type: 'success', title: 'Deleted', message: 'Contact message deleted.' });
      await loadMessages();
    } catch (error) {
      setToast({ type: 'error', title: 'Delete failed', message: error.message });
    }
  };

  const openMessage = (message) => {
    setSelectedMessage(message);
    setReply(message.response || '');
  };

  const sendReply = async (event) => {
    event.preventDefault();
    const response = reply.trim();
    if (!response) return setToast({ type: 'error', title: 'Reply required', message: 'Write a response before sending the email.' });
    setIsSendingReply(true);
    try {
      const result = await api.post(`/contact-messages/${selectedMessage.id}/reply`, { response });
      setToast({ type: 'success', title: 'Email sent', message: `Your response was emailed to ${selectedMessage.email}.` });
      setSelectedMessage(result.contact || null);
      await loadMessages();
    } catch (error) {
      setToast({ type: 'error', title: 'Email not sent', message: error.message });
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <PageLayout className="contact-messages-page admin-data-page">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[15px]">
        <StatCard icon={User} title="Replied contact" value={summary.replied.toLocaleString()} color="#00A451" iconColor="#00A451" />
        <StatCard icon={User} title="Pending contact" value={summary.pending.toLocaleString()} color="#2D368D" iconColor="#2D368D" />
        <StatCard icon={User} title="Cancelled contacts" value={summary.cancelled.toLocaleString()} color="#2D368D" iconColor="#2D368D" />
      </div>

      <Card className="contact-messages-toolbar flex items-center gap-[15px] p-4 flex-wrap">
        <div className="admin-search-field min-w-[200px]">
          <Search size={18} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} type="search" placeholder="Search name, email, phone, message ..." />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
          {statuses.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={type} onChange={(event) => setType(event.target.value)} className="bg-main-bg border border-white/5 text-white rounded-xl px-4 py-3.5 text-[13px] outline-none min-w-[160px] appearance-none pr-10 cursor-pointer" style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="%238c8a9e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
          {contactTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
      </Card>

      <Card className="contact-messages-table-card flex flex-col overflow-hidden">
        <div className="contact-messages-table-scroll overflow-x-auto">
          <table className="contact-messages-table w-full text-left border-collapse">
            <colgroup>
              <col className="contact-col-from" />
              <col className="contact-col-phone" />
              <col className="contact-col-type" />
              <col className="contact-col-message" />
              <col className="contact-col-status" />
              <col className="contact-col-actions" />
            </colgroup>
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">FROM</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">PHONE NUMBER</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">TYPE OF CONTACT</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">MESSAGE</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">STATUS</th>
                <th className="px-6 py-5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr className="contact-messages-empty-row"><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={6}>Loading contact messages...</td></tr>}
              {!isLoading && messages.length === 0 && <tr className="contact-messages-empty-row"><td className="px-6 py-8 text-center text-gray-500 text-[13px]" colSpan={6}>No contact messages found.</td></tr>}
              {!isLoading && messages.map((contact) => (
                <tr key={contact.id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                  <td className="px-6 py-4" data-label="From">
                    <div className="flex flex-col">
                      <p className="text-white text-[14px] font-medium mb-0.5">{contact.name}</p>
                      <p className="text-gray-500 text-[11px] tracking-wide">{contact.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px] text-gray-400" data-label="Phone">{contact.phone}</td>
                  <td className="px-6 py-4" data-label="Type">
                    <span className="px-4 py-1.5 rounded-full text-[12px] font-medium border inline-flex items-center justify-center text-[#2D368D] bg-[#2D368D]/10 border-[#2D368D]/20">
                      {contact.type}
                    </span>
                  </td>
                  <td className="contact-message-preview px-6 py-4 text-[13px] text-gray-400" data-label="Message">{contact.message}</td>
                  <td className="px-6 py-4" data-label="Status">
                    <span className={`px-4 py-1.5 rounded-full text-[12px] font-medium border inline-flex items-center justify-center ${statusClass(contact.status)}`}>
                      {contact.status}
                    </span>
                  </td>
                  <td className="px-6 py-4" data-label="Actions">
                    <div className="contact-message-actions">
                    <button onClick={() => openMessage(contact)} className="text-gray-500 hover:text-white transition-colors p-1" type="button" title="View and reply" aria-label={`View message from ${contact.name}`}>
                      <Eye size={18} />
                    </button>
                    <button onClick={() => openMessage(contact)} className="text-gray-500 hover:text-[#00A451] transition-colors p-1" type="button" title="Reply by email" aria-label={`Reply to ${contact.name} by email`}>
                      <Mail size={17} />
                    </button>
                    <button onClick={() => updateStatus(contact, 'Cancelled')} className="text-gray-500 hover:text-red-500 transition-colors p-1" type="button" title="Cancel" aria-label={`Cancel message from ${contact.name}`}>
                      <X size={17} />
                    </button>
                    {canDeleteMessages && <button onClick={() => deleteMessage(contact)} className="text-gray-500 hover:text-red-500 transition-colors p-1" type="button" title="Delete" aria-label={`Delete message from ${contact.name}`}>
                      <Trash2 size={17} />
                    </button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="contact-messages-pagination flex items-center justify-between p-6 mt-auto border-t border-white/5">
          <div className="text-[13px] font-medium text-gray-500">Page {pagination.page} of {pagination.pages} - {pagination.total} messages</div>
          <div className="flex gap-3">
            <button disabled={page <= 1 || isLoading} onClick={() => setPage((value) => Math.max(value - 1, 1))} className="px-5 py-2 rounded-full border border-white/10 text-gray-400 text-[13px] font-medium hover:text-white hover:border-white/20 transition-all bg-transparent cursor-pointer disabled:opacity-40">Previous</button>
            <button disabled={page >= pagination.pages || isLoading} onClick={() => setPage((value) => Math.min(value + 1, pagination.pages))} className="px-5 py-2 rounded-full border border-primary bg-primary text-white text-[13px] font-medium cursor-pointer disabled:opacity-40">Next</button>
          </div>
        </div>
      </Card>

      {selectedMessage && (
        <div className="contact-message-modal fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="contact-message-dialog w-full max-w-[560px] max-h-[90vh] overflow-y-auto p-7 relative">
            <button onClick={() => setSelectedMessage(null)} className="absolute right-5 top-5 text-gray-400 hover:text-white" type="button"><X size={18} /></button>
            <h2 className="text-white text-[20px] font-semibold mb-1">{selectedMessage.name}</h2>
            <p className="text-gray-500 text-[12px] mb-5">{selectedMessage.email} - {selectedMessage.phone}</p>
            <span className={`w-fit px-4 py-1.5 rounded-full text-[12px] font-medium border inline-flex items-center justify-center ${statusClass(selectedMessage.status)}`}>{selectedMessage.status}</span>
            <div className="contact-message-original"><span>Message from applicant</span><p>{selectedMessage.message}</p></div>
            {selectedMessage.repliedAt && <p className="contact-reply-meta">Last email sent {new Date(selectedMessage.repliedAt).toLocaleString()} by {selectedMessage.repliedBy || 'Admin'}</p>}
            <form className="contact-reply-form" onSubmit={sendReply}>
              <label htmlFor="contact-reply">Reply by email to {selectedMessage.email}</label>
              {!emailConfigured && <p className="contact-email-config-warning">Email delivery is disabled. Configure SMTP in backend/.env and restart the backend.</p>}
              <textarea id="contact-reply" rows="6" maxLength="5000" value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write the response the applicant will receive by email..." required />
              <div><span>{reply.length}/5000</span><button className="admin-button admin-button--primary" disabled={isSendingReply || !emailConfigured} type="submit"><Send size={17} /> {isSendingReply ? 'Sending...' : selectedMessage.repliedAt ? 'Send Updated Reply' : 'Send Email Reply'}</button></div>
            </form>
          </Card>
        </div>
      )}
    </PageLayout>
  );
};

export default ContactMessages;
