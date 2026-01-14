import {
    Package,
    ArrowDownToLine,
    ArrowUpFromLine,
    FileText,
    ClipboardCheck,
    AlertTriangle,
    Receipt,
    Banknote,
    CreditCard,
    Wallet,
    TrendingUp,
    Truck,
    Users,
    ShoppingCart
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
    const totalStock = products.reduce((acc, p) => acc + p.stock.gudang + p.stock.toko + p.stock.lainnya, 0);
    const lowStockCount = products.filter(p => p.stock.gudang < 20 || p.stock.toko < 10).length;
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const approvedRequests = requests.filter(r => r.status === 'approved').length;

    // Today's stats
    const todayIso = new Date().toISOString().slice(0, 10);
    const salesToday = sales.filter(s => s.created_at.slice(0, 10) === todayIso);
    const transfersToday = cashTransfers.filter(t => t.transfer_date === todayIso);

    const totalSalesToday = salesToday.length;
    const totalSalesAmount = salesToday.reduce((acc, s) => acc + s.total_amount, 0);
    const cashSalesAmount = salesToday.filter(s => s.payment_method === 'cash').reduce((acc, s) => acc + s.total_amount, 0);
    const transferSalesAmount = salesToday.filter(s => s.payment_method === 'transfer').reduce((acc, s) => acc + s.total_amount, 0);
    const totalCashTransfer = transfersToday.reduce((acc, t) => acc + t.amount, 0);
    const saldoBelumDisetor = Math.max(0, cashSalesAmount - totalCashTransfer);

    // Surat Jalan stats
    const pendingSuratJalan = suratJalans.filter(s => s.status === 'pending').length;
    const shippedSuratJalan = suratJalans.filter(s => s.status === 'shipped').length;

    // Render based on role
    if (role === 'warehouse') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Total Produk"
                    value={totalProducts.toLocaleString('id-ID')}
                    subtitle="Produk terdaftar"
                    icon={Package}
                    gradient="blue"
                />
                <StatCard
                    title="Total Stok"
                    value={totalStock.toLocaleString('id-ID')}
                    subtitle="Unit tersedia"
                    icon={ArrowDownToLine}
                    gradient="purple"
                />
                <StatCard
                    title="Stok Rendah"
                    value={lowStockCount}
                    subtitle="Perlu restok"
                    icon={AlertTriangle}
                    gradient="orange"
                />
                <StatCard
                    title="Permintaan Pending"
                    value={pendingRequests}
                    subtitle="Menunggu diproses"
                    icon={ArrowUpFromLine}
                    gradient="cyan"
                />
            </div>
        );
    }

    if (role === 'cashier') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Transaksi Hari Ini"
                    value={totalSalesToday}
                    subtitle="Total transaksi"
                    icon={ShoppingCart}
                    gradient="blue"
                />
                <StatCard
                    title="Total Penjualan"
                    value={`Rp ${(totalSalesAmount / 1000).toFixed(0)}k`}
                    subtitle="Hari ini"
                    icon={TrendingUp}
                    gradient="green"
                />
                <StatCard
                    title="Cash Masuk"
                    value={`Rp ${(cashSalesAmount / 1000).toFixed(0)}k`}
                    subtitle={`${salesToday.filter(s => s.payment_method === 'cash').length} transaksi`}
                    icon={Banknote}
                    gradient="purple"
                />
                <StatCard
                    title="Belum Disetor"
                    value={`Rp ${(saldoBelumDisetor / 1000).toFixed(0)}k`}
                    subtitle="Perlu setor"
                    icon={Wallet}
                    gradient="orange"
                />
            </div>
        );
    }

    if (role === 'auditor') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Surat Jalan Pending"
                    value={pendingSuratJalan}
                    subtitle="Menunggu verifikasi"
                    icon={FileText}
                    gradient="cyan"
                />
                <StatCard
                    title="Dalam Pengiriman"
                    value={shippedSuratJalan}
                    subtitle="Surat jalan shipped"
                    icon={Truck}
                    gradient="purple"
                />
                <StatCard
                    title="Total Produk"
                    value={totalProducts}
                    subtitle="Produk terdaftar"
                    icon={Package}
                    gradient="blue"
                />
                <StatCard
                    title="Total Stok"
                    value={totalStock.toLocaleString('id-ID')}
                    subtitle="Unit tersedia"
                    icon={ArrowDownToLine}
                    gradient="green"
                />
            </div>
        );
    }

    if (role === 'main_office') {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <StatCard
                    title="Penjualan Hari Ini"
                    value={`Rp ${(totalSalesAmount / 1000).toFixed(0)}k`}
                    subtitle={`${totalSalesToday} transaksi`}
                    icon={TrendingUp}
                    gradient="green"
                />
                <StatCard
                    title="Cash Masuk"
                    value={`Rp ${(cashSalesAmount / 1000).toFixed(0)}k`}
                    subtitle="Pembayaran tunai"
                    icon={Banknote}
                    gradient="purple"
                />
                <StatCard
                    title="Belum Disetor"
                    value={`Rp ${(saldoBelumDisetor / 1000).toFixed(0)}k`}
                    subtitle="Perlu verifikasi"
                    icon={Wallet}
                    gradient="orange"
                />
                <StatCard
                    title="Setoran Diterima"
                    value={`Rp ${(totalCashTransfer / 1000).toFixed(0)}k`}
                    subtitle="Sudah diverifikasi"
                    icon={ClipboardCheck}
                    gradient="cyan"
                />
                <StatCard
                    title="Surat Jalan Pending"
                    value={pendingSuratJalan}
                    subtitle="Perlu ditindaklanjuti"
                    icon={FileText}
                    gradient="blue"
                />
            </div>
        );
    }

    // Admin - show overview of everything
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
            <StatCard
                title="Total Produk"
                value={totalProducts.toLocaleString('id-ID')}
                subtitle="Produk terdaftar"
                icon={Package}
                gradient="blue"
            />
            <StatCard
                title="Total Stok"
                value={totalStock.toLocaleString('id-ID')}
                subtitle="Unit tersedia"
                icon={ArrowDownToLine}
                gradient="purple"
            />
            <StatCard
                title="Penjualan Hari Ini"
                value={`Rp ${(totalSalesAmount / 1000).toFixed(0)}k`}
                subtitle={`${totalSalesToday} transaksi`}
                icon={TrendingUp}
                gradient="green"
            />
            <StatCard
                title="Permintaan Pending"
                value={pendingRequests}
                subtitle="Menunggu approval"
                icon={ArrowUpFromLine}
                gradient="orange"
            />
            <StatCard
                title="Surat Jalan Pending"
                value={pendingSuratJalan}
                subtitle="Perlu verifikasi"
                icon={FileText}
                gradient="cyan"
            />
        </div>
    );
}
