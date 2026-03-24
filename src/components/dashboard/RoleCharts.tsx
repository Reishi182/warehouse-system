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
    suratJalans,
    cashTransfers,
    stockLogs,
}: RoleChartsProps) {
    // Filter out cancelled and exchanged sales for all calculations
    const validSales = useMemo(() =>
        sales.filter(s => !s.is_cancelled && !s.is_exchanged),
        [sales]
    );

    // Generate monthly sales data for performance chart
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

    // Calculate total revenue
    const totalRevenue = useMemo(() => {
        return validSales.reduce((acc, s) => acc + s.total_amount, 0);
    }, [validSales]);

    // Calculate real month-over-month revenue change
    const revenueChange = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const thisMonth = monthlySalesData[currentMonth] || 0;
        const lastMonth = currentMonth > 0 ? monthlySalesData[currentMonth - 1] : 0;
        if (lastMonth === 0) return thisMonth > 0 ? 100 : 0;
        return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    }, [monthlySalesData]);

    // Stock distribution for donut chart
    const stockDistribution = useMemo(() => {
        const gudang = products.reduce((acc, p) => acc + p.stock.gudang, 0);
        const toko = products.reduce((acc, p) => acc + p.stock.toko, 0);
        return [
            { label: 'Gudang', value: gudang, color: '#d6a63d' },
            { label: 'Toko', value: toko, color: '#cbd5e1' },
        ];
    }, [products]);

    const totalStock = products.reduce((acc, p) =>
        acc + p.stock.gudang + p.stock.toko, 0
    );

    // Request status for donut chart
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

    // Surat Jalan status
    const suratJalanStatus = useMemo(() => {
        const pending = suratJalans.filter(s => s.status === 'pending').length;
        const approved = suratJalans.filter(s => s.status === 'approved').length;
        const rejected = suratJalans.filter(s => s.status === 'rejected').length;
        return [
            { label: 'Menunggu', value: pending, color: '#f59e0b' },
            { label: 'Disetujui', value: approved, color: '#22c55e' },
            { label: 'Ditolak', value: rejected, color: '#ef4444' },
        ];
    }, [suratJalans]);

    // REAL monthly stock-in data from stockLogs
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

    // Real month-over-month stock-in change
    const stockInChange = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const thisMonth = monthlyStockInData[currentMonth] || 0;
        const lastMonth = currentMonth > 0 ? monthlyStockInData[currentMonth - 1] : 0;
        if (lastMonth === 0) return thisMonth > 0 ? 100 : 0;
        return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    }, [monthlyStockInData]);

    // Total stock in this year
    const totalStockIn = useMemo(() => {
        return monthlyStockInData.reduce((acc, v) => acc + v, 0);
    }, [monthlyStockInData]);

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

    // Real month-over-month cash transfer change
    const cashTransferChange = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const thisMonth = monthlyCashData[currentMonth] || 0;
        const lastMonth = currentMonth > 0 ? monthlyCashData[currentMonth - 1] : 0;
        if (lastMonth === 0) return thisMonth > 0 ? 100 : 0;
        return Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
    }, [monthlyCashData]);

    // Render charts based on role
    const renderCharts = () => {
        switch (role) {
            case 'admin':
                return (
                    <div className="space-y-6">
                        {/* Revenue Summary Cards */}
                        <RevenueSummaryCards sales={validSales} />

                        {/* Charts Row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <RevenueComparisonChart sales={validSales} />
                            <RevenueByPaymentChart sales={validSales} />
                        </div>

                        {/* Charts Row 2 */}
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

                        {/* Stock Distribution */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <DonutChart
                                title="Distribusi Stok"
                                totalLabel="Total"
                                totalValue={totalStock.toLocaleString('id-ID')}
                                data={stockDistribution}
                            />
                            <DonutChart
                                title="Status Permintaan"
                                totalLabel="Total"
                                totalValue={requests.length.toString()}
                                data={requestStatus}
                            />
                            <DonutChart
                                title="Status Surat Jalan"
                                totalLabel="Total"
                                totalValue={suratJalans.length.toString()}
                                data={suratJalanStatus}
                            />
                        </div>
                    </div>
                );

            case 'cashier':
                return (
                    <div className="space-y-6 mb-6">
                        {/* Revenue Summary - Daily focus only for cashier */}
                        <RevenueSummaryCards sales={validSales} compact />

                        {/* Charts */}
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
                        {/* Revenue Comparison for auditing */}
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
                        {/* Revenue Summary */}
                        <RevenueSummaryCards sales={validSales} />

                        {/* Charts Row 1 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <RevenueComparisonChart sales={validSales} />
                            <RevenueByPaymentChart sales={validSales} />
                        </div>

                        {/* Charts Row 2 */}
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

                        {/* Status Surat Jalan */}
                        <DonutChart
                            title="Status Surat Jalan"
                            totalLabel="Total"
                            totalValue={suratJalans.length.toString()}
                            data={suratJalanStatus}
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    return <>{renderCharts()}</>;
}
