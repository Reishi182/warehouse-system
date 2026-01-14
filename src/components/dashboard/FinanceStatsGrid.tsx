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
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
                title="Penjualan Hari Ini"
                value={`Rp ${totalSalesAmount.toLocaleString('id-ID')}`}
                icon={ShoppingCart}
                iconClassName="bg-primary/10 text-primary"
            />
            <StatCard
                title="Cash Masuk"
                value={`Rp ${totalCashSales.toLocaleString('id-ID')}`}
                icon={Wallet}
                iconClassName="bg-warning/10 text-warning"
            />
            <StatCard
                title="Transfer"
                value={`Rp ${totalTransferSales.toLocaleString('id-ID')}`}
                icon={ArrowRightLeft}
                iconClassName="bg-info/10 text-info"
            />
            <StatCard
                title="Setoran Cash"
                value={`Rp ${totalCashTransfer.toLocaleString('id-ID')}`}
                icon={ArrowDownToLine}
                iconClassName="bg-success/10 text-success"
            />
            <StatCard
                title="Saldo Cash"
                value={`Rp ${saldoBelumDisetor.toLocaleString('id-ID')}`}
                icon={ArrowUpFromLine}
                iconClassName="bg-accent/10 text-accent"
            />
        </div>
    );
}
