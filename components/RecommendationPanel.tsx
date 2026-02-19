
import React from 'react';
import { AIRecommendation } from '../types';

interface RecommendationPanelProps {
  recommendation: AIRecommendation | null;
  loading: boolean;
}

const RecommendationPanel: React.FC<RecommendationPanelProps> = ({ recommendation, loading }) => {
  if (loading) {
    return (
      <div className="glass-card-soft p-8 rounded-2xl animate-pulse">
        <div className="h-6 w-1/3 bg-white/10 rounded mb-6"></div>
        <div className="space-y-4">
          <div className="h-4 w-full bg-white/5 rounded"></div>
          <div className="h-4 w-full bg-white/5 rounded"></div>
        </div>
      </div>
    );
  }

  if (!recommendation) return null;

  const priorityStyles: Record<string, string> = {
    high: 'text-rose-300 border-rose-500/30 bg-rose-500/10',
    medium: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    low: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
  };

  return (
    <div className="glass-card-soft p-8 rounded-2xl relative overflow-hidden">
      {/* Decorative gradient blob */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
          <h3 className="text-xl font-light text-slate-100 flex items-center gap-3">
            <span className="w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_10px_rgba(129,140,248,0.5)]"></span>
            AI Insights
          </h3>
          <span className={`text-xs font-semibold uppercase px-3 py-1 rounded-full border ${priorityStyles[recommendation.priority]}`}>
            {recommendation.priority} Priority
          </span>
        </div>

        <p className="text-slate-300 mb-8 leading-relaxed font-light text-lg">
          {recommendation.summary}
        </p>

        <div className="bg-black/20 rounded-xl p-1">
          <ul className="space-y-1">
            {recommendation.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-4 text-sm text-slate-400 p-3 rounded-lg hover:bg-white/5 transition-colors">
                <span className="font-mono text-slate-600 mt-0.5">0{i + 1}</span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default RecommendationPanel;
