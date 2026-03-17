
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, color, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all ${onClick ? 'cursor-pointer hover:border-indigo-200' : ''}`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-slate-500 mb-1 truncate">{title}</p>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{value}</h3>
          {trend && (
            <p className={`text-xs mt-2 font-medium whitespace-nowrap ${trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${color} shrink-0`}>
          <Icon className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
