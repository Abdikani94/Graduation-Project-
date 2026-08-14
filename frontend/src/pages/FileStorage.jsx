import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive, Bell, CheckCircle2, Download, Eye, File, FileArchive, FileCheck2, FileClock,
  FileText, FolderOpen, HardDrive, MoreHorizontal, Pencil, RefreshCw, Search, Share2, Upload, Users, X, XCircle
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Card from '../components/Card';
import Toast from '../components/Toast';
import api from '../api/axios';
import { confirmDialog, promptDialog } from '../services/dialogService';

const tabs = [
  ['all', 'All Files'], ['daily', 'Daily Reports'], ['monthly', 'Monthly Reports'],
  ['shared', 'Shared With Me'], ['mine', 'My Uploads'], ['pending', 'Pending Approval'], ['archived', 'Archived Files'],
];
const emptyUpload = {
  title: '', reportType: 'Daily Report', reportDate: new Date().toISOString().slice(0, 10),
  reportingMonth: String(new Date().getMonth() + 1), reportingYear: String(new Date().getFullYear()),
  description: '', teamId: '', departmentId: '', category: 'Reports', visibility: 'Private',
  selectedUsers: [], selectedTeam: '', selectedDepartment: '', tags: '', approvalRequired: true, expiryDate: '',
};
const statusStyles = {
  Approved: 'text-[#00A451] bg-[#00A451]/10 border-[#00A451]/20',
  Pending: 'text-[#2D368D] bg-[#2D368D]/10 border-[#2D368D]/20',
  Rejected: 'text-red-700 bg-red-50 border-red-200',
  'Revision Requested': 'text-[#2D368D] bg-[#2D368D]/10 border-[#2D368D]/20',
};
const allowedFileExtensions = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'zip']);
const maxUploadBytes = 10 * 1024 * 1024;
const currentDate = new Date();
const today = currentDate.toISOString().slice(0, 10);
const tomorrow = new Date(currentDate.getTime() + 86400000).toISOString().slice(0, 10);
const bytes = (value = 0) => value >= 1024 ** 3 ? `${(value / 1024 ** 3).toFixed(1)} GB`
  : value >= 1024 ** 2 ? `${(value / 1024 ** 2).toFixed(1)} MB`
    : value >= 1024 ? `${(value / 1024).toFixed(1)} KB` : `${value} B`;
const period = (item) => item.reportType === 'Daily Report' ? item.reportDate
  : item.reportType === 'Monthly Report' ? `${item.reportingMonth}/${item.reportingYear}` : '—';

