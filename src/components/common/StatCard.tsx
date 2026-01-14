import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: {
    value: number;
    label: string;
  };
  icon: LucideIcon;
  gradient?: 'blue' | 'purple' | 'orange' | 'green' | 'pink' | 'cyan';
}

const gradientClasses = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent',
    icon: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30',
    border: 'border-blue-500/20',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent',
    icon: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30',
    border: 'border-purple-500/20',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-500/10 via-orange-500/5 to-transparent',
    icon: 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/30',
    border: 'border-orange-500/20',
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent',
    icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30',
    border: 'border-emerald-500/20',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-500/10 via-pink-500/5 to-transparent',
    icon: 'bg-gradient-to-br from-pink-500 to-pink-600 text-white shadow-lg shadow-pink-500/30',
    border: 'border-pink-500/20',
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent',
    icon: 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30',
    border: 'border-cyan-500/20',
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  gradient = 'blue'
}: StatCardProps) {
  const isPositive = change && change.value >= 0;
  const colors = gradientClasses[gradient];

  return (
    <div className={cn(
      'relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]',
      colors.bg,
      colors.border,
      'bg-card'
    )}>
      {/* Decorative background circle */}
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br from-current/5 to-transparent opacity-50" />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground font-medium">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {change && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium mt-2',
              isPositive ? 'text-emerald-600' : 'text-red-500'
            )}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{isPositive ? '+' : ''}{change.value}%</span>
              <span className="text-muted-foreground font-normal">{change.label}</span>
            </div>
          )}
        </div>
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          colors.icon
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
