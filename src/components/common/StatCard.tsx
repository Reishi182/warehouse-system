import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number; // Percentage change (optional)
  icon: LucideIcon;
  gradient?: 'blue' | 'purple' | 'orange' | 'green' | 'pink' | 'cyan' | 'emerald' | 'amber' | 'violet';
  animationDelay?: number;
}

const gradientStyles = {
  blue: {
    card: 'from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20',
    border: 'border-blue-200/60 dark:border-blue-800/40',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    iconColor: 'text-white',
    valueColor: 'text-blue-700 dark:text-blue-300',
    accentBar: 'bg-gradient-to-r from-blue-500 to-blue-400',
  },
  purple: {
    card: 'from-purple-50 to-purple-100/50 dark:from-purple-950/40 dark:to-purple-900/20',
    border: 'border-purple-200/60 dark:border-purple-800/40',
    iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    iconColor: 'text-white',
    valueColor: 'text-purple-700 dark:text-purple-300',
    accentBar: 'bg-gradient-to-r from-purple-500 to-purple-400',
  },
  orange: {
    card: 'from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/20',
    border: 'border-orange-200/60 dark:border-orange-800/40',
    iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    iconColor: 'text-white',
    valueColor: 'text-orange-700 dark:text-orange-300',
    accentBar: 'bg-gradient-to-r from-orange-500 to-orange-400',
  },
  green: {
    card: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20',
    border: 'border-emerald-200/60 dark:border-emerald-800/40',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    iconColor: 'text-white',
    valueColor: 'text-emerald-700 dark:text-emerald-300',
    accentBar: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
  },
  emerald: {
    card: 'from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20',
    border: 'border-emerald-200/60 dark:border-emerald-800/40',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    iconColor: 'text-white',
    valueColor: 'text-emerald-700 dark:text-emerald-300',
    accentBar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
  },
  pink: {
    card: 'from-pink-50 to-pink-100/50 dark:from-pink-950/40 dark:to-pink-900/20',
    border: 'border-pink-200/60 dark:border-pink-800/40',
    iconBg: 'bg-gradient-to-br from-pink-500 to-rose-600',
    iconColor: 'text-white',
    valueColor: 'text-pink-700 dark:text-pink-300',
    accentBar: 'bg-gradient-to-r from-pink-500 to-rose-400',
  },
  cyan: {
    card: 'from-cyan-50 to-cyan-100/50 dark:from-cyan-950/40 dark:to-cyan-900/20',
    border: 'border-cyan-200/60 dark:border-cyan-800/40',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
    iconColor: 'text-white',
    valueColor: 'text-cyan-700 dark:text-cyan-300',
    accentBar: 'bg-gradient-to-r from-cyan-500 to-cyan-400',
  },
  amber: {
    card: 'from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20',
    border: 'border-amber-200/60 dark:border-amber-800/40',
    iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    iconColor: 'text-white',
    valueColor: 'text-amber-700 dark:text-amber-300',
    accentBar: 'bg-gradient-to-r from-amber-500 to-amber-400',
  },
  violet: {
    card: 'from-violet-50 to-violet-100/50 dark:from-violet-950/40 dark:to-violet-900/20',
    border: 'border-violet-200/60 dark:border-violet-800/40',
    iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
    iconColor: 'text-white',
    valueColor: 'text-violet-700 dark:text-violet-300',
    accentBar: 'bg-gradient-to-r from-violet-500 to-violet-400',
  },
};

export default function StatCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  gradient = 'blue',
  animationDelay = 0
}: StatCardProps) {
  const styles = gradientStyles[gradient] || gradientStyles.blue;
  const hasChange = typeof change === 'number';
  const isPositive = hasChange && change >= 0;

  return (
    <Card
      className={cn(
        'relative overflow-hidden rounded-2xl',
        `bg-gradient-to-br ${styles.card}`,
        styles.border,
        'shadow-sm',
        'hover:shadow-xl hover:scale-[1.03] hover:-translate-y-1',
        'transition-all duration-300 ease-out',
        'animate-slide-up',
        'group cursor-default'
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Accent bar at top */}
      <div className={cn('absolute top-0 left-0 right-0 h-1 rounded-t-2xl', styles.accentBar)} />

      <CardContent className="p-5 pt-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            'p-2.5 rounded-xl shadow-lg',
            styles.iconBg,
            'group-hover:scale-110 transition-transform duration-300'
          )}>
            <Icon className={cn('w-5 h-5', styles.iconColor)} />
          </div>

          {hasChange ? (
            <Badge
              variant="secondary"
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold border-0',
                isPositive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
              )}
            >
              <span className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(change).toFixed(1)}%
              </span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="rounded-full text-xs bg-muted/50 border-0">
              Hari ini
            </Badge>
          )}
        </div>

        {/* Value */}
        <div className="space-y-1">
          <p className={cn('text-2xl xl:text-3xl font-bold tracking-tight', styles.valueColor)}>
            {value}
          </p>
          <p className="text-sm text-foreground/70 font-medium">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
