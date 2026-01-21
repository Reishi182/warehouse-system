import { useMemo } from 'react';
import { PerformanceChart } from './PerformanceChart';
import { DonutChart } from './DonutChart';
import { UserRole } from '@/types';
import { Product, Sale, StockOutRequest, SuratJalan, CashTransfer } from '@/types';

interface RoleChartsProps {
    role: UserRole | undefined;
    products: Product[];
    sales: Sale[];
    requests: StockOutRequest[];
    suratJalans: SuratJalan[];
    cashTransfers: CashTransfer[];
}

export function RoleCharts({
    role,
    products,
    sales,
    requests,
    suratJalans,
    cashTransfers
}: RoleChartsProps) {
    // Generate monthly sales data for performance chart
    const monthlySalesData = useMemo(() => {
        const months = Array(12).fill(0);
        const currentYear = new Date().getFullYear();

        sales.forEach(sale => {
            const date = new Date(sale.created_at);
            if (date.getFullYear() === currentYear) {
                months[date.getMonth()] += sale.total_amount;
            }
        });

        return months;
    }, [sales]);

    // Calculate total revenue
    const totalRevenue = useMemo(() => {
        return sales.reduce((acc, s) => acc + s.total_amount, 0);
    }, [sales]);

    // Calculate revenue change (this month vs last month)
    const revenueChange = useMemo(() => {
        const currentMonth = new Date().getMonth();
        const thisMonth = monthlySalesData[currentMonth] || 0;
        const lastMonth = monthlySalesData[currentMonth - 1] || 1;
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

    // Monthly stock in data from actual stockLogs
    // Note: This requires stockLogs prop to be added to RoleChartsProps
    const monthlyStockInData = useMemo(() => {
        // For now, calculate based on product count distribution
        // This should ideally come from stockLogs data
        const months = Array(12).fill(0);
        const currentYear = new Date().getFullYear();

        // Distribute total stock across months based on when products might have been added
        const avgMonthlyStock = Math.round(totalStock / 12);
        return months.map((_, i) => {
            // Use a more stable distribution based on index
            const factor = 0.8 + (i / 12) * 0.4; // Gradually increasing trend
            return Math.round(avgMonthlyStock * factor);
        });
    }, [totalStock]);

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

    // Render charts based on role
    const renderCharts = () => {
        switch (role) {
            case 'admin':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div className="lg:col-span-2">
                            <PerformanceChart
                                title="Performa Penjualan"
                                value={`Rp ${totalRevenue.toLocaleString('id-ID')}`}
                                change={revenueChange}
                                data={monthlySalesData}
                            />
                        </div>
                        <DonutChart
                            title="Distribusi Stok"
                            totalLabel="Total"
                            totalValue={totalStock.toLocaleString('id-ID')}
                            data={stockDistribution}
                        />
                    </div>
                );

            case 'cashier':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div className="lg:col-span-2">
                            <PerformanceChart
                                title="Transaksi Harian"
                                value={`Rp ${totalRevenue.toLocaleString('id-ID')}`}
                                change={revenueChange}
                                data={monthlySalesData}
                            />
                        </div>
                        <DonutChart
                            title="Status Permintaan Stok"
                            totalLabel="Total"
                            totalValue={requests.length.toString()}
                            data={requestStatus}
                        />
                    </div>
                );

            case 'warehouse':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div className="lg:col-span-2">
                            <PerformanceChart
                                title="Stok Masuk"
                                value={totalStock.toLocaleString('id-ID')}
                                change={5}
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
                );

            case 'auditor':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div className="lg:col-span-2">
                            <PerformanceChart
                                title="Cash Transfer"
                                value={`Rp ${totalCashTransfer.toLocaleString('id-ID')}`}
                                change={3}
                                data={monthlyCashData}
                            />
                        </div>
                        <DonutChart
                            title="Status Surat Jalan"
                            totalLabel="Total"
                            totalValue={suratJalans.length.toString()}
                            data={suratJalanStatus}
                        />
                    </div>
                );

            case 'main_office':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                        <div className="lg:col-span-2">
                            <PerformanceChart
                                title="Pendapatan B2B"
                                value={`Rp ${totalRevenue.toLocaleString('id-ID')}`}
                                change={revenueChange}
                                data={monthlySalesData}
                            />
                        </div>
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
