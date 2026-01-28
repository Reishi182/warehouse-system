import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnimatedKPICardProps {
    title: string;
    value: number;
    prefix?: string;
    suffix?: string;
    previousValue?: number;
    icon: React.ReactNode;
    trend?: 'up' | 'down' | 'stable';
    trendPercentage?: number;
    format?: 'number' | 'currency' | 'percentage';
    colorScheme?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
    loading?: boolean;
}

/**
 * Animated KPI Card with counting animation and trend indicator
 */
export function AnimatedKPICard({
    title,
    value,
    prefix = '',
    suffix = '',
    previousValue,
    icon,
    trend,
    trendPercentage,
    format = 'number',
    colorScheme = 'blue',
    loading = false,
}: AnimatedKPICardProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const previousValueRef = useRef(0);

    // Color schemes
    const colorClasses = {
        blue: {
            bg: 'from-blue-500/10 to-blue-600/5',
            icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
            accent: 'text-blue-600 dark:text-blue-400',
        },
        green: {
            bg: 'from-green-500/10 to-green-600/5',
            icon: 'bg-green-500/10 text-green-600 dark:text-green-400',
            accent: 'text-green-600 dark:text-green-400',
        },
        purple: {
            bg: 'from-purple-500/10 to-purple-600/5',
            icon: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
            accent: 'text-purple-600 dark:text-purple-400',
        },
        orange: {
            bg: 'from-orange-500/10 to-orange-600/5',
            icon: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
            accent: 'text-orange-600 dark:text-orange-400',
        },
        red: {
            bg: 'from-red-500/10 to-red-600/5',
            icon: 'bg-red-500/10 text-red-600 dark:text-red-400',
            accent: 'text-red-600 dark:text-red-400',
        },
    };

    const colors = colorClasses[colorScheme];

    // Animate counting effect
    useEffect(() => {
        if (loading) return;

        const startValue = previousValueRef.current;
        const endValue = value;
        const duration = 1000; // 1 second
        const startTime = performance.now();

        setIsAnimating(true);

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);

            const currentValue = startValue + (endValue - startValue) * easeOut;
            setDisplayValue(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsAnimating(false);
                previousValueRef.current = endValue;
            }
        };

        requestAnimationFrame(animate);
    }, [value, loading]);

    // Format the display value
    const formatValue = (val: number): string => {
        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(val);
            case 'percentage':
                return `${val.toFixed(1)}%`;
            default:
                return new Intl.NumberFormat('id-ID').format(Math.round(val));
        }
    };

    // Determine calculated trend if not provided
    const calculatedTrend = trend || (
        previousValue !== undefined
            ? value > previousValue ? 'up' : value < previousValue ? 'down' : 'stable'
            : 'stable'
    );

    const calculatedTrendPercentage = trendPercentage ?? (
        previousValue && previousValue !== 0
            ? Math.abs(((value - previousValue) / previousValue) * 100)
            : 0
    );

    const TrendIcon = calculatedTrend === 'up' ? TrendingUp : calculatedTrend === 'down' ? TrendingDown : Minus;

    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl p-5",
            "bg-gradient-to-br border border-border/50",
            "transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
            colors.bg
        )}>
            {/* Background decoration */}
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br from-white/5 to-transparent" />

            <div className="relative flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                        {title}
                    </p>

                    {loading ? (
                        <div className="h-8 w-32 bg-muted/50 rounded animate-pulse" />
                    ) : (
                        <div className="flex items-baseline gap-1">
                            {prefix && <span className="text-lg text-muted-foreground">{prefix}</span>}
                            <span className={cn(
                                "text-2xl sm:text-3xl font-bold tracking-tight transition-all",
                                isAnimating && "text-primary"
                            )}>
                                {format === 'currency' ? formatValue(displayValue) : `${Math.round(displayValue).toLocaleString('id-ID')}`}
                            </span>
                            {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
                        </div>
                    )}

                    {/* Trend indicator */}
                    {calculatedTrendPercentage > 0 && (
                        <div className={cn(
                            "flex items-center gap-1 mt-2 text-sm font-medium",
                            calculatedTrend === 'up' && "text-green-600 dark:text-green-400",
                            calculatedTrend === 'down' && "text-red-600 dark:text-red-400",
                            calculatedTrend === 'stable' && "text-muted-foreground"
                        )}>
                            <TrendIcon className="w-4 h-4" />
                            <span>{calculatedTrendPercentage.toFixed(1)}%</span>
                            <span className="text-muted-foreground font-normal">vs periode lalu</span>
                        </div>
                    )}
                </div>

                {/* Icon */}
                <div className={cn(
                    "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center",
                    colors.icon
                )}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

export default AnimatedKPICard;
