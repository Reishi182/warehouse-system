import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { useCashTransfers } from '@/hooks/useCashTransfers';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Wallet, TrendingUp, Users, Calendar, Search, Banknote } from 'lucide-react';
import { format, isToday, isThisMonth, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function CashHistory() {
    const { data: cashTransfers = [], isLoading } = useCashTransfers();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCashier, setSelectedCashier] = useState<string>('all');

    if (isLoading) {
        return (
            <MainLayout title="Riwayat Setoran" subtitle="Riwayat setoran kas dari kasir">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    // Get unique cashier names for filter
    const uniqueCashiers = Array.from(new Set(cashTransfers.map(ct => ct.cashier_name))).sort();

    // Filter cash transfers
    const filteredTransfers = cashTransfers.filter(ct => {
        const matchesSearch = ct.cashier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ct.note?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCashier = selectedCashier === 'all' || ct.cashier_name === selectedCashier;
        return matchesSearch && matchesCashier;
    });

    // Stats calculations
    const todayTotal = cashTransfers
        .filter(ct => isToday(parseISO(ct.transfer_date)))
        .reduce((sum, ct) => sum + ct.amount, 0);

    const thisMonthTotal = cashTransfers
        .filter(ct => isThisMonth(parseISO(ct.transfer_date)))
        .reduce((sum, ct) => sum + ct.amount, 0);

    const totalAll = cashTransfers.reduce((sum, ct) => sum + ct.amount, 0);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    return (
        <MainLayout title="Riwayat Setoran" subtitle="Riwayat setoran kas dari kasir">
            <div className="space-y-6">
                {/* Stats Section */}
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Total Hari Ini"
                        value={formatCurrency(todayTotal)}
                        icon={<Calendar className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Total Bulan Ini"
                        value={formatCurrency(thisMonthTotal)}
                        icon={<TrendingUp className="w-5 h-5" />}
                        subtitleType="info"
                    />
                    <StatsCard
                        title="Total Setoran"
                        value={formatCurrency(totalAll)}
                        icon={<Wallet className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Jumlah Kasir"
                        value={uniqueCashiers.length.toString()}
                        icon={<Users className="w-5 h-5" />}
                    />
                </StatsGrid>

                {/* Filters Section */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Cari nama kasir atau catatan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 rounded-xl h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                            />
                        </div>
                        <div className="w-full sm:w-[200px]">
                            <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                                <SelectTrigger className="rounded-xl h-11 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                                    <SelectValue placeholder="Filter Kasir" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all" className="rounded-lg">Semua Kasir</SelectItem>
                                    {uniqueCashiers.map(name => (
                                        <SelectItem key={name} value={name} className="rounded-lg">
                                            {name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Banknote className="h-5 w-5 text-emerald-500" />
                            Riwayat Setoran Kasir
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {filteredTransfers.length} setoran ditemukan
                        </p>
                    </div>

                    {filteredTransfers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 mb-4">
                                <Wallet className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Belum Ada Setoran
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                                Setoran kas dari kasir akan muncul di sini setelah diproses.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                    <TableHead className="font-semibold">Tanggal</TableHead>
                                    <TableHead className="font-semibold">Nama Kasir</TableHead>
                                    <TableHead className="font-semibold text-right">Jumlah Setoran</TableHead>
                                    <TableHead className="font-semibold">Catatan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransfers.map((transfer) => (
                                    <TableRow key={transfer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                                    <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-white">
                                                        {format(parseISO(transfer.transfer_date), 'dd MMM yyyy', { locale: idLocale })}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {format(parseISO(transfer.created_at), 'HH:mm', { locale: idLocale })}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                    {transfer.cashier_name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-medium text-gray-900 dark:text-white">
                                                    {transfer.cashier_name}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">
                                                {formatCurrency(transfer.amount)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-gray-600 dark:text-gray-400 text-sm">
                                                {transfer.note || '-'}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
