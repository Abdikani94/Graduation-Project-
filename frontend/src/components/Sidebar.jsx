import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity, BarChart3, BookOpen, Briefcase, CalendarCheck, ChevronDown,
  FolderArchive, GraduationCap, History, LayoutDashboard, LogOut, Menu, MenuSquare,
  MessageCircle, MessagesSquare, MessageSquareText,
  Percent, Settings, UserPlus, UserRoundSearch, Users, Users2, X,
} from 'lucide-react';
import Card from './Card';
import logo from '../images/logo.jpg';
import { canAccessModule } from '../utils/accessControl';

const storedGroups = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('adminSidebarGroups') || '{}');
    const active = ['overview', 'analytics', 'operations'].find((id) => saved[id]) || 'overview';
    return { overview: active === 'overview', analytics: active === 'analytics', operations: active === 'operations' };
  } catch {
    return { overview: true, analytics: true, operations: true };
  }
};

const Sidebar = ({ open = false, onClose = () => {} }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem('authUser') || '{}');
  const [groups, setGroups] = useState(storedGroups);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('adminSidebarCollapsed') === 'true');

  const sections = useMemo(() => [
    {
      id: 'overview', label: 'Overview', icon: MenuSquare,
      items: [
        ['/dashboard', LayoutDashboard, 'Dashboard'],
        ['/applications', UserPlus, 'Applications'],
        ['/students', Users, 'Students'],
        ...(canAccessModule(currentUser, 'studentSearch') ? [['/student-search', UserRoundSearch, 'Student Search']] : []),
        ['/classes', GraduationCap, 'Classes'],
        ['/payments', Briefcase, 'Payments'],
        ['/discount', Percent, 'Discount'],
      ],
    },
    {
      id: 'analytics', label: 'Analytics', icon: BarChart3,
      items: [['/reports', BarChart3, 'Reports'], ['/programs', BookOpen, 'Programs']],
    },
    {
      id: 'operations', label: 'Operations', icon: Activity,
      items: [
        ['/contact-messages', MessageCircle, 'Contact Messages'],
        ['/file-storage', FolderArchive, 'File Storage'],
        ...(canAccessModule(currentUser, 'admissionPeriods') ? [
          ['/admission-periods', CalendarCheck, 'Admission Periods'],
        ] : []),
        ...(canAccessModule(currentUser, 'smsNotifications') ? [
          ['/sms-notifications', MessageSquareText, 'SMS Notifications'],
        ] : []),
        ...(canAccessModule(currentUser, 'scheduledMessages') ? [
          ['/scheduled-messages', MessagesSquare, 'Scheduled Messages'],
        ] : []),
        ...(canAccessModule(currentUser, 'activityLog') ? [['/activity-log', History, 'Activity Log']] : []),
        ...(canAccessModule(currentUser, 'adminUsers') ? [['/admin-users', Users2, 'Admin Users']] : []),
        ...(canAccessModule(currentUser, 'adminReport') ? [['/admin-report', BarChart3, 'Admin Report']] : []),
        ...(canAccessModule(currentUser, 'settings') ? [['/settings', Settings, 'Settings']] : []),
      ],
    },
  ], [currentUser.role]);

  useEffect(() => localStorage.setItem('adminSidebarGroups', JSON.stringify(groups)), [groups]);
  useEffect(() => localStorage.setItem('adminSidebarCollapsed', String(collapsed)), [collapsed]);

  useEffect(() => {
    const activeSection = sections.find((section) => section.items.some(([to]) => location.pathname === to));
    if (!activeSection) return;
    setGroups({
      overview: activeSection.id === 'overview',
      analytics: activeSection.id === 'analytics',
      operations: activeSection.id === 'operations',
    });
  }, [location.pathname, sections]);

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    navigate('/login');
  };

  return (
    <Card className={`sidebar-card ${open ? 'is-open' : ''} ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-brand">
        <img src={logo} alt="Jamhuriya University logo" />
        <div className="sidebar-brand-copy"><h2>Jamhuriya</h2><p>Admin Portal</p></div>
        <button className="sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={19} /></button>
        <button className="sidebar-collapse-toggle" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Menu size={18} strokeWidth={2.1} />
        </button>
      </div>

      <nav className="sidebar-navigation" aria-label="Admin navigation">
        {sections.map((section) => {
          const GroupIcon = section.icon;
          const hasActiveItem = section.items.some(([to]) => location.pathname === to);
          const expanded = groups[section.id];
          return <section className={`sidebar-group ${expanded ? 'is-expanded' : ''} ${hasActiveItem ? 'has-active-item' : ''}`} key={section.id}>
            <button className="sidebar-group-toggle" onClick={() => setGroups((current) => ({
              overview: section.id === 'overview' ? !current.overview : false,
              analytics: section.id === 'analytics' ? !current.analytics : false,
              operations: section.id === 'operations' ? !current.operations : false,
            }))} aria-expanded={expanded} title={collapsed ? section.label : undefined}>
              <GroupIcon size={16} /><span>{section.label}</span><ChevronDown className="sidebar-group-chevron" size={15} />
            </button>
            {expanded && <div className="sidebar-group-items">
              {section.items.map(([to, Icon, label]) => <NavItem collapsed={collapsed} key={to} onClick={onClose} to={to} icon={Icon}>{label}</NavItem>)}
            </div>}
          </section>;
        })}
      </nav>

      <div className="sidebar-profile">
        <div className="sidebar-avatar">{(currentUser.name || currentUser.username || 'A').slice(0, 2).toUpperCase()}</div>
        <div className="sidebar-profile-copy"><p className="sidebar-profile-name">{currentUser.name || currentUser.email || 'Administrator'}</p><p className="sidebar-profile-role">{currentUser.role || 'Admin'}</p></div>
        <button onClick={logout} aria-label="Sign out" className="sidebar-logout-button" title="Sign out"><LogOut size={17} /></button>
      </div>
    </Card>
  );
};

const NavItem = ({ to, icon: Icon, children, onClick, collapsed }) => <NavLink to={to} onClick={onClick} title={collapsed ? children : undefined} className="sidebar-nav-link"><Icon size={18} /><span>{children}</span></NavLink>;

export default Sidebar;
