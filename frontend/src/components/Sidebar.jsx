import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UserPlus, Users, Briefcase, TrendingUp, BookOpen, MessageCircle, History, Users2, FileText, Settings, LogOut, GraduationCap, Percent
} from 'lucide-react';
import Card from './Card';
import logo from '../images/logo.jpg';

const Sidebar = () => {
  const navigate = useNavigate();
  return (
    <Card className="sidebar-card w-[220px] h-full flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center gap-3 p-5 border-b border-border-color">
        <img src={logo} alt="Jamhuriya University logo" className="h-11 w-11 rounded-full object-contain" />
        <div className="flex flex-col">
          <h2 className="text-primary text-[15px] font-semibold leading-tight">Jamhuriya</h2>
          <p className="text-brand-green text-[9px] font-medium tracking-[0.3px]">ADMIN PORTAL</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="text-[#969696] text-[10px] font-semibold tracking-wider mb-2 px-2">OVERVIEW</p>
          <NavItem to="/dashboard" icon={LayoutDashboard}>Dashboard</NavItem>
          <NavItem to="/applications" icon={UserPlus}>Applications</NavItem>
          <NavItem to="/students" icon={Users}>Students</NavItem>
          <NavItem to="/classes" icon={GraduationCap}>Classes</NavItem>
          <NavItem to="/payments" icon={Briefcase}>Payments</NavItem>
          <NavItem to="/discount" icon={Percent}>Discount</NavItem>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[#969696] text-[10px] font-semibold tracking-wider mb-2 px-2">ANALYTICS</p>
          <NavItem to="/reports" icon={TrendingUp}>Reports</NavItem>
          <NavItem to="/programs" icon={BookOpen}>Programs</NavItem>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[#969696] text-[10px] font-semibold tracking-wider mb-2 px-2">OPERATIONS</p>
          <NavItem to="/contact-messages" icon={MessageCircle}>Contact Messages</NavItem>
          <NavItem to="/activity-log" icon={History}>Activity Log</NavItem>
          <NavItem to="/admin-users" icon={Users2}>Admin Users</NavItem>
          <NavItem to="/admin-report" icon={FileText}>Admin Report</NavItem>
          <NavItem to="/settings" icon={Settings}>Settings</NavItem>
        </div>
      </div>

      <div className="p-4 border-t border-border-color mt-auto">
        <div className="flex items-center gap-3 p-2">
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
            <img src="https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" alt="User" className="w-full h-full object-cover grayscale" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <p className="text-text-dark text-[13px] font-medium truncate">saidomar@gmail.com</p>
            <p className="text-[#969696] text-[11px] truncate">Administrator</p>
          </div>
          <button onClick={() => navigate('/login')} className="text-[#969696] hover:text-primary transition-colors cursor-pointer">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
};

const NavItem = ({ to, icon: Icon, children }) => (
  <NavLink
    to={to}
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
