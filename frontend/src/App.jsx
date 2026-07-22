import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import ContactMessages from './pages/ContactMessages';
import Applications from './pages/Applications';
import Reports from './pages/Reports';
import AdminUsers from './pages/AdminUsers';
import Programs from './pages/Programs';
import Login from './pages/Login';
import Payments from './pages/Payments';
import Classes from './pages/Classes';
import Discount from './pages/Discount';
import ActivityLog from './pages/ActivityLog';
import AdminReport from './pages/AdminReport';
import Settings from './pages/Settings';
import LandingPage from './pages/LandingPage';
import ApplyPage from './pages/ApplyPage';
import AdmissionRequirementsPage from './pages/AdmissionRequirementsPage';
import ProgramFeesPage from './pages/ProgramFeesPage';
import AdmissionsPage from './pages/AdmissionsPage';
import FileStorage from './pages/FileStorage';
import AdmissionPeriods from './pages/AdmissionPeriods';
import SmsNotifications from './pages/SmsNotifications';
import ScheduledMessages from './pages/ScheduledMessages';
import AdmissionChatbot from './components/AdmissionChatbot';

const AdminLayout = () => {
  const token = localStorage.getItem('authToken');
  const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
  const [navigationOpen, setNavigationOpen] = useState(false);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="admin-shell">
      <button className="admin-mobile-menu" onClick={() => setNavigationOpen(true)} aria-label="Open navigation"><Menu size={22} /><span>Admin Portal</span></button>
      {navigationOpen && <button className="admin-sidebar-overlay" aria-label="Close navigation" onClick={() => setNavigationOpen(false)} />}
      <Sidebar open={navigationOpen} onClose={() => setNavigationOpen(false)} />
      <main className="admin-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/students" element={<Students />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/discount" element={<Discount />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/contact-messages" element={<ContactMessages />} />
          <Route path="/file-storage" element={<FileStorage />} />
          <Route path="/admission-periods" element={currentUser.role === 'Admin' ? <AdmissionPeriods /> : <Navigate to="/dashboard" replace />} />
          <Route path="/sms-notifications" element={currentUser.role === 'Admin' ? <SmsNotifications /> : <Navigate to="/dashboard" replace />} />
          <Route path="/scheduled-messages" element={currentUser.role === 'Admin' ? <ScheduledMessages /> : <Navigate to="/dashboard" replace />} />
          <Route path="/activity-log" element={<ActivityLog />} />
          <Route path="/admin-users" element={<AdminUsers />} />
          <Route path="/admin-report" element={<AdminReport />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/admissions" element={<AdmissionsPage />} />
        <Route path="/admission-requirements" element={<AdmissionRequirementsPage />} />
        <Route path="/program-fees" element={<ProgramFeesPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/*" element={<AdminLayout />} />
        <Route path="/*" element={<AdminLayout />} />
      </Routes>
      <AdmissionChatbot />
    </Router>
  );
}

export default App;
