import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, CreditCard, Wallet } from 'lucide-react';
import { Sale } from '@/types';

ChartJS.register(ArcElement, Tooltip, Legend);

interface RevenueByPaymentChartProps {
    sales: Sale[];
    days?: number;
}

export default function RevenueByPaymentChart({ sales, days = 30 }: RevenueByPaymentChartProps) {
    const data = useMemo(() => {
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - days);

        const filteredSales = sales.filter(s => new Date(s.created_at) >= startDate);

        const cashSales = filteredSales.filter(s => s.payment_method === 'cash');
        const transferSales = filteredSales.filter(s => s.payment_method === 'transfer');

        const cashAmount = cashSales.reduce((acc, s) => acc + s.total_amount, 0);
        const transferAmount = transferSales.reduce((acc, s) => acc + s.total_amount, 0);
        const totalAmount = cashAmount + transferAmount;

        const cashPercent = totalAmount > 0 ? (cashAmount / totalAmount * 100) : 0;
        const transferPercent = totalAmount > 0 ? (transferAmount / totalAmount * 100) : 0;

        return {
            cashAmount,
            transferAmount,
            totalAmount,
            cashPercent,
            transferPercent,
            cashCount: cashSales.length,
            transferCount: transferSales.length,
        };
    }, [sales, days]);

    const doughnutData = {
        labels: ['Cash', 'Transfer'],
        datasets: [
            {
                data: [data.cashAmount, data.transferAmount],
                backgroundColor: [
                    'hsla(152, 69%, 31%, 0.85)',
                    'hsla(217, 91%, 60%, 0.85)',
                ],
                borderColor: [
                    'hsl(152, 69%, 31%)',
                    'hsl(217, 91%, 60%)',
                ],
                borderWidth: 0,
                hoverOffset: 8,
                cutout: '70%',
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
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                padding: 12,
                cornerRadius: 8,
                callbacks: {
                    label: function (context: any) {
                        const percent = context.raw / data.totalAmount * 100;
                        return `${context.label}: Rp ${context.raw.toLocaleString('id-ID')} (${percent.toFixed(1)}%)`;
                    }
                }
            },
        },
    };

    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `${(value / 1000000).toFixed(1)}jt`;
        } else if (value >= 1000) {
            return `${(value / 1000).toFixed(0)}rb`;
        }
        return value.toLocaleString('id-ID');
    };

    return (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-500/10">
                        <Wallet className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold">
                            Revenue by Payment
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {days} hari terakhir
                        </p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Doughnut Chart */}
                    <div className="relative w-40 h-40 flex-shrink-0">
                        <Doughnut data={doughnutData} options={options} />
                        {/* Center text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-lg font-bold">
                                Rp {formatCurrency(data.totalAmount)}
                            </p>
                        </div>
                    </div>

                    {/* Legend Cards */}
                    <div className="flex-1 w-full space-y-3">
                        {/* Cash */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50">
                            <div className="p-2 rounded-lg bg-emerald-500/20">
                                <Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Cash</span>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        {data.cashPercent.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-muted-foreground">
                                        {data.cashCount} transaksi
                                    </span>
                                    <span className="text-xs font-semibold">
                                        Rp {formatCurrency(data.cashAmount)}
                                    </span>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-2 h-1.5 bg-emerald-200/50 dark:bg-emerald-800/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                        style={{ width: `${data.cashPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Transfer */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                                <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Transfer</span>
                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                        {data.transferPercent.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs text-muted-foreground">
                                        {data.transferCount} transaksi
                                    </span>
                                    <span className="text-xs font-semibold">
                                        Rp {formatCurrency(data.transferAmount)}
                                    </span>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-2 h-1.5 bg-blue-200/50 dark:bg-blue-800/30 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                        style={{ width: `${data.transferPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
