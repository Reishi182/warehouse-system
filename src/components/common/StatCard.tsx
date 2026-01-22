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
    card: 'from-blue-500/20 via-blue-500/10 to-transparent',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    valueColor: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    card: 'from-purple-500/20 via-purple-500/10 to-transparent',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-600 dark:text-purple-400',
    valueColor: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    card: 'from-orange-500/20 via-orange-500/10 to-transparent',
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    valueColor: 'text-orange-600 dark:text-orange-400',
  },
  green: {
    card: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
  },
  emerald: {
    card: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    valueColor: 'text-emerald-600 dark:text-emerald-400',
  },
  pink: {
    card: 'from-pink-500/20 via-pink-500/10 to-transparent',
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-600 dark:text-pink-400',
    valueColor: 'text-pink-600 dark:text-pink-400',
  },
  cyan: {
    card: 'from-cyan-500/20 via-cyan-500/10 to-transparent',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    valueColor: 'text-cyan-600 dark:text-cyan-400',
  },
  amber: {
    card: 'from-amber-500/20 via-amber-500/10 to-transparent',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    valueColor: 'text-amber-600 dark:text-amber-400',
  },
  violet: {
    card: 'from-violet-500/20 via-violet-500/10 to-transparent',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-600 dark:text-violet-400',
    valueColor: 'text-violet-600 dark:text-violet-400',
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
        'relative overflow-hidden border-0 shadow-lg',
        `bg-gradient-to-br ${styles.card}`,
        'backdrop-blur-xl',
        'hover:shadow-xl hover:scale-[1.02]',
        'transition-all duration-300 ease-out',
        'animate-slide-up'
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Decorative glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-2xl" />

      <CardContent className="p-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className={cn('p-2.5 rounded-xl backdrop-blur-sm', styles.iconBg)}>
            <Icon className={cn('w-5 h-5', styles.iconColor)} />
          </div>

          {hasChange ? (
            <Badge
              variant="secondary"
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold',
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
            <Badge variant="secondary" className="rounded-full text-xs bg-muted/50">
              Hari ini
            </Badge>
          )}
        </div>

        {/* Value */}
        <div className="space-y-1">
          <p className={cn('text-2xl xl:text-3xl font-bold tracking-tight', styles.valueColor)}>
            {value}
          </p>
          <p className="text-sm text-muted-foreground font-medium">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground/70">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
