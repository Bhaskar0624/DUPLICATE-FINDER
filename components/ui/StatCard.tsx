
import React from 'react';

import TiltCard from './TiltCard';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'amber';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, subValue, icon, color = 'blue' }) => {
  const glowColors: Record<string, string> = {
    blue: 'shadow-[0_0_20px_rgba(56,189,248,0.2)] border-sky-500/20 bg-sky-500/5',
    green: 'shadow-[0_0_20px_rgba(52,211,153,0.2)] border-emerald-500/20 bg-emerald-500/5',
    red: 'shadow-[0_0_20px_rgba(244,63,94,0.2)] border-rose-500/20 bg-rose-500/5',
    amber: 'shadow-[0_0_20px_rgba(251,146,60,0.2)] border-orange-500/20 bg-orange-500/5',
  };

  return (
    <TiltCard className={`rounded-2xl glass-card-soft ${glowColors[color]} h-full transform transition-all hover:scale-[1.02]`}>
      <div className="p-6 h-full flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">{label}</span>
          {icon && <div className="text-slate-500/80">{icon}</div>}
        </div>
        <div className="flex flex-col">
          <span className="text-3xl font-light text-slate-100 tracking-tight">{value}</span>
          {subValue && <span className="text-xs text-slate-500 mt-2 font-medium">{subValue}</span>}
        </div>
      </div>
    </TiltCard>
  );
};

export default StatCard;
