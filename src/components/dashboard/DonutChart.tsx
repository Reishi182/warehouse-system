import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { cn } from '@/lib/utils';

// Register Chart.js components
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
    // Calculate percentages
    const total = data.reduce((acc, item) => acc + item.value, 0);
    const percentages = data.map(item => ({
        ...item,
        percentage: total > 0 ? Math.round((item.value / total) * 100) : 0
    }));

    const chartData = useMemo(() => ({
        labels: data.map(d => d.label),
        datasets: [
            {
                data: data.map(d => d.value),
                backgroundColor: data.map(d => d.color),
                borderColor: '#ffffff',
                borderWidth: 3,
                hoverBorderColor: '#ffffff',
                hoverBorderWidth: 4,
                hoverOffset: 5,
            },
        ],
    }), [data]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
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
                displayColors: true,
                callbacks: {
                    label: (context: any) => {
                        const percentage = total > 0 ? Math.round((context.raw / total) * 100) : 0;
                        return ` ${context.label}: ${percentage}%`;
                    },
                },
            },
        },
    }), [total]);

    return (
        <div className={cn("glass-card rounded-2xl p-6 flex flex-col", className)}>
            {/* Header */}
            <h3 className="text-lg font-bold text-foreground mb-6">{title}</h3>

            {/* Donut Chart */}
            <div className="flex-1 flex items-center justify-center relative min-h-[200px]">
                <div className="relative w-48 h-48">
                    <Doughnut data={chartData} options={options} />

                    {/* Center Label */}
                    <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider mb-1">
                            {totalLabel}
                        </span>
                        <span className="text-2xl font-bold text-foreground">{totalValue}</span>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="mt-6 flex flex-col gap-3">
                {percentages.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full shadow-sm"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-sm text-muted-foreground">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold text-foreground">{item.percentage}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
