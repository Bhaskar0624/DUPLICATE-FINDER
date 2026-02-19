
import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { ScanResult } from '../types';
import { formatBytes } from '../utils/format';

interface VisualsProps {
  data: ScanResult;
}

// Neon Palette for Dark Mode
const COLORS = {
  rose: '#f43f5e',
  roseDim: 'rgba(244, 63, 94, 0.3)',
  mint: '#34d399',
  mintDim: 'rgba(52, 211, 153, 0.3)',
  blue: '#3b82f6',
  blueDim: 'rgba(59, 130, 246, 0.3)',
  amber: '#fb923c',
  amberDim: 'rgba(251, 146, 60, 0.3)',
  purple: '#a78bfa',
  purpleDim: 'rgba(167, 139, 250, 0.3)',
  slate: '#475569'
};

const Visuals: React.FC<VisualsProps> = ({ data }) => {

  // 1. Overall Usage (Pie)
  const usageData = useMemo(() => [
    { name: 'Unique Files', value: data.totalSize - data.wastedSpace, color: COLORS.blue },
    { name: 'Duplicate Waste', value: data.wastedSpace, color: COLORS.rose },
  ], [data]);

  // 2. File Type Breakdown (Bar)
  const typeData = useMemo(() => {
    const typeMap = new Map<string, number>();

    data.duplicates.forEach(group => {
      // Use the first file in the group as representative
      const file = group.files[0];
      // Extract extension if type is generic or empty
      let type = file.type;
      if (!type || type === '') {
        const parts = file.name.split('.');
        type = parts.length > 1 ? parts.pop()?.toUpperCase() || 'UNKNOWN' : 'UNKNOWN';
      } else {
        // Simplify MIME types
        if (type.includes('image')) type = 'Images';
        else if (type.includes('video')) type = 'Videos';
        else if (type.includes('audio')) type = 'Audio';
        else if (type.includes('text') || type.includes('pdf')) type = 'Docs';
        else type = 'Others';
      }

      const currentSize = typeMap.get(type) || 0;
      typeMap.set(type, currentSize + group.totalWastedSize);
    });

    return Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 types
  }, [data]);

  // 3. Top 5 Largest Scale (Bar)
  const topFilesData = useMemo(() => {
    return [...data.duplicates]
      .sort((a, b) => b.totalWastedSize - a.totalWastedSize)
      .slice(0, 5)
      .map(group => ({
        name: group.files[0].name.length > 15 ? group.files[0].name.substring(0, 15) + '...' : group.files[0].name,
        value: group.totalWastedSize,
        fullPath: group.files[0].webkitRelativePath
      }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-sm font-semibold text-white mb-1">{label || payload[0].name}</p>
          <p className="text-xs text-rose-300 font-mono">
            {formatBytes(payload[0].value)}
            <span className="text-slate-500 ml-2">
              ({((payload[0].value / data.wastedSpace) * 100).toFixed(1)}%)
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-white">Visual Breakdown</h3>
        <span className="text-xs text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/5">Interactive Charts</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-auto">

        {/* Chart 1: Wasted vs Unique */}
        <div className="relative bg-slate-800/40 rounded-xl p-4 border border-white/5 h-[250px] shadow-inner">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">Composition</h4>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={usageData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {usageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-slate-300 text-[10px] font-medium">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center Text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none mt-4">
            <div className="text-center">
              <span className="text-[10px] text-slate-500 block uppercase">Waste</span>
              <span className="text-xl font-bold text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]">
                {((data.wastedSpace / data.totalSize) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Chart 2: File Types */}
        <div className="bg-slate-800/40 rounded-xl p-4 border border-white/5 h-[250px] shadow-inner">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">Wasted by Type</h4>
          <div className="h-[85%] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} opacity={0.3} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  width={40}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={[COLORS.rose, COLORS.mint, COLORS.amber, COLORS.purple, COLORS.blue][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Top Offenders */}
        <div className="bg-slate-800/40 rounded-xl p-6 border border-white/5 h-[250px] shadow-inner md:col-span-2 lg:col-span-1">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 text-center">Largest Duplicates</h4>
          <div className="h-[85%] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topFilesData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.3} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {topFilesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={[COLORS.rose, COLORS.amber, COLORS.mint, COLORS.purple, COLORS.blue][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Visuals;
