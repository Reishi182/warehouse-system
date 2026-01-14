import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

ChartJS.register(ArcElement, Tooltip, Legend);

interface StockDistributionChartProps {
    data: Array<{ name: string; value: number }>;
}

export default function StockDistributionChart({ data }: StockDistributionChartProps) {
    const total = data.reduce((acc, d) => acc + d.value, 0);

    const chartData = {
        labels: data.map(d => d.name),
        datasets: [
            {
                data: data.map(d => d.value),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.85)',  // blue
                    'rgba(168, 85, 247, 0.85)',  // purple
                    'rgba(249, 115, 22, 0.85)',  // orange
                ],
                borderColor: [
                    'rgba(59, 130, 246, 1)',
                    'rgba(168, 85, 247, 1)',
                    'rgba(249, 115, 22, 1)',
                ],
                borderWidth: 2,
                cutout: '70%',
                spacing: 4,
                borderRadius: 8,
                hoverOffset: 8,
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
                displayColors: true,
                boxWidth: 12,
                boxHeight: 12,
                boxPadding: 4,
                callbacks: {
                    label: function (context: any) {
                        const value = context.raw || 0;
                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return ` ${value.toLocaleString('id-ID')} unit (${percentage}%)`;
                    }
                }
            },
        },
    };

    return (
        <Card className="rounded-2xl border-0 shadow-lg overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                        <PieChart className="w-4 h-4" />
                    </div>
                    Distribusi Stok per Lokasi
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="flex items-center gap-8">
                    {/* Chart */}
                    <div className="h-48 w-48 relative">
                        <Doughnut data={chartData} options={options} />
                        {/* Center text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-2xl font-bold">{total.toLocaleString('id-ID')}</p>
                            <p className="text-xs text-muted-foreground">Total Unit</p>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex-1 space-y-3">
                        {data.map((item, index) => {
                            const colors = ['bg-blue-500', 'bg-purple-500', 'bg-orange-500'];
                            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                            return (
                                <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${colors[index]}`} />
                                        <span className="font-medium text-sm">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-sm">{item.value.toLocaleString('id-ID')}</p>
                                        <p className="text-xs text-muted-foreground">{percentage}%</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
