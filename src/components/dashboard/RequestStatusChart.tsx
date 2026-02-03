import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface RequestStatusChartProps {
    data: Array<{ name: string; count: number }>;
}

const statusColors = {
    Pending: { bg: 'rgba(251, 191, 36, 0.85)', border: 'rgba(251, 191, 36, 1)' },
    Disetujui: { bg: 'rgba(34, 197, 94, 0.85)', border: 'rgba(34, 197, 94, 1)' },
    Selesai: { bg: 'rgba(59, 130, 246, 0.85)', border: 'rgba(59, 130, 246, 1)' },
    Ditolak: { bg: 'rgba(239, 68, 68, 0.85)', border: 'rgba(239, 68, 68, 1)' },
};

export default function RequestStatusChart({ data }: RequestStatusChartProps) {
    const total = data.reduce((acc, d) => acc + d.count, 0);

    const chartData = {
        labels: data.map(d => d.name),
        datasets: [
            {
                label: 'Jumlah',
                data: data.map(d => d.count),
                backgroundColor: data.map(d => statusColors[d.name as keyof typeof statusColors]?.bg || 'rgba(156, 163, 175, 0.85)'),
                borderColor: data.map(d => statusColors[d.name as keyof typeof statusColors]?.border || 'rgba(156, 163, 175, 1)'),
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
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
                padding: 16,
                titleFont: {
                    size: 14,
                    weight: 'bold' as const,
                },
                bodyFont: {
                    size: 13,
                },
                cornerRadius: 12,
                callbacks: {
                    label: function (context: any) {
                        return ` ${context.raw} permintaan`;
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
                        size: 12,
                        weight: 500,
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
                    stepSize: 1,
                },
            },
        },
    };

    return (
        <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-emerald-500/5 to-cyan-500/5">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                            <BarChart3 className="w-4 h-4" />
                        </div>
                        Status Permintaan
                    </CardTitle>
                    <Badge variant="secondary" className="rounded-full">
                        {total} total
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="h-48">
                    <Bar data={chartData} options={options} />
                </div>

                {/* Quick stats below chart */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t">
                    {data.map((item) => {
                        const colors: Record<string, string> = {
                            Pending: 'text-amber-600',
                            Disetujui: 'text-green-600',
                            Selesai: 'text-blue-600',
                            Ditolak: 'text-red-600',
                        };
                        return (
                            <div key={item.name} className="text-center">
                                <p className={`text-xl font-bold ${colors[item.name] || 'text-gray-600'}`}>
                                    {item.count}
                                </p>
                                <p className="text-xs text-muted-foreground">{item.name}</p>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
