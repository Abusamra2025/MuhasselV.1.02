// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  accentColor?: 'emerald' | 'blue' | 'amber' | 'rose' | 'indigo' | 'slate';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'emerald',
  onClick
}) => {
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-500/10 text-emerald-600',
      border: 'hover:border-emerald-300'
    },
    blue: {
      bg: 'bg-blue-500/10 text-blue-600',
      border: 'hover:border-blue-300'
    },
    amber: {
      bg: 'bg-amber-500/10 text-amber-600',
      border: 'hover:border-amber-300'
    },
    rose: {
      bg: 'bg-rose-500/10 text-rose-600',
      border: 'hover:border-rose-300'
    },
    indigo: {
      bg: 'bg-indigo-500/10 text-indigo-600',
      border: 'hover:border-indigo-300'
    },
    slate: {
      bg: 'bg-slate-500/10 text-slate-600',
      border: 'hover:border-slate-300'
    }
  };

  const selected = colorStyles[accentColor];

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md ' + selected.border : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${selected.bg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span
            className={`font-semibold ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.value}
          </span>
          {trend.label && <span className="text-slate-400">{trend.label}</span>}
        </div>
      )}
    </div>
  );
};
