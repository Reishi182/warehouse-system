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
} from 'chart.js';
import { cn } from '@/lib/utils';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
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

// Labels for different time periods
const periodLabels: Record<TimePeriod, string[]> = {
    '1D': ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
    '1W': ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    '1M': ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
    '1Y': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
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

    // Transform data based on selected period
    const { displayData, displayLabels } = useMemo(() => {
        const yearLabels = labels || periodLabels['1Y'];

        switch (selectedPeriod) {
            case '1D': {
                // Simulate hourly data by taking last few data points or generating sample
                const hourlyData = data.length >= 7
                    ? data.slice(-7)
                    : [...Array(7)].map((_, i) => Math.round(data[data.length - 1] * (0.9 + Math.random() * 0.2)));
                return { displayData: hourlyData, displayLabels: periodLabels['1D'] };
            }
            case '1W': {
                // Simulate daily data for a week
                const weeklyData = data.length >= 7
                    ? data.slice(-7)
                    : [...Array(7)].map((_, i) => Math.round(data[data.length - 1] * (0.85 + Math.random() * 0.3)));
                return { displayData: weeklyData, displayLabels: periodLabels['1W'] };
            }
            case '1M': {
                // Monthly view - 4 weeks
                const monthlyData = data.length >= 4
                    ? data.slice(-4)
                    : [...Array(4)].map((_, i) => Math.round(data[data.length - 1] * (0.8 + Math.random() * 0.4)));
                return { displayData: monthlyData, displayLabels: periodLabels['1M'] };
            }
            case '1Y':
            default: {
                // Full year data
                return { displayData: data.slice(0, 12), displayLabels: yearLabels.slice(0, 12) };
            }
        }
    }, [data, labels, selectedPeriod]);

    const chartData = useMemo(() => ({
        labels: displayLabels,
        datasets: [
            {
                fill: true,
                data: displayData,
                borderColor: '#d6a63d', // Champagne gold
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
                    gradient.addColorStop(0, 'rgba(214, 166, 61, 0.3)');
                    gradient.addColorStop(1, 'rgba(214, 166, 61, 0)');
                    return gradient;
                },
                borderWidth: 3,
                tension: 0.4, // Smooth curves
                pointRadius: 0,
                pointHoverRadius: 6,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#d6a63d',
                pointBorderWidth: 3,
                pointHoverBackgroundColor: '#ffffff',
                pointHoverBorderColor: '#d6a63d',
                pointHoverBorderWidth: 3,
            },
        ],
    }), [displayData, displayLabels]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                titleFont: {
                    family: 'Manrope',
                    size: 12,
                    weight: 'bold' as const,
                },
                bodyFont: {
                    family: 'Manrope',
                    size: 14,
                    weight: 'bold' as const,
                },
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (context: any) => {
                        return `Rp ${context.parsed.y.toLocaleString('id-ID')}`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                border: {
                    display: false,
                },
                ticks: {
                    color: '#64748b',
                    font: {
                        family: 'Manrope',
                        size: 12,
                    },
                },
            },
            y: {
                grid: {
                    color: '#e2e8f0',
                    drawBorder: false,
                },
                border: {
                    display: false,
                    dash: [4, 4],
                },
                ticks: {
                    display: false,
                },
            },
        },
        interaction: {
            intersect: false,
            mode: 'index' as const,
        },
    }), []);

    const periods: TimePeriod[] = ['1D', '1W', '1M', '1Y'];

    return (
        <div className={cn("glass-card rounded-2xl p-6 flex flex-col", className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-foreground">{title}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-3xl font-bold text-primary tracking-tight">{value}</span>
                        {change !== undefined && (
                            <span className={cn(
                                "text-sm font-bold px-2 py-0.5 rounded border",
                                isPositive
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    : "bg-red-50 text-red-600 border-red-100"
                            )}>
                                {isPositive ? '+' : ''}{change}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Time Period Selector */}
                <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                    {periods.map((period) => (
                        <button
                            key={period}
                            onClick={() => setSelectedPeriod(period)}
                            className={cn(
                                "px-3 py-1 rounded text-xs font-medium transition-all",
                                selectedPeriod === period
                                    ? "bg-white text-foreground shadow-sm border border-slate-100"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {period}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 w-full min-h-[250px]">
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
}
