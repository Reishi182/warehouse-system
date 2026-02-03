import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { Sale } from '@/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface RevenueComparisonChartProps {
    sales: Sale[];
}

type PeriodType = 'daily' | 'weekly';

function toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function RevenueComparisonChart({ sales }: RevenueComparisonChartProps) {
    const [period, setPeriod] = useState<PeriodType>('daily');

    const chartData = useMemo(() => {
        const now = new Date();

        if (period === 'daily') {
            // Compare last 7 days vs previous 7 days
            const labels: string[] = [];
            const currentPeriod: number[] = [];
            const previousPeriod: number[] = [];

            for (let i = 6; i >= 0; i--) {
                const currentDate = new Date(now);
                currentDate.setDate(currentDate.getDate() - i);
                const currentDateStr = toISODate(currentDate);

                const previousDate = new Date(currentDate);
                previousDate.setDate(previousDate.getDate() - 7);
                const previousDateStr = toISODate(previousDate);

                const dayLabel = currentDate.toLocaleDateString('id-ID', {
                    weekday: 'short',
                    day: 'numeric'
                });

                labels.push(dayLabel);

                const currentRevenue = sales
                    .filter(s => s.created_at.slice(0, 10) === currentDateStr)
                    .reduce((acc, s) => acc + s.total_amount, 0);

                const previousRevenue = sales
                    .filter(s => s.created_at.slice(0, 10) === previousDateStr)
                    .reduce((acc, s) => acc + s.total_amount, 0);

                currentPeriod.push(currentRevenue);
                previousPeriod.push(previousRevenue);
            }

            const totalCurrent = currentPeriod.reduce((a, b) => a + b, 0);
            const totalPrevious = previousPeriod.reduce((a, b) => a + b, 0);
            const percentChange = totalPrevious > 0
                ? ((totalCurrent - totalPrevious) / totalPrevious * 100)
                : 0;

            return { labels, currentPeriod, previousPeriod, totalCurrent, totalPrevious, percentChange };
        } else {
            // Weekly comparison - 4 weeks
            const labels: string[] = [];
            const currentPeriod: number[] = [];
            const previousPeriod: number[] = [];

            for (let i = 3; i >= 0; i--) {
                const weekEnd = new Date(now);
                weekEnd.setDate(weekEnd.getDate() - (i * 7));
                const weekStart = new Date(weekEnd);
                weekStart.setDate(weekStart.getDate() - 6);

                const prevWeekEnd = new Date(weekStart);
                prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
                const prevWeekStart = new Date(prevWeekEnd);
                prevWeekStart.setDate(prevWeekStart.getDate() - 6);

                const weekLabel = `${weekStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
                labels.push(weekLabel);

                const currentRevenue = sales
                    .filter(s => {
                        const date = new Date(s.created_at);
                        return date >= weekStart && date <= weekEnd;
                    })
                    .reduce((acc, s) => acc + s.total_amount, 0);

                const previousRevenue = sales
                    .filter(s => {
                        const date = new Date(s.created_at);
                        return date >= prevWeekStart && date <= prevWeekEnd;
                    })
                    .reduce((acc, s) => acc + s.total_amount, 0);

                currentPeriod.push(currentRevenue);
                previousPeriod.push(previousRevenue);
            }

            const totalCurrent = currentPeriod.reduce((a, b) => a + b, 0);
            const totalPrevious = previousPeriod.reduce((a, b) => a + b, 0);
            const percentChange = totalPrevious > 0
                ? ((totalCurrent - totalPrevious) / totalPrevious * 100)
                : 0;

            return { labels, currentPeriod, previousPeriod, totalCurrent, totalPrevious, percentChange };
        }
    }, [sales, period]);

    const isPositive = chartData.percentChange >= 0;

    const barChartData = {
        labels: chartData.labels,
        datasets: [
            {
                label: period === 'daily' ? 'Minggu Ini' : 'Periode Ini',
                data: chartData.currentPeriod,
                backgroundColor: 'hsla(142, 76%, 36%, 0.8)',
                borderColor: 'hsl(142, 76%, 36%)',
                borderWidth: 0,
                borderRadius: 6,
                borderSkipped: false,
            },
            {
                label: period === 'daily' ? 'Minggu Lalu' : 'Periode Lalu',
                data: chartData.previousPeriod,
                backgroundColor: 'hsla(215, 20%, 65%, 0.5)',
                borderColor: 'hsl(215, 20%, 65%)',
                borderWidth: 0,
                borderRadius: 6,
                borderSkipped: false,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top' as const,
                align: 'end' as const,
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    boxWidth: 8,
                    padding: 16,
                    font: {
                        size: 12,
                    },
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                padding: 12,
                cornerRadius: 8,
                titleFont: {
                    size: 13,
                    weight: 'bold' as const,
                },
                bodyFont: {
                    size: 12,
                },
                callbacks: {
                    label: function (context: any) {
                        return `${context.dataset.label}: Rp ${context.raw.toLocaleString('id-ID')}`;
                    }
                }
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    font: {
                        size: 11,
                    },
                },
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                ticks: {
                    font: {
                        size: 11,
                    },
                    callback: function (value: any) {
                        if (value >= 1000000) {
                            return `${(value / 1000000).toFixed(1)}jt`;
                        }
                        return `${(value / 1000).toFixed(0)}rb`;
                    }
                },
            },
        },
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
    };

    return (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10">
                            <BarChart3 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-semibold">
                                Perbandingan Revenue
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {period === 'daily' ? 'Harian: minggu ini vs minggu lalu' : 'Mingguan: 4 minggu terakhir'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex rounded-lg bg-muted/50 p-1">
                            <Button
                                variant={period === 'daily' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setPeriod('daily')}
                                className="h-7 px-3 text-xs rounded-md"
                            >
                                Harian
                            </Button>
                            <Button
                                variant={period === 'weekly' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setPeriod('weekly')}
                                className="h-7 px-3 text-xs rounded-md"
                            >
                                Mingguan
                            </Button>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                        <p className="text-xs text-muted-foreground mb-1">
                            {period === 'daily' ? 'Minggu Ini' : 'Total'}
                        </p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            Rp {(chartData.totalCurrent / 1000000).toFixed(1)}jt
                        </p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">
                            {period === 'daily' ? 'Minggu Lalu' : 'Sebelumnya'}
                        </p>
                        <p className="text-lg font-bold text-muted-foreground">
                            Rp {(chartData.totalPrevious / 1000000).toFixed(1)}jt
                        </p>
                    </div>
                    <div className={`text-center p-3 rounded-xl ${isPositive
                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                        : 'bg-red-50 dark:bg-red-900/20'
                        }`}>
                        <p className="text-xs text-muted-foreground mb-1">Perubahan</p>
                        <p className={`text-lg font-bold flex items-center justify-center gap-1 ${isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-red-600 dark:text-red-400'
                            }`}>
                            {isPositive ? (
                                <TrendingUp className="w-4 h-4" />
                            ) : (
                                <TrendingDown className="w-4 h-4" />
                            )}
                            {Math.abs(chartData.percentChange).toFixed(1)}%
                        </p>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-[250px]">
                    <Bar data={barChartData} options={options} />
                </div>
            </CardContent>
        </Card>
    );
}
