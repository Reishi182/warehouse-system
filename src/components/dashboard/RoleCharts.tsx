import { useMemo } from 'react';
import { PerformanceChart } from './PerformanceChart';
import { DonutChart } from './DonutChart';
import RevenueSummaryCards from './RevenueSummaryCards';
import RevenueComparisonChart from './RevenueComparisonChart';
import RevenueByPaymentChart from './RevenueByPaymentChart';
import TopRevenueProducts from './TopRevenueProducts';
import { UserRole } from '@/types';
import { Product, Sale, StockOutRequest, SuratJalan, CashTransfer, StockLog } from '@/types';

interface RoleChartsProps {
    role: UserRole | undefined;
    products: Product[];
    sales: Sale[];
    requests: StockOutRequest[];
    suratJalans: SuratJalan[];
    cashTransfers: CashTransfer[];
    stockLogs: StockLog[];
}

export function RoleCharts({
    role,
    products,
    sales,
    requests,
    suratJalans: _suratJalans,
    cashTransfers,
    stockLogs,
}: RoleChartsProps) {
    // Filter out cancelled and exchanged sales
    const validSales = useMemo(() =>
        sales.filter(s => !s.is_cancelled && !s.is_exchanged),
        [sales]
    );

    // Monthly sales data
    const monthlySalesData = useMemo(() => {
        const months = Array(12).fill(0);
        const currentYear = new Date().getFullYear();
        validSales.forEach(sale => {
            const date = new Date(sale.created_at);
            if (date.getFullYear() === currentYear) {
                months[date.getMonth()] += sale.total_amount;
            }
        });
        return months;
    }, [validSales]);

    const totalRevenue = useMemo(() =>
        validSales.reduce((acc, s) => acc + s.total_amount, 0),
        [validSales]
    );

    const revenueChange = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const thisMonth = monthlySalesData[currentMonth] || 0;
        const lastMonth = currentMonth > 0 ? monthlySalesData[currentMonth - 1] : 0;
        if (lastMonth === 0) return thisMonth > 0 ? 100 : 0;
        return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    }, [monthlySalesData]);

    // Stock distribution
    const stockDistribution = useMemo(() => {
        const gudang = products.reduce((acc, p) => acc + p.stock.gudang, 0);
        const toko = products.reduce((acc, p) => acc + p.stock.toko, 0);
        return [
            { label: 'Gudang', value: gudang, color: '#818cf8' },
            { label: 'Toko', value: toko, color: '#34d399' },
        ];
    }, [products]);

    const totalStock = products.reduce((acc, p) => acc + p.stock.gudang + p.stock.toko, 0);

    // Request status
    const requestStatus = useMemo(() => {
        const pending = requests.filter(r => r.status === 'pending').length;
        const approved = requests.filter(r => r.status === 'approved').length;
        const completed = requests.filter(r => r.status === 'completed').length;
        const rejected = requests.filter(r => r.status === 'rejected').length;
        return [
            { label: 'Pending', value: pending, color: '#f59e0b' },
            { label: 'Disetujui', value: approved, color: '#22c55e' },
            { label: 'Selesai', value: completed, color: '#3b82f6' },
            { label: 'Ditolak', value: rejected, color: '#ef4444' },
        ];
    }, [requests]);

    // Monthly stock-in data
    const monthlyStockInData = useMemo(() => {
        const months = Array(12).fill(0);
        const currentYear = new Date().getFullYear();
        stockLogs.filter(log => log.type === 'in').forEach(log => {
            const date = new Date(log.timestamp);
            if (date.getFullYear() === currentYear) {
                months[date.getMonth()] += log.quantity;
            }
        });
        return months;
    }, [stockLogs]);

    const stockInChange = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const thisMonth = monthlyStockInData[currentMonth] || 0;
        const lastMonth = currentMonth > 0 ? monthlyStockInData[currentMonth - 1] : 0;
        if (lastMonth === 0) return thisMonth > 0 ? 100 : 0;
        return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    }, [monthlyStockInData]);

    const totalStockIn = useMemo(() =>
        monthlyStockInData.reduce((acc, v) => acc + v, 0),
        [monthlyStockInData]
    );

    // Cash transfer data
    const monthlyCashData = useMemo(() => {
        const months = Array(12).fill(0);
        const currentYear = new Date().getFullYear();
        cashTransfers.forEach(transfer => {
            const date = new Date(transfer.created_at);
            if (date.getFullYear() === currentYear) {
                months[date.getMonth()] += transfer.amount;
            }
        });
        return months;
    }, [cashTransfers]);

    const totalCashTransfer = cashTransfers.reduce((acc, t) => acc + t.amount, 0);

    const cashTransferChange = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const thisMonth = monthlyCashData[currentMonth] || 0;
        const lastMonth = currentMonth > 0 ? monthlyCashData[currentMonth - 1] : 0;
        if (lastMonth === 0) return thisMonth > 0 ? 100 : 0;
        return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    }, [monthlyCashData]);

    const renderCharts = () => {
        switch (role) {
            case 'admin':
                return (
                    <div className="space-y-6">
                        <RevenueSummaryCards sales={validSales} />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <RevenueComparisonChart sales={validSales} />
                            <RevenueByPaymentChart sales={validSales} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <PerformanceChart
                                    title="Performa Penjualan"
                                    value={`Rp ${totalRevenue.toLocaleString('id-ID')}`}
                                    change={revenueChange}
                                    data={monthlySalesData}
                                />
                            </div>
                            <TopRevenueProducts sales={validSales} products={products} />
                        </div>
                    </div>
                );

            case 'cashier':
                return (
                    <div className="space-y-6 mb-6">
                        <RevenueSummaryCards sales={validSales} compact />
                        <RevenueByPaymentChart sales={validSales} days={7} />
                    </div>
                );

            case 'warehouse':
                return (
                    <div className="space-y-6 mb-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <PerformanceChart
                                    title="Stok Masuk"
                                    value={totalStockIn.toLocaleString('id-ID') + ' unit'}
                                    change={stockInChange}
                                    data={monthlyStockInData}
                                />
                            </div>
                            <DonutChart
                                title="Distribusi Stok"
                                totalLabel="Total"
                                totalValue={totalStock.toLocaleString('id-ID')}
                                data={stockDistribution}
                            />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <DonutChart
                                title="Status Permintaan"
                                totalLabel="Total"
                                totalValue={requests.length.toString()}
                                data={requestStatus}
                            />
                        </div>
                    </div>
                );

            case 'auditor':
                return (
                    <div className="space-y-6 mb-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <RevenueComparisonChart sales={validSales} />
                            <RevenueByPaymentChart sales={validSales} />
                        </div>
                        <PerformanceChart
                            title="Cash Transfer"
                            value={`Rp ${totalCashTransfer.toLocaleString('id-ID')}`}
                            change={cashTransferChange}
                            data={monthlyCashData}
                        />
                    </div>
                );

            case 'main_office':
                return (
                    <div className="space-y-6 mb-6">
                        <RevenueSummaryCards sales={validSales} />

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <RevenueComparisonChart sales={validSales} />
                            <RevenueByPaymentChart sales={validSales} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <PerformanceChart
                                    title="Performa Penjualan"
                                    value={`Rp ${totalRevenue.toLocaleString('id-ID')}`}
                                    change={revenueChange}
                                    data={monthlySalesData}
                                />
                            </div>
                            <TopRevenueProducts sales={validSales} products={products} />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return <>{renderCharts()}</>;
}
