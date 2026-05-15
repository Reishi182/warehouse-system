import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { cn } from '@/lib/utils';

ChartJS.register(ArcElement, Tooltip, Legend);

interface DonutChartItem {
    label: string;
    value: number;
    color: string;
}

interface DonutChartProps {
    title: string;
    totalLabel?: string;
    totalValue: string;
    data: DonutChartItem[];
    className?: string;
}

export function DonutChart({
    title,
    totalLabel = 'Total',
    totalValue,
    data,
    className
}: DonutChartProps) {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    const percentages = data.map(item => ({
        ...item,
        percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));

    const chartData = useMemo(() => ({
        labels: data.map(d => d.label),
        datasets: [
            {
                data: data.map(d => d.value),
                backgroundColor: data.map(d => d.color),
                borderColor: 'transparent',
                borderWidth: 0,
                hoverBorderColor: 'rgba(255,255,255,0.2)',
                hoverBorderWidth: 3,
                hoverOffset: 6,
            },
        ],
    }), [data]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        cutout: '74%',
        animation: { duration: 700, easing: 'easeInOutQuart' as const },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15,23,42,0.95)',
                titleColor: 'rgba(255,255,255,0.5)',
                bodyColor: '#ffffff',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: { x: 14, y: 10 },
                cornerRadius: 10,
                displayColors: true,
                boxWidth: 8,
                boxHeight: 8,
                boxPadding: 4,
                callbacks: {
                    label: (ctx: any) => {
                        const pct = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
                        return `  ${ctx.label}: ${pct}% (${ctx.raw})`;
                    },
                },
            },
        },
    }), [total]);

    // pick max item for highlight
    const maxItem = percentages.reduce(
        (m, item) => item.value > m.value ? item : m,
        percentages[0] ?? { label: '', value: 0, percentage: 0, color: '#6366f1' }
    );

    return (
        <div className={cn(
            "relative rounded-2xl overflow-hidden flex flex-col",
            "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
            "border border-white/8 shadow-2xl",
            "p-5 sm:p-6",
            className
        )}>
            {/* Background blob */}
            <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl opacity-20"
                style={{ backgroundColor: maxItem?.color ?? '#6366f1' }} />

            {/* Title */}
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-5">
                {title}
            </p>

            {/* Chart + legend row */}
            <div className="flex items-center gap-5 flex-1">
                {/* Donut */}
                <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
                    <Doughnut data={chartData} options={options} />
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                            {totalLabel}
                        </span>
                        <span className="text-xl font-extrabold text-white leading-tight">
                            {totalValue}
                        </span>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex flex-col gap-2.5 flex-1 min-w-0">
                    {percentages.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2.5">
                            {/* Color dot + progress bar */}
                            <div
                                className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/10"
                                style={{ backgroundColor: item.color }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-[11px] font-medium text-white/60 truncate">
                                        {item.label}
                                    </span>
                                    <span className="text-[11px] font-bold text-white ml-2 shrink-0">
                                        {item.percentage}%
                                    </span>
                                </div>
                                <div className="h-1 w-full rounded-full bg-white/8 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${item.percentage}%`,
                                            backgroundColor: item.color,
                                            opacity: 0.85,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom accent */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
    );
}
