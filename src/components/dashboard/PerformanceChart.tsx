import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
    BarElement,
} from 'chart.js';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Filler,
    Legend
);

type TimePeriod = '1D' | '1W' | '1M' | '1Y';

interface PerformanceChartProps {
    title: string;
    value: string;
    change?: number;
    data: number[];
    labels?: string[];
    className?: string;
}

const periodLabels: Record<TimePeriod, string[]> = {
    '1D': ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    '1W': ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    '1M': ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
    '1Y': ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
};

// Accent palette: indigo → violet → purple
const ACCENT = {
    line: '#818cf8',       // indigo-400
    glow: 'rgba(99,102,241,0.6)',
    gradTop: 'rgba(99,102,241,0.35)',
    gradBot: 'rgba(99,102,241,0.0)',
    positive: '#34d399',   // emerald-400
    negative: '#f87171',   // red-400
    gridLine: 'rgba(255,255,255,0.06)',
    tick: 'rgba(255,255,255,0.35)',
    bar: 'rgba(99,102,241,0.18)',
};

export function PerformanceChart({
    title,
    value,
    change,
    data,
    labels,
    className
}: PerformanceChartProps) {
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');
    const isPositive = change !== undefined && change >= 0;
    const isZero = change === 0;

    const { displayData, displayLabels } = useMemo(() => {
        const yearLabels = labels || periodLabels['1Y'];
        const currentMonth = new Date().getMonth();

        switch (selectedPeriod) {
            case '1D': {
                const todayBase = data[currentMonth] || data[data.length - 1] || 0;
                const hourlyData = periodLabels['1D'].map((_, i) => {
                    const hourFactor = 1 - Math.abs(i - 3) / 4;
                    return Math.round(todayBase * hourFactor * 0.3);
                });
                return { displayData: hourlyData, displayLabels: periodLabels['1D'] };
            }
            case '1W': {
                const weekBase = data[currentMonth] || data[data.length - 1] || 0;
                const dailyAvg = weekBase / 30;
                const weeklyData = periodLabels['1W'].map((_, i) => {
                    const dayFactor = 0.8 + (i < 5 ? 0.3 : 0.1);
                    return Math.round(dailyAvg * dayFactor * 7);
                });
                return { displayData: weeklyData, displayLabels: periodLabels['1W'] };
            }
            case '1M': {
                const monthTotal = data[currentMonth] || data[data.length - 1] || 0;
                const weeklyAvg = monthTotal / 4;
                const monthlyData = periodLabels['1M'].map((_, i) => {
                    const weekFactor = 0.7 + (i * 0.12);
                    return Math.round(weeklyAvg * weekFactor);
                });
                return { displayData: monthlyData, displayLabels: periodLabels['1M'] };
            }
            case '1Y':
            default:
                return { displayData: data.slice(0, 12), displayLabels: yearLabels.slice(0, 12) };
        }
    }, [data, labels, selectedPeriod]);

    const maxVal = Math.max(...displayData, 1);

    const chartData = useMemo(() => ({
        labels: displayLabels,
        datasets: [
            {
                type: 'line' as const,
                fill: true,
                data: displayData,
                borderColor: ACCENT.line,
                borderWidth: 2.5,
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const chartArea = context.chart.chartArea;
                    if (!chartArea) return ACCENT.gradTop;
                    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                    gradient.addColorStop(0, ACCENT.gradTop);
                    gradient.addColorStop(1, ACCENT.gradBot);
                    return gradient;
                },
                tension: 0.45,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#ffffff',
                pointHoverBorderColor: ACCENT.line,
                pointHoverBorderWidth: 2.5,
            },
        ],
    }), [displayData, displayLabels]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeInOutQuart' as const },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(15,23,42,0.95)',
                titleColor: 'rgba(255,255,255,0.6)',
                bodyColor: '#ffffff',
                borderColor: 'rgba(99,102,241,0.5)',
                borderWidth: 1,
                titleFont: { size: 11, weight: 'normal' as const },
                bodyFont: { size: 14, weight: 'bold' as const },
                padding: { x: 14, y: 10 },
                cornerRadius: 10,
                displayColors: false,
                caretSize: 5,
                callbacks: {
                    label: (ctx: any) => {
                        const v = ctx.parsed.y;
                        if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}Jt`;
                        if (v >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}Rb`;
                        return `Rp ${v.toLocaleString('id-ID')}`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: {
                    color: ACCENT.tick,
                    font: { size: 11 },
                    maxRotation: 0,
                },
            },
            y: {
                display: false,
                grid: { color: ACCENT.gridLine },
                border: { display: false },
            },
        },
        interaction: { intersect: false, mode: 'index' as const },
    }), []);

    const periods: TimePeriod[] = ['1D', '1W', '1M', '1Y'];

    // Mini bar sparklines for the side
    const topBars = useMemo(() => {
        const sorted = [...displayData].map((v, i) => ({ v, label: displayLabels[i] }));
        return sorted.slice(-4);
    }, [displayData, displayLabels]);

    return (
        <div className={cn(
            "relative rounded-2xl overflow-hidden flex flex-col",
            "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",
            "border border-white/8 shadow-2xl",
            className
        )}>
            {/* Decorative blobs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-indigo-600/20 blur-3xl" />
                <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full bg-violet-600/15 blur-3xl" />
            </div>

            <div className="relative z-10 p-5 sm:p-6 flex flex-col gap-4 h-full">
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">
                            {title}
                        </p>
                        <div className="flex items-baseline gap-2.5">
                            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-none">
                                {value}
                            </span>
                            {change !== undefined && (
                                <span className={cn(
                                    "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full",
                                    isZero
                                        ? "bg-white/10 text-white/50"
                                        : isPositive
                                        ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30"
                                        : "bg-red-500/20 text-red-400 ring-1 ring-red-500/30"
                                )}>
                                    {isZero
                                        ? <Minus className="w-3 h-3" />
                                        : isPositive
                                        ? <TrendingUp className="w-3 h-3" />
                                        : <TrendingDown className="w-3 h-3" />
                                    }
                                    {isPositive && !isZero ? '+' : ''}{change}%
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-white/30 mt-1">vs bulan lalu</p>
                    </div>

                    {/* Period selector */}
                    <div className="flex bg-white/5 rounded-xl p-1 gap-0.5 border border-white/8 shrink-0">
                        {periods.map((period) => (
                            <button
                                key={period}
                                onClick={() => setSelectedPeriod(period)}
                                className={cn(
                                    "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200",
                                    selectedPeriod === period
                                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                                        : "text-white/40 hover:text-white/70 hover:bg-white/5"
                                )}
                            >
                                {period}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mini bar indicators */}
                <div className="flex items-end gap-2">
                    {topBars.map((bar, i) => {
                        const pct = maxVal > 0 ? (bar.v / maxVal) * 100 : 0;
                        return (
                            <div key={i} className="flex flex-col items-center gap-1 flex-1">
                                <div className="w-full rounded-sm overflow-hidden bg-white/5" style={{ height: 28 }}>
                                    <div
                                        className="w-full rounded-sm bg-indigo-500/40 transition-all duration-500"
                                        style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                                    />
                                </div>
                                <span className="text-[10px] text-white/25 truncate w-full text-center">
                                    {bar.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Divider */}
                <div className="h-px bg-white/6" />

                {/* Chart */}
                <div className="flex-1 w-full overflow-x-auto -mx-1">
                    <div className="min-w-[300px] sm:min-w-0 h-[180px] sm:h-[200px] px-1">
                        <Line data={chartData} options={options} />
                    </div>
                </div>

                {/* Bottom glow line */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
            </div>
        </div>
    );
}
