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

    // Today's stats - exclude cancelled and exchanged sales
    const todayIso = new Date().toISOString().slice(0, 10);
    const salesToday = sales.filter(s =>
        s.created_at.slice(0, 10) === todayIso &&
        !s.is_cancelled &&
        !s.is_exchanged
    );
    const transfersToday = cashTransfers.filter(t => t.transfer_date === todayIso);

    const totalSalesToday = salesToday.length;
    const totalSalesAmount = salesToday.reduce((acc, s) => acc + s.total_amount, 0);
    const cashSalesAmount = salesToday.filter(s => s.payment_method === 'cash').reduce((acc, s) => acc + s.total_amount, 0);
    const totalCashTransfer = transfersToday.reduce((acc, t) => acc + t.amount, 0);
    const saldoBelumDisetor = Math.max(0, cashSalesAmount - totalCashTransfer);

    // Piutang aktif (credit sales belum lunas)
    const activeCreditSales = sales.filter(s =>
        s.is_credit &&
        !s.credit_settled_at &&
        !s.is_cancelled
    );
    const totalPiutang = activeCreditSales.reduce((acc, s) => acc + s.total_amount, 0);

    // Yesterday's stats for comparison - also exclude cancelled/exchanged
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayIso = yesterday.toISOString().slice(0, 10);
    const salesYesterday = sales.filter(s =>
        s.created_at.slice(0, 10) === yesterdayIso &&
        !s.is_cancelled &&
        !s.is_exchanged
    );
    const yesterdayAmount = salesYesterday.reduce((acc, s) => acc + s.total_amount, 0);
    const salesChange = yesterdayAmount > 0 ? ((totalSalesAmount - yesterdayAmount) / yesterdayAmount * 100) : 0;

    // Surat Jalan stats
    const pendingSuratJalan = suratJalans.filter(s => s.status === 'pending').length;

    // Format currency helper
    const formatCurrency = (value: number) => {
        if (value >= 1000000) {
            return `Rp ${(value / 1000000).toFixed(1)}jt`;
        } else if (value >= 1000) {
            return `Rp ${(value / 1000).toFixed(0)}rb`;
        }
        return `Rp ${value.toLocaleString('id-ID')}`;
    };

    // Render based on role
    if (role === 'warehouse') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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
                    value={formatCurrency(cashSalesAmount)}
                    subtitle={`${salesToday.filter(s => s.payment_method === 'cash').length} transaksi`}
                    icon={Banknote}
                    gradient="emerald"
                    animationDelay={100}
                />
                <StatCard
                    title="Belum Disetor"
                    value={formatCurrency(saldoBelumDisetor)}
                    subtitle="Perlu setor"
                    icon={Wallet}
                    gradient="amber"
                    animationDelay={200}
                />
                <StatCard
                    title="Piutang Aktif"
                    value={formatCurrency(totalPiutang)}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Penjualan Hari Ini"
                    value={formatCurrency(totalSalesAmount)}
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
                <StatCard
                    title="Dalam Pengiriman"
                    value={suratJalans.filter(s => s.status === 'shipped').length}
                    subtitle="Surat jalan shipped"
                    icon={Truck}
                    gradient="purple"
                    animationDelay={300}
                />
            </div>
        );
    }

    if (role === 'main_office') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Cash Masuk"
                    value={formatCurrency(cashSalesAmount)}
                    subtitle="Pembayaran tunai"
                    icon={Banknote}
                    gradient="emerald"
                    animationDelay={0}
                />
                <StatCard
                    title="Belum Disetor"
                    value={formatCurrency(saldoBelumDisetor)}
                    subtitle="Perlu verifikasi"
                    icon={Wallet}
                    gradient="amber"
                    animationDelay={100}
                />
                <StatCard
                    title="Setoran Diterima"
                    value={formatCurrency(totalCashTransfer)}
                    subtitle="Sudah diverifikasi"
                    icon={ClipboardCheck}
                    gradient="cyan"
                    animationDelay={200}
                />
                <StatCard
                    title="Piutang Aktif"
                    value={formatCurrency(totalPiutang)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
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
                value={formatCurrency(totalSalesAmount)}
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
