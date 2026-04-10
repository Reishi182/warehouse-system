import { ShoppingCart, Wallet, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import { formatCompact } from '@/lib/format';

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

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
                title="Penjualan Hari Ini"
                value={formatCompact(totalSalesAmount)}
                subtitle="Total pendapatan"
                icon={ShoppingCart}
                gradient="blue"
                animationDelay={0}
            />
            <StatCard
                title="Cash Masuk"
                value={formatCompact(totalCashSales)}
                subtitle="Pembayaran tunai"
                icon={Wallet}
                gradient="amber"
                animationDelay={100}
            />
            <StatCard
                title="Transfer"
                value={formatCompact(totalTransferSales)}
                subtitle="Pembayaran transfer"
                icon={ArrowRightLeft}
                gradient="cyan"
                animationDelay={200}
            />
            <StatCard
                title="Setoran Cash"
                value={formatCompact(totalCashTransfer)}
                subtitle="Sudah disetor"
                icon={ArrowDownToLine}
                gradient="green"
                animationDelay={300}
            />
            <StatCard
                title="Saldo Cash"
                value={formatCompact(saldoBelumDisetor)}
                subtitle="Belum disetor"
                icon={ArrowUpFromLine}
                gradient="orange"
                animationDelay={400}
            />
        </div>
    );
}
