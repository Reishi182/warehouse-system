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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Total Produk"
                    value={totalProducts}
                    subtitle="Produk terdaftar"
                    icon={Package}
                    gradient="blue"
                    animationDelay={0}
                />
                <StatCard
                    title="Total Stok"
                    value={totalStock.toLocaleString('id-ID')}
                    subtitle="Unit tersedia"
                    icon={ArrowDownToLine}
                    gradient="purple"
                    animationDelay={100}
                />
                <StatCard
                    title="Permintaan Selesai"
                    value={completedRequests}
                    subtitle="Request completed"
                    icon={ArrowUpFromLine}
                    gradient="green"
                    animationDelay={200}
                />
                <StatCard
                    title="Surat Jalan Disetujui"
                    value={approvedSuratJalans}
                    subtitle="Approved"
                    icon={FileText}
                    gradient="cyan"
                    animationDelay={300}
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
