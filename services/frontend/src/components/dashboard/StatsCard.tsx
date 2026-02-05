import { TrendingUp, TrendingDown } from 'lucide-react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  iconColor?: string;
  iconBg?: string;
}

export default function StatsCard({
  icon: Icon,
  label,
  value,
  change,
  changeLabel = 'vs last month',
  iconColor = 'text-primary-600',
  iconBg = 'bg-primary-50',
}: StatsCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between">
        <div
          className={clsx(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            iconBg
          )}
        >
          <Icon className={clsx('w-6 h-6', iconColor)} />
        </div>
        {change !== undefined && (
          <div
            className={clsx(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg',
              isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
        <p className="text-sm text-neutral-500 mt-0.5">{label}</p>
        {change !== undefined && (
          <p className="text-xs text-neutral-400 mt-1">{changeLabel}</p>
        )}
      </div>
    </div>
  );
}