function FileStorage() {
  const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
  const isAdmin = currentUser.role === 'Admin';
  const [files, setFiles] = useState([]);
  const [stats, setStats] = useState({});
  const [options, setOptions] = useState({ users: [], campuses: [], teams: [], departments: [] });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [reportType, setReportType] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [upload, setUpload] = useState(emptyUpload);
  const [attachment, setAttachment] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [preview, setPreview] = useState(null);
  const [notifications, setNotifications] = useState({ data: [], unread: 0 });
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selected, setSelected] = useState([]);

  const visibleTabs = useMemo(() => isAdmin ? tabs : tabs.filter(([key]) => key !== 'pending'), [isAdmin]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, summary, selections, alerts] = await Promise.all([
        api.get('/files', { tab, search, status, reportType, sort, page, limit: 12 }),
        api.get('/files/stats'), api.get('/files/options'), api.get('/file-notifications'),
      ]);
      setFiles(list.data || []);
      setPagination(list.pagination || { page: 1, pages: 1, total: 0 });
      setStats(summary.stats || {});
      setOptions(selections || { users: [], campuses: [], teams: [], departments: [] });
      setNotifications(alerts || { data: [], unread: 0 });
      setSelected([]);
    } catch (error) {
      setToast({ type: 'error', title: 'File storage error', message: error.message });
    } finally { setLoading(false); }
  }, [page, reportType, search, sort, status, tab]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab, search, status, reportType, sort]);

  const validateAttachment = (file) => {
    if (!file) return 'Choose a file to upload.';
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedFileExtensions.has(extension)) return 'This file type is not allowed.';
    if (file.size === 0) return 'The selected file is empty. Choose a file that contains data.';
    if (file.size > maxUploadBytes) return 'The selected file exceeds the 10 MB limit.';
    return '';
  };

  const chooseAttachment = (file) => {
    const message = validateAttachment(file);
    if (message) {
      setAttachment(null);
      setToast({ type: 'error', title: 'Invalid file', message });
      return false;
    }
    setAttachment(file);
    return true;
  };

  const validateUploadForm = () => {
    const tags = upload.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
    if (upload.title.trim().length < 3 || upload.title.trim().length > 120) return 'File title must be between 3 and 120 characters.';
    if (!upload.category.trim() || upload.category.trim().length > 80) return 'Category is required and cannot exceed 80 characters.';
    if (upload.description.trim().length > 2000) return 'Description cannot exceed 2,000 characters.';
    if (tags.length > 20 || tags.some((tag) => tag.length > 40)) return 'Use no more than 20 tags, with 40 characters per tag.';
    if (upload.reportType === 'Daily Report' && (!upload.reportDate || upload.reportDate > today)) return 'Daily report date cannot be in the future.';
    if (upload.reportType === 'Monthly Report') {
      const current = new Date(); const month = Number(upload.reportingMonth); const year = Number(upload.reportingYear);
      if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > current.getFullYear()) return 'Choose a valid reporting month and year.';
      if (year === current.getFullYear() && month > current.getMonth() + 1) return 'Monthly report period cannot be in the future.';
    }
    if (upload.expiryDate && upload.expiryDate <= today) return 'Expiry date must be after today.';
    if (upload.visibility === 'Selected Users' && upload.selectedUsers.length === 0) return 'Select at least one user.';
    if (upload.visibility === 'Selected Team' && !upload.selectedTeam) return 'Select a team.';
    if (upload.visibility === 'Selected Department' && !upload.selectedDepartment) return 'Select a department.';
    return validateAttachment(attachment);
  };

  const openBlob = async (item, download = false) => {
    try {
      const result = await api.fileBlob(`/files/${item.id}/${download ? 'download' : 'preview'}`);
      const url = URL.createObjectURL(result.blob);
      if (download) {
        const link = document.createElement('a'); link.href = url; link.download = item.originalFileName;
        document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); await load();
      } else setPreview({ item, url });
    } catch (error) { setToast({ type: 'error', title: 'File access failed', message: error.message }); }
  };

  const submitUpload = async (event) => {
    event.preventDefault();
    const validationError = validateUploadForm();
    if (validationError) return setToast({ type: 'error', title: 'Upload validation', message: validationError });
    setSaving(true);
    try {
      const form = new FormData();
      Object.entries(upload).forEach(([key, value]) => form.append(key, Array.isArray(value) ? JSON.stringify(value) : value));
      form.append('file', attachment);
      await api.post('/files', form);
      setUploadOpen(false); setUpload(emptyUpload); setAttachment(null);
      setToast({ type: 'success', title: 'Upload complete', message: 'The file was stored securely.' });
      await load();
    } catch (error) { setToast({ type: 'error', title: 'Upload failed', message: error.message }); }
    finally { setSaving(false); }
  };

  const archive = async (item) => {
    try { await api.patch(`/files/${item.id}/archive`, { archived: !item.isArchived }); await load(); }
    catch (error) { setToast({ type: 'error', title: 'Action failed', message: error.message }); }
  };
  const remove = async (item) => {
    if (!await confirmDialog(`Permanently delete “${item.title}”? This cannot be undone.`, { title: 'Delete stored file', confirmLabel: 'Delete File', destructive: true })) return;
    try { await api.delete(`/files/${item.id}`); await load(); }
    catch (error) { setToast({ type: 'error', title: 'Delete failed', message: error.message }); }
  };
  const review = async (item, nextStatus) => {
    const adminComment = await promptDialog(`Add an optional comment for ${nextStatus}.`, '', { title: `${nextStatus} file`, confirmLabel: 'Save Review' });
    if (adminComment === null) return;
    try { await api.patch(`/files/${item.id}/review`, { status: nextStatus, adminComment }); await load(); }
    catch (error) { setToast({ type: 'error', title: 'Review failed', message: error.message }); }
  };
  const share = async (item) => {
    const input = await promptDialog('Enter one or more user IDs separated by commas. Leave empty to share with all users.', '', { title: 'Share stored file', confirmLabel: 'Update Sharing' });
    if (input === null) return;
    const selectedUsers = input.split(',').map((value) => value.trim()).filter(Boolean);
    try {
      await api.post(`/files/${item.id}/share`, { visibility: selectedUsers.length ? 'Selected Users' : 'All Users', selectedUsers });
      setToast({ type: 'success', title: 'Sharing updated', message: 'File permissions were updated.' }); await load();
    } catch (error) { setToast({ type: 'error', title: 'Share failed', message: error.message }); }
  };
  const editDetails = async (item) => {
    const title = await promptDialog('Update the file title.', item.title, { title: 'Edit file title', required: true, multiline: false, confirmLabel: 'Continue' });
    if (!title?.trim()) return;
    const description = await promptDialog('Update the file description.', item.description || '', { title: 'Edit file description', confirmLabel: 'Save Changes' });
    if (description === null) return;
    try { await api.patch(`/files/${item.id}`, { title: title.trim(), description }); await load(); }
    catch (error) { setToast({ type: 'error', title: 'Edit failed', message: error.message }); }
  };
  const replace = (item) => {
    const input = document.createElement('input'); input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.zip';
    input.onchange = async () => {
      if (!input.files?.[0]) return;
      if (!chooseAttachment(input.files[0])) return;
      const form = new FormData(); form.append('file', input.files[0]);
      try { await api.post(`/files/${item.id}/replace`, form); setToast({ type: 'success', title: 'File replaced', message: 'The new version is stored securely.' }); await load(); }
      catch (error) { setToast({ type: 'error', title: 'Replace failed', message: error.message }); }
    };
    input.click();
  };
  const readNotification = async (notification) => {
    if (!notification.read) await api.patch(`/file-notifications/${notification.id}/read`, {});
    setNotificationsOpen(false);
    if (notification.fileId) {
      setSearch(''); setTab('all');
    }
    await load();
  };
  const runBulk = async (action) => {
    const chosen = files.filter((item) => selected.includes(item.id));
    if (!chosen.length) return;
    if (action === 'delete' && !await confirmDialog(`Delete ${chosen.length} selected files permanently?`, { title: 'Delete selected files', confirmLabel: `Delete ${chosen.length} Files`, destructive: true })) return;
    try {
      if (action === 'approve' || action === 'reject') await Promise.all(chosen.map((item) => api.patch(`/files/${item.id}/review`, { status: action === 'approve' ? 'Approved' : 'Rejected', adminComment: 'Bulk review action' })));
      if (action === 'archive') await Promise.all(chosen.map((item) => api.patch(`/files/${item.id}/archive`, { archived: true })));
      if (action === 'delete') await Promise.all(chosen.map((item) => api.delete(`/files/${item.id}`)));
      if (action === 'download') for (const item of chosen) await openBlob(item, true);
      if (action === 'share') {
        const sharingInput = await promptDialog('User IDs separated by commas; leave empty for all users.', '', { title: 'Share selected files', confirmLabel: 'Update Sharing' });
        if (sharingInput === null) return;
        const userIds = sharingInput.split(',').map((v) => v.trim()).filter(Boolean);
        await Promise.all(chosen.map((item) => api.post(`/files/${item.id}/share`, { visibility: userIds.length ? 'Selected Users' : 'All Users', selectedUsers: userIds })));
      }
      await load();
    } catch (error) { setToast({ type: 'error', title: 'Bulk action failed', message: error.message }); }
  };

  const cards = [
    ['Total Files', stats.totalFiles, FolderOpen, '#2D368D'], ['Daily Reports', stats.dailyReports, FileText, '#00A451'],
    ['Monthly Reports', stats.monthlyReports, FileClock, '#2D368D'], ['Shared With Me', stats.sharedWithMe, Users, '#2D368D'],
    ['Pending Approval', stats.pendingApproval, FileCheck2, '#2D368D'], ['Storage Used', bytes(stats.storageUsed), HardDrive, '#00A451'],
    ...(isAdmin ? [['User Uploads', stats.totalUserUploads, Upload, '#475569'], ['Approved', stats.approvedFiles, CheckCircle2, '#00A451'], ['Rejected', stats.rejectedFiles, XCircle, '#dc2626']] : []),
  ];

  return (
    <PageLayout className="file-storage-page">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <header className="storage-header">
        <div><h1>Centralized File Storage</h1><p>Upload, organize, share, and manage daily and monthly report files</p></div>
        <div className="storage-header-actions">
          <button className="storage-notification-button" aria-label="File notifications" onClick={() => setNotificationsOpen((open) => !open)}><Bell size={18} />{notifications.unread > 0 && <span>{notifications.unread}</span>}</button>
          <button className="storage-upload-button" onClick={() => setUploadOpen(true)}><Upload size={18} /> Upload File</button>
          {notificationsOpen && <aside className="storage-notifications"><header><strong>File Notifications</strong><span>{notifications.unread} unread</span></header>{!notifications.data.length && <p>No file notifications yet.</p>}{notifications.data.map((notification) => <button className={notification.read ? '' : 'unread'} key={notification.id} onClick={() => readNotification(notification)}><strong>{notification.title}</strong><span>{notification.message}</span><small>{new Date(notification.createdAt).toLocaleString()}</small></button>)}</aside>}
        </div>
      </header>

      <section className="storage-summary-grid">
        {cards.map(([label, value, Icon, color]) => <Card className="storage-summary-card" key={label}><span style={{ color, background: `${color}12` }}><Icon size={20} /></span><div><p>{label}</p><strong>{value ?? 0}</strong></div></Card>)}
      </section>

      <Card className="storage-workspace">
        <nav className="storage-tabs">{visibleTabs.map(([key, label]) => <button className={tab === key ? 'active' : ''} key={key} onClick={() => setTab(key)}>{label}</button>)}</nav>
        <div className="storage-filters">
          <label><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, filename, tags..." /></label>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}><option value="">All report types</option><option>Daily Report</option><option>Monthly Report</option><option>General File</option></select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option>Pending</option><option>Approved</option><option>Rejected</option><option>Revision Requested</option></select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="name">File name</option><option value="size">File size</option><option value="downloads">Most downloaded</option></select>
        </div>
        {isAdmin && selected.length > 0 && <div className="storage-bulk"><strong>{selected.length} selected</strong><button onClick={() => runBulk('approve')}>Approve</button><button onClick={() => runBulk('reject')}>Reject</button><button onClick={() => runBulk('download')}>Download</button><button onClick={() => runBulk('share')}>Share</button><button onClick={() => runBulk('archive')}>Archive</button><button className="danger" onClick={() => runBulk('delete')}>Delete</button></div>}

        <div className="storage-table-wrap">
          <table className="storage-table"><thead><tr>{isAdmin && <th><input aria-label="Select all files" type="checkbox" checked={files.length > 0 && selected.length === files.length} onChange={(e) => setSelected(e.target.checked ? files.map((item) => item.id) : [])} /></th>}<th>File</th><th>Report / Period</th><th>Uploaded By</th><th>Access</th><th>Status</th><th>Usage</th><th className="storage-actions-heading">Actions</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={isAdmin ? 8 : 7} className="storage-empty">Loading files...</td></tr>}
              {!loading && !files.length && <tr><td colSpan={isAdmin ? 8 : 7} className="storage-empty"><FileArchive size={34} /><strong>No files found</strong><span>Upload a report or change the current filters.</span></td></tr>}
              {!loading && files.map((item) => <tr key={item.id}>
                {isAdmin && <td data-label="Select"><input aria-label={`Select ${item.title}`} type="checkbox" checked={selected.includes(item.id)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} /></td>}
                <td data-label="File"><div className="storage-file-cell"><span><File size={20} /></span><div><strong>{item.title}</strong><small>{item.originalFileName} · {bytes(item.fileSize)}</small></div></div></td>
                <td data-label="Report"><strong>{item.reportType}</strong><small>{period(item)}</small></td>
                <td data-label="Uploaded by"><strong>{item.uploader?.name}</strong><small>{new Date(item.createdAt).toLocaleDateString()}</small></td>
                <td data-label="Access"><strong>{item.visibility}</strong><small>{item.teamId || item.departmentId || '—'}</small></td>
                <td data-label="Status"><span className={`storage-status ${statusStyles[item.approvalStatus] || ''}`}>{item.approvalStatus}</span>{item.adminComment && <small title={item.adminComment}>Admin comment</small>}</td>
                <td data-label="Usage"><strong>{item.downloadCount} downloads</strong><small>{item.viewCount} views</small></td>
                <td data-label="Actions" className="storage-actions-cell"><div className="storage-actions">
                  {item.canPreview && <button title="Preview" onClick={() => openBlob(item)}><Eye size={16} /></button>}
                  <button title="Download" onClick={() => openBlob(item, true)}><Download size={16} /></button>
                  <details className="admin-action-menu"><summary aria-label={`More actions for ${item.title}`}><MoreHorizontal size={16} /></summary><div className="admin-action-menu-popover storage-action-menu-popover">
                    {(isAdmin || item.uploadedBy === currentUser.id) && <button onClick={() => editDetails(item)}><Pencil size={14} /> Edit details</button>}
                    {(isAdmin || item.uploadedBy === currentUser.id) && <button onClick={() => replace(item)}><RefreshCw size={14} /> Replace file</button>}
                    {(isAdmin || item.uploadedBy === currentUser.id) && <button onClick={() => share(item)}><Share2 size={14} /> Share</button>}
                    {(isAdmin || item.uploadedBy === currentUser.id) && <button onClick={() => archive(item)}><Archive size={14} /> {item.isArchived ? 'Restore' : 'Archive'}</button>}
                    {isAdmin && item.approvalStatus === 'Pending' && <><button onClick={() => review(item, 'Approved')}><CheckCircle2 size={14} /> Approve</button><button onClick={() => review(item, 'Rejected')}><XCircle size={14} /> Reject</button><button onClick={() => review(item, 'Revision Requested')}><FileClock size={14} /> Request revision</button></>}
                    {(isAdmin || item.uploadedBy === currentUser.id) && <button className="danger" onClick={() => remove(item)}><X size={14} /> Delete</button>}
                  </div></details>
                </div></td>
              </tr>)}
            </tbody></table>
        </div>
        <footer className="storage-pagination"><span>{pagination.total || 0} files</span><div><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button><span>Page {pagination.page || 1} of {pagination.pages || 1}</span><button disabled={page >= (pagination.pages || 1)} onClick={() => setPage((p) => p + 1)}>Next</button></div></footer>
      </Card>

      {uploadOpen && <div className="storage-modal-backdrop" role="dialog" aria-modal="true"><form className="storage-upload-modal" onSubmit={submitUpload}>
        <header><div><h2>Upload File</h2><p>Files are stored securely and checked before upload.</p></div><button type="button" onClick={() => setUploadOpen(false)}><X /></button></header>
        <div className="storage-form-grid">
          <label><span>File Title</span><input required minLength="3" maxLength="120" value={upload.title} onChange={(e) => setUpload({ ...upload, title: e.target.value })} /></label>
          <label><span>Report Type</span><select value={upload.reportType} onChange={(e) => setUpload({ ...upload, reportType: e.target.value })}><option>Daily Report</option><option>Monthly Report</option><option>General File</option></select></label>
          {upload.reportType === 'Daily Report' && <label><span>Report Date</span><input required type="date" max={today} value={upload.reportDate} onChange={(e) => setUpload({ ...upload, reportDate: e.target.value })} /></label>}
          {upload.reportType === 'Monthly Report' && <><label><span>Reporting Month</span><select value={upload.reportingMonth} onChange={(e) => setUpload({ ...upload, reportingMonth: e.target.value })}>{Array.from({ length: 12 }, (_, i) => <option value={i + 1} key={i}>{new Date(2026, i).toLocaleString('en', { month: 'long' })}</option>)}</select></label><label><span>Reporting Year</span><input required type="number" min="2000" max={new Date().getFullYear()} value={upload.reportingYear} onChange={(e) => setUpload({ ...upload, reportingYear: e.target.value })} /></label></>}
          <label><span>Category</span><input required maxLength="80" value={upload.category} onChange={(e) => setUpload({ ...upload, category: e.target.value })} /></label>
          <label><span>Campus</span><select value={upload.teamId} onChange={(e) => setUpload({ ...upload, teamId: e.target.value })}><option value="">No campus</option>{(options.campuses?.length ? options.campuses : ['Main Campus', 'Campus 2', 'Campus 3']).map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Department</span><select value={upload.departmentId} onChange={(e) => setUpload({ ...upload, departmentId: e.target.value })}><option value="">No department</option>{options.departments.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Visibility</span><select value={upload.visibility} onChange={(e) => setUpload({ ...upload, visibility: e.target.value })}><option>Private</option><option>All Users</option><option>Selected Users</option><option>Selected Team</option><option>Selected Department</option><option>Admin Only</option></select></label>
          {upload.visibility === 'Selected Users' && <label><span>Select Users</span><select multiple value={upload.selectedUsers} onChange={(e) => setUpload({ ...upload, selectedUsers: [...e.target.selectedOptions].map((option) => option.value) })}>{options.users.filter((u) => u.id !== currentUser.id).map((user) => <option value={user.id} key={user.id}>{user.name} ({user.role})</option>)}</select></label>}
          {upload.visibility === 'Selected Team' && <label><span>Select Team</span><select required value={upload.selectedTeam} onChange={(e) => setUpload({ ...upload, selectedTeam: e.target.value })}><option value="">Choose team</option>{options.teams.map((item) => <option key={item}>{item}</option>)}</select></label>}
          {upload.visibility === 'Selected Department' && <label><span>Select Department</span><select required value={upload.selectedDepartment} onChange={(e) => setUpload({ ...upload, selectedDepartment: e.target.value })}><option value="">Choose department</option>{options.departments.map((item) => <option key={item}>{item}</option>)}</select></label>}
          <label><span>Tags</span><input maxLength="819" placeholder="finance, weekly, operations" value={upload.tags} onChange={(e) => setUpload({ ...upload, tags: e.target.value })} /></label>
          <label><span>Expiry Date (optional)</span><input type="date" min={tomorrow} value={upload.expiryDate} onChange={(e) => setUpload({ ...upload, expiryDate: e.target.value })} /></label>
          <label className="storage-description"><span>Description</span><textarea maxLength="2000" rows="3" value={upload.description} onChange={(e) => setUpload({ ...upload, description: e.target.value })} /></label>
          <label className={`storage-dropzone ${dragging ? 'dragging' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); chooseAttachment(e.dataTransfer.files[0] || null); }}><Upload size={26} /><strong>{attachment ? `${attachment.name} (${bytes(attachment.size)})` : 'Drag and drop a file here'}</strong><span>or click to browse · maximum 10 MB · empty files are rejected</span><input type="file" required onChange={(e) => { const file = e.target.files[0] || null; if (!chooseAttachment(file)) e.target.value = ''; }} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.zip" /></label>
          <label className="storage-checkbox"><input type="checkbox" checked={upload.approvalRequired} onChange={(e) => setUpload({ ...upload, approvalRequired: e.target.checked })} /><span>Requires Admin Approval</span></label>
        </div>
        <footer><button type="button" onClick={() => setUploadOpen(false)}>Cancel</button><button className="primary" disabled={saving} type="submit">{saving ? 'Uploading...' : 'Upload File'}</button></footer>
      </form></div>}

      {preview && <div className="storage-modal-backdrop"><section className="storage-preview"><header><div><h2>{preview.item.title}</h2><p>{preview.item.originalFileName}</p></div><button onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }}><X /></button></header>{preview.item.fileExtension === '.txt' ? <iframe src={preview.url} title={preview.item.title} /> : preview.item.mimeType.startsWith('image/') ? <img src={preview.url} alt={preview.item.title} /> : <iframe src={preview.url} title={preview.item.title} />}</section></div>}
    </PageLayout>
  );
}

export default FileStorage;
