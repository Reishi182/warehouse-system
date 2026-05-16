import { useMemo } from 'react';
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

                        <TopRevenueProducts sales={validSales} products={products} />
                    </div>
                );

            case 'cashier':
                return (
                    <RevenueSummaryCards sales={validSales} />
                );

            case 'warehouse':
                return (
                    <div className="space-y-6 mb-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

                        <TopRevenueProducts sales={validSales} products={products} />
                    </div>
                );

            default:
                return null;
        }
    };

    return <>{renderCharts()}</>;
}
