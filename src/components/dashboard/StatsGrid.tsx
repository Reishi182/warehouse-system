import {
    Package,
    ArrowDownToLine,
    ArrowUpFromLine,
    FileText,
    ClipboardCheck,
    AlertTriangle,
    Banknote,
    Wallet,
    Truck,
    ShoppingCart,
    CreditCard,
} from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import { UserRole, Product, Sale, CashTransfer, SuratJalan, StockOutRequest } from '@/types';
import { formatCompact } from '@/lib/format';

interface StatsGridProps {
    role: UserRole | undefined;
    products: Product[];
    sales: Sale[];
    cashTransfers: CashTransfer[];
    suratJalans: SuratJalan[];
    requests: StockOutRequest[];
}

export default function StatsGrid({
    role,
    products,
    sales,
    cashTransfers,
    suratJalans,
    requests,
}: StatsGridProps) {
    // Calculate common stats
    const totalProducts = products.length;
    const totalStock = products.reduce((acc, p) => acc + p.stock.gudang + p.stock.toko, 0);
    const lowStockCount = products.filter(p => p.stock.gudang < 20 || p.stock.toko < 10).length;
    const pendingRequests = requests.filter(r => r.status === 'pending').length;

    // Sales data - already filtered by date range from Dashboard
    // Exclude cancelled and exchanged
    const validSales = sales.filter(s => !s.is_cancelled && !s.is_exchanged);

    const totalSalesToday = validSales.length;
    const totalSalesAmount = validSales.reduce((acc, s) => acc + s.total_amount, 0);
    const cashSalesAmount = validSales.filter(s => s.payment_method === 'cash').reduce((acc, s) => acc + s.total_amount, 0);
    const totalCashTransfer = cashTransfers.reduce((acc, t) => acc + t.amount, 0);
    const saldoBelumDisetor = Math.max(0, cashSalesAmount - totalCashTransfer);

    // Piutang aktif (credit sales belum lunas) - always show total, not filtered by date
    const activeCreditSales = sales.filter(s =>
        s.is_credit &&
        !s.credit_settled_at &&
        !s.is_cancelled
    );
    const totalPiutang = activeCreditSales.reduce((acc, s) => acc + s.total_amount, 0);

    // No comparison needed — the date range picker handles context
    const salesChange = 0;

    // Surat Jalan stats
    const pendingSuratJalan = suratJalans.filter(s => s.status === 'pending').length;


    // Render based on role
    if (role === 'warehouse') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    title="Total Produk"
                    value={totalProducts.toLocaleString('id-ID')}
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
                    title="Stok Rendah"
                    value={lowStockCount}
                    subtitle="Perlu restok"
                    icon={AlertTriangle}
                    gradient="orange"
                    animationDelay={200}
                />
                <StatCard
                    title="Permintaan Pending"
                    value={pendingRequests}
                    subtitle="Menunggu diproses"
                    icon={ArrowUpFromLine}
                    gradient="cyan"
                    animationDelay={300}
                />
            </div>
        );
    }

    if (role === 'cashier') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    title="Transaksi Hari Ini"
                    value={totalSalesToday}
                    subtitle="Total transaksi"
                    icon={ShoppingCart}
                    gradient="blue"
                    animationDelay={0}
                />
                <StatCard
                    title="Cash Masuk"
                    value={formatCompact(cashSalesAmount)}
                    subtitle={`${validSales.filter(s => s.payment_method === 'cash').length} transaksi`}
                    icon={Banknote}
                    gradient="emerald"
                    animationDelay={100}
                />
                <StatCard
                    title="Belum Disetor"
                    value={formatCompact(saldoBelumDisetor)}
                    subtitle="Perlu setor"
                    icon={Wallet}
                    gradient="amber"
                    animationDelay={200}
                />
                <StatCard
                    title="Piutang Aktif"
                    value={formatCompact(totalPiutang)}
                    subtitle={`${activeCreditSales.length} pelanggan`}
                    icon={CreditCard}
                    gradient="pink"
                    animationDelay={300}
                />
            </div>
        );
    }

    if (role === 'auditor') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                    title="Penjualan Hari Ini"
                    value={formatCompact(totalSalesAmount)}
                    subtitle={`${totalSalesToday} transaksi`}
                    icon={Banknote}
                    gradient="emerald"
                    change={salesChange}
                    animationDelay={0}
                />
                <StatCard
                    title="Permintaan Pending"
                    value={pendingRequests}
                    subtitle="Menunggu approval"
                    icon={ArrowUpFromLine}
                    gradient="orange"
                    animationDelay={100}
                />
                <StatCard
                    title="Surat Jalan Pending"
                    value={pendingSuratJalan}
                    subtitle="Menunggu verifikasi"
                    icon={FileText}
                    gradient="cyan"
                    animationDelay={200}
                />
            </div>
        );
    }

    if (role === 'main_office') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                    title="Cash Masuk"
                    value={formatCompact(cashSalesAmount)}
                    subtitle="Pembayaran tunai"
                    icon={Banknote}
                    gradient="emerald"
                    animationDelay={0}
                />
                <StatCard
                    title="Belum Disetor"
                    value={formatCompact(saldoBelumDisetor)}
                    subtitle="Perlu verifikasi"
                    icon={Wallet}
                    gradient="amber"
                    animationDelay={100}
                />
                <StatCard
                    title="Setoran Diterima"
                    value={formatCompact(totalCashTransfer)}
                    subtitle="Sudah diverifikasi"
                    icon={ClipboardCheck}
                    gradient="cyan"
                    animationDelay={200}
                />
                <StatCard
                    title="Piutang Aktif"
                    value={formatCompact(totalPiutang)}
                    subtitle={`${activeCreditSales.length} pelanggan`}
                    icon={CreditCard}
                    gradient="pink"
                    animationDelay={300}
                />
            </div>
        );
    }

    // Admin - show overview of everything
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard
                title="Total Produk"
                value={totalProducts.toLocaleString('id-ID')}
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
                title="Penjualan Hari Ini"
                value={formatCompact(totalSalesAmount)}
                subtitle={`${totalSalesToday} transaksi`}
                icon={Banknote}
                gradient="green"
                change={salesChange}
                animationDelay={200}
            />
            <StatCard
                title="Permintaan Pending"
                value={pendingRequests}
                subtitle="Menunggu approval"
                icon={ArrowUpFromLine}
                gradient="orange"
                animationDelay={300}
            />
            <StatCard
                title="Surat Jalan Pending"
                value={pendingSuratJalan}
                subtitle="Perlu verifikasi"
                icon={FileText}
                gradient="cyan"
                animationDelay={400}
            />
        </div>
    );
}
