import { ShoppingCart, Wallet, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import StatCard from '@/components/common/StatCard';

interface FinanceStatsGridProps {
    totalSalesAmount: number;
    totalCashSales: number;
    totalTransferSales: number;
    totalCashTransfer: number;
    saldoBelumDisetor: number;
}

export default function FinanceStatsGrid({
    totalSalesAmount,
    totalCashSales,
    totalTransferSales,
    totalCashTransfer,
    saldoBelumDisetor,
}: FinanceStatsGridProps) {
    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `Rp ${(value / 1000000).toFixed(1)}jt`;
        } else if (value >= 1000) {
            return `Rp ${(value / 1000).toFixed(0)}rb`;
        }
        return `Rp ${value.toLocaleString('id-ID')}`;
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
                title="Penjualan Hari Ini"
                value={formatCurrency(totalSalesAmount)}
                subtitle="Total pendapatan"
                icon={ShoppingCart}
                gradient="blue"
                animationDelay={0}
            />
            <StatCard
                title="Cash Masuk"
                value={formatCurrency(totalCashSales)}
                subtitle="Pembayaran tunai"
                icon={Wallet}
                gradient="amber"
                animationDelay={100}
            />
            <StatCard
                title="Transfer"
                value={formatCurrency(totalTransferSales)}
                subtitle="Pembayaran transfer"
                icon={ArrowRightLeft}
                gradient="cyan"
                animationDelay={200}
            />
            <StatCard
                title="Setoran Cash"
                value={formatCurrency(totalCashTransfer)}
                subtitle="Sudah disetor"
                icon={ArrowDownToLine}
                gradient="green"
                animationDelay={300}
            />
            <StatCard
                title="Saldo Cash"
                value={formatCurrency(saldoBelumDisetor)}
                subtitle="Belum disetor"
                icon={ArrowUpFromLine}
                gradient="orange"
                animationDelay={400}
            />
        </div>
    );
}
