import { useMemo } from 'react';
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
import { Sale, Product } from '@/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface TopProductsChartProps {
    sales: Sale[];
    products: Product[];
    limit?: number;
}

const COLORS = [
    'hsl(221.2, 83.2%, 53.3%)', // primary
    'hsl(262.1, 83.3%, 57.8%)', // accent
    'hsl(142.1, 76.2%, 36.3%)', // green
    'hsl(38.3, 92%, 50.2%)',    // orange
    'hsl(280, 67%, 53%)',       // purple
];

export default function TopProductsChart({ sales, products, limit = 5 }: TopProductsChartProps) {
    const chartData = useMemo(() => {
        const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();

        sales.forEach(sale => {
            sale.items?.forEach(item => {
                const existing = productSales.get(item.product_id);
                if (existing) {
                    existing.quantity += item.quantity;
                    existing.revenue += item.subtotal;
                } else {
                    productSales.set(item.product_id, {
                        name: item.product_name,
                        quantity: item.quantity,
                        revenue: item.subtotal,
                    });
                }
            });
        });

        return Array.from(productSales.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, limit)
            .map((item, index) => ({
                ...item,
                shortName: item.name.length > 12 ? item.name.slice(0, 12) + '...' : item.name,
                color: COLORS[index % COLORS.length],
            }));
    }, [sales, limit]);

    if (chartData.length === 0) {
        return (
            <Card className="animate-slide-up">
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Produk Terlaris</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                        Belum ada data penjualan
                    </div>
                </CardContent>
            </Card>
        );
    }

    const barChartData = {
        labels: chartData.map(d => d.shortName),
        datasets: [
            {
                label: 'Terjual',
                data: chartData.map(d => d.quantity),
                backgroundColor: chartData.map(d => d.color),
                borderRadius: 6,
                borderSkipped: false,
            },
        ],
    };

    const options = {
        indexAxis: 'y' as const,
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
                    title: function (context: any) {
                        const index = context[0].dataIndex;
                        return chartData[index].name;
                    },
                    label: function (context: any) {
                        const index = context.dataIndex;
                        const item = chartData[index];
                        return `${item.quantity} unit (Rp ${item.revenue.toLocaleString('id-ID')})`;
                    }
                }
            },
        },
        scales: {
            x: {
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
            y: {
                grid: {
                    display: false,
                },
                ticks: {
                    font: {
                        size: 11,
                    },
                },
            },
        },
    };

    return (
        <Card className="animate-slide-up">
            <CardHeader>
                <CardTitle className="text-base font-semibold">Top {limit} Produk Terlaris</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px]">
                    <Bar data={barChartData} options={options} />
                </div>
            </CardContent>
        </Card>
    );
}
