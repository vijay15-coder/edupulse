
import React from 'react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  CheckSquare,
  BarChart3,
  Settings,
  LogOut,
  GraduationCap,
  CreditCard,
  FileText,
  Megaphone,
  X,
  Target
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  role: UserRole;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  isHOD?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ role, activeTab, setActiveTab, onLogout, isOpen, onClose, isHOD = false }) => {
  const superAdminLinks = [
    { id: 'superadmin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'colleges', label: 'Colleges', icon: BookOpen },
    { id: 'superadmin-users', label: 'System Users', icon: Users },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'superadmin-settings', label: 'Settings', icon: Settings },
  ];

  const collegeAdminLinks = [
    { id: 'admin-dashboard', label: 'Admin Panel', icon: LayoutDashboard },
    { id: 'users', label: 'Faculty & Students', icon: Users },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'courses', label: 'Programs', icon: BookOpen },
    { id: 'fees', label: 'Financials', icon: CreditCard },
    { id: 'settings', label: 'Preferences', icon: Settings },
  ];

  const facultyLinks = [
    { id: 'dashboard', label: 'Classroom', icon: LayoutDashboard },
    { id: 'my-courses', label: 'My Courses', icon: BookOpen },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'marks', label: 'Grading', icon: BarChart3 },
    { id: 'timetable', label: 'Schedule', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const hodLinks = [
    { id: 'hod-dashboard', label: 'HOD Dashboard', icon: LayoutDashboard },
    { id: 'dashboard', label: 'Classroom', icon: BookOpen },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'marks', label: 'Grading', icon: BarChart3 },
    { id: 'timetable', label: 'Schedule', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const studentLinks = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'courses', label: 'Academic Catalog', icon: BookOpen },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'student-target-attendance', label: 'Target Attendance', icon: Target },
    { id: 'student-target-cgpa', label: 'Target CGPA', icon: BarChart3 },
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'timetable', label: 'Weekly Plan', icon: Calendar },
    { id: 'fees', label: 'Fee Portal', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const links = role === UserRole.SUPERADMIN ? superAdminLinks :
    role === UserRole.COLLEGE_ADMIN ? collegeAdminLinks :
      (role === UserRole.HOD || (role === UserRole.FACULTY && isHOD)) ? hodLinks :
        role === UserRole.FACULTY ? facultyLinks : studentLinks;

  return (
    <div className={`fixed lg:sticky top-0 left-0 w-72 h-screen glass-panel border-r border-white/40 flex flex-col z-40 transition-transform duration-500 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 shadow-2xl lg:shadow-none'}`}>
      <div className="p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-brand-500 to-brand-700 p-2.5 rounded-2xl shadow-lg shadow-brand-500/30 animate-float">
            <GraduationCap className="text-white w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-800">EduPulse</h1>
            <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest mt-1">Academy Pro</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 lg:hidden text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
      </div>

      <nav className="flex-1 px-6 py-4 space-y-2 overflow-y-auto scrollbar-hide">
        {links.map((link) => (
          <button
            key={link.id}
            onClick={() => setActiveTab(link.id)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group ${activeTab === link.id
              ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white font-bold shadow-xl shadow-brand-500/30 translate-x-1'
              : 'text-slate-500 hover:bg-white/60 hover:text-slate-900 hover:translate-x-1'
              }`}
          >
            <link.icon className={`w-5 h-5 transition-colors ${activeTab === link.id ? 'text-white' : 'text-slate-400 group-hover:text-brand-600'}`} />
            <span className="text-sm tracking-tight">{link.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-100/50 mx-4 mb-4">
        <button onClick={onLogout} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-rose-500 hover:bg-rose-50/50 transition-all font-bold group">
          <div className="p-2 bg-rose-50 group-hover:bg-rose-100 rounded-xl transition-colors"><LogOut className="w-5 h-5" /></div>
          <span className="text-sm">Log out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
