
import React from 'react';
import { Bell, Search, User, Menu } from 'lucide-react';
import { User as UserType } from '../types';

interface DashboardHeaderProps {
  user: UserType | null;
  notificationsCount: number;
  onMenuToggle: () => void;
  onNotificationsClick: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user, notificationsCount, onMenuToggle, onNotificationsClick }) => {
  return (
    <header className="h-20 glass-panel border-b border-white/40 fixed top-0 right-0 left-0 lg:left-[calc(18rem+1px)] z-30 px-4 md:px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuToggle}
          className="p-2 lg:hidden text-slate-500 hover:bg-white/60 rounded-xl transition-colors backdrop-blur-sm shadow-sm border border-slate-200/50"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="hidden md:flex items-center gap-4 bg-white/50 backdrop-blur-sm border border-slate-200/50 px-5 py-2.5 rounded-2xl max-w-sm w-full focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:border-brand-500/50 transition-all group shadow-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0 group-focus-within:text-brand-500 transition-colors" />
          <input
            type="text"
            placeholder="Search students, courses..."
            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-6">
        <button className="md:hidden p-2 text-slate-400 hover:text-brand-600 transition-colors">
          <Search className="w-6 h-6" />
        </button>

        <button
          onClick={onNotificationsClick}
          className="relative p-2.5 text-slate-400 hover:text-brand-600 hover:bg-white/60 rounded-xl transition-all"
        >
          <Bell className="w-6 h-6" />
          {notificationsCount > 0 && (
            <span className="absolute top-2 right-2 w-4.5 h-4.5 bg-gradient-to-br from-rose-500 to-rose-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-lg shadow-rose-500/20">
              {notificationsCount}
            </span>
          )}
        </button>

        <div className="h-8 w-[1px] bg-slate-200/50"></div>

        <div className="flex items-center gap-3 pl-2">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-slate-900 leading-none tracking-tight">{user?.name}</p>
            <p className="text-[10px] font-bold text-brand-600 mt-1.5 uppercase tracking-wider">{user?.role.replace('_', ' ')}</p>
          </div>
          <div className="relative group p-0.5 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 shadow-lg shadow-brand-500/20 animate-float" style={{ animationDuration: '4s' }}>
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-white object-cover shrink-0 cursor-pointer group-hover:scale-105 transition-transform"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
