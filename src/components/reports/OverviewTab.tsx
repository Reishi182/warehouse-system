import { Package, ArrowDownToLine, ArrowUpFromLine, FileText } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import { StockDistributionChart, RequestStatusChart } from '@/components/dashboard';

interface OverviewTabProps {
    totalProducts: number;
    totalStock: number;
    completedRequests: number;
    approvedSuratJalans: number;
    stockByLocationData: Array<{ name: string; value: number }>;
    requestStatusData: Array<{ name: string; count: number }>;
}

export default function OverviewTab({
    totalProducts,
    totalStock,
    completedRequests,
    approvedSuratJalans,
    stockByLocationData,
    requestStatusData,
}: OverviewTabProps) {
    return (
        <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Total Produk"
                    value={totalProducts}
                    icon={Package}
                    iconClassName="bg-primary/10 text-primary"
                />
                <StatCard
                    title="Total Stok"
                    value={totalStock.toLocaleString()}
                    icon={ArrowDownToLine}
                    iconClassName="bg-accent/10 text-accent"
                />
                <StatCard
                    title="Permintaan Selesai"
                    value={completedRequests}
                    icon={ArrowUpFromLine}
                    iconClassName="bg-success/10 text-success"
                />
                <StatCard
                    title="Surat Jalan Disetujui"
                    value={approvedSuratJalans}
                    icon={FileText}
                    iconClassName="bg-info/10 text-info"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StockDistributionChart data={stockByLocationData} />
                <RequestStatusChart data={requestStatusData} />
            </div>
        </>
    );
}
