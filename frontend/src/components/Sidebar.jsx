import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UserPlus, Users, Briefcase, TrendingUp, BookOpen, MessageCircle, History, Users2, FileText, Settings, LogOut, GraduationCap, Percent, FolderArchive, CalendarCheck, X
} from 'lucide-react';
import Card from './Card';
import logo from '../images/logo.jpg';

const Sidebar = ({ open = false, onClose = () => {} }) => {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    navigate('/login');
  };
  return (
    <Card className={`sidebar-card ${open ? 'is-open' : ''}`}>
      <div className="sidebar-brand">
        <img src={logo} alt="Jamhuriya University logo" className="h-11 w-11 rounded-full object-contain" />
        <div className="flex flex-col">
          <h2 className="text-primary text-[15px] font-semibold leading-tight">Jamhuriya</h2>
          <p className="text-brand-green text-[9px] font-medium tracking-[0.3px]">ADMIN PORTAL</p>
        </div>
        <button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={20} /></button>
      </div>

      <div className="sidebar-navigation">
        <div className="flex flex-col gap-1">
          <p className="text-[#969696] text-[10px] font-semibold tracking-wider mb-2 px-2">OVERVIEW</p>
          <NavItem onClick={onClose} to="/dashboard" icon={LayoutDashboard}>Dashboard</NavItem>
          <NavItem onClick={onClose} to="/applications" icon={UserPlus}>Applications</NavItem>
          <NavItem onClick={onClose} to="/students" icon={Users}>Students</NavItem>
          <NavItem onClick={onClose} to="/classes" icon={GraduationCap}>Classes</NavItem>
          <NavItem onClick={onClose} to="/payments" icon={Briefcase}>Payments</NavItem>
          <NavItem onClick={onClose} to="/discount" icon={Percent}>Discount</NavItem>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[#969696] text-[10px] font-semibold tracking-wider mb-2 px-2">ANALYTICS</p>
          <NavItem onClick={onClose} to="/reports" icon={TrendingUp}>Reports</NavItem>
          <NavItem onClick={onClose} to="/programs" icon={BookOpen}>Programs</NavItem>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[#969696] text-[10px] font-semibold tracking-wider mb-2 px-2">OPERATIONS</p>
          <NavItem onClick={onClose} to="/contact-messages" icon={MessageCircle}>Contact Messages</NavItem>
          <NavItem onClick={onClose} to="/file-storage" icon={FolderArchive}>File Storage</NavItem>
          {currentUser.role === 'Admin' && <NavItem onClick={onClose} to="/admission-periods" icon={CalendarCheck}>Admission Periods</NavItem>}
          <NavItem onClick={onClose} to="/activity-log" icon={History}>Activity Log</NavItem>
          <NavItem onClick={onClose} to="/admin-users" icon={Users2}>Admin Users</NavItem>
          <NavItem onClick={onClose} to="/admin-report" icon={FileText}>Admin Report</NavItem>
          <NavItem onClick={onClose} to="/settings" icon={Settings}>Settings</NavItem>
        </div>
      </div>

      <div className="sidebar-profile">
        <div className="flex items-center gap-3">
          <div className="sidebar-avatar">{(currentUser.name || currentUser.username || 'A').slice(0, 2).toUpperCase()}</div>
          <div className="flex flex-col flex-1 min-w-0">
            <p className="text-text-dark text-[13px] font-semibold truncate">{currentUser.name || currentUser.email || 'Administrator'}</p>
            <p className="text-[#969696] text-[11px] truncate">{currentUser.role || 'Admin'}</p>
          </div>
          <button onClick={logout} aria-label="Sign out" className="text-[#969696] hover:text-primary transition-colors cursor-pointer">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
};

const NavItem = ({ to, icon: Icon, children, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-200 ${isActive
        ? 'bg-primary text-white'
        : 'text-text-dark hover:text-primary hover:bg-[#F5F5F5]'
      }`
    }
  >
    <Icon size={18} />
    <span>{children}</span>
  </NavLink>
);

export default Sidebar;
