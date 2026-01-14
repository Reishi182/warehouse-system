import { useMemo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sale } from '@/types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

interface SalesTrendChartProps {
    sales: Sale[];
    days?: number;
}

function toISODate(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default function SalesTrendChart({ sales, days = 7 }: SalesTrendChartProps) {
    const chartData = useMemo(() => {
        const now = new Date();
        const data: { date: string; label: string; amount: number }[] = [];

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const isoDate = toISODate(d);
            const dayLabel = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });

            const dayTotal = sales
                .filter(s => s.created_at.slice(0, 10) === isoDate)
                .reduce((acc, s) => acc + s.total_amount, 0);

            data.push({
                date: isoDate,
                label: dayLabel,
                amount: dayTotal,
            });
        }

        return data;
    }, [sales, days]);

    const todayTotal = chartData[chartData.length - 1]?.amount || 0;
    const yesterdayTotal = chartData[chartData.length - 2]?.amount || 0;
    const percentChange = yesterdayTotal > 0
        ? ((todayTotal - yesterdayTotal) / yesterdayTotal * 100).toFixed(1)
        : 0;
    const isUp = todayTotal >= yesterdayTotal;

    const lineChartData = {
        labels: chartData.map(d => d.label),
        datasets: [
            {
                label: 'Penjualan',
                data: chartData.map(d => d.amount),
                borderColor: 'hsl(221.2, 83.2%, 53.3%)',
                backgroundColor: 'hsla(221.2, 83.2%, 53.3%, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: 'hsl(221.2, 83.2%, 53.3%)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: function (context: any) {
                        return `Rp ${context.raw.toLocaleString('id-ID')}`;
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
                        return `${(value / 1000).toFixed(0)}k`;
                    }
                },
            },
        },
    };

    return (
        <Card className="animate-slide-up">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">Tren Penjualan ({days} Hari)</CardTitle>
                    <div className={`flex items-center gap-1 text-sm ${isUp ? 'text-green-600' : 'text-red-600'}`}>
                        {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>{percentChange}%</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[200px]">
                    <Line data={lineChartData} options={options} />
                </div>
                <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">Hari Ini</p>
                    <p className="text-2xl font-bold">Rp {todayTotal.toLocaleString('id-ID')}</p>
                </div>
            </CardContent>
        </Card>
    );
}
