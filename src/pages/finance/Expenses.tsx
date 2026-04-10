import { useState, useMemo } from 'react';
import { Receipt, Trash2, Plus, Zap, Users, Package, Home, Truck, MoreHorizontal } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { DateInput, MonthInput } from '@/components/common/DatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenses, useCreateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { useAuth } from '@/contexts/AuthContext';
import { Expense, ExpenseCategory } from '@/types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const CATEGORY_MAP: Record<ExpenseCategory, { label: string; icon: React.ReactNode; color: string }> = {
    listrik: { label: 'Listrik & Air', icon: <Zap className="w-4 h-4" />, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    gaji: { label: 'Gaji Karyawan', icon: <Users className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    beli_stok: { label: 'Pembelian Stok', icon: <Package className="w-4 h-4" />, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    sewa: { label: 'Sewa Tempat', icon: <Home className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    transport: { label: 'Transport', icon: <Truck className="w-4 h-4" />, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
    lainnya: { label: 'Lain-lain', icon: <MoreHorizontal className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
};

export default function Expenses() {
    const { user, profile } = useAuth();
    const [dialogOpen, setDialogOpen] = useState(false);

    // Date range: current month
    const now = new Date();
    const [monthDate, setMonthDate] = useState(format(now, 'yyyy-MM'));
    const startDate = useMemo(() => format(startOfMonth(new Date(monthDate + '-01')), 'yyyy-MM-dd'), [monthDate]);
    const endDate = useMemo(() => format(endOfMonth(new Date(monthDate + '-01')), 'yyyy-MM-dd'), [monthDate]);

    const { data: expenses = [], isLoading } = useExpenses(startDate, endDate);
    const createExpense = useCreateExpense();
    const deleteExpense = useDeleteExpense();

    // Form state
    const [form, setForm] = useState({
        category: 'lainnya' as ExpenseCategory,
        amount: '',
        description: '',
        expense_date: format(now, 'yyyy-MM-dd'),
        payment_method: 'cash' as 'cash' | 'transfer',
    });

    const handleSubmit = async () => {
        const amount = parseInt(form.amount);
        if (!amount || amount <= 0) return;

        await createExpense.mutateAsync({
            category: form.category,
            amount,
            description: form.description || undefined,
            expense_date: form.expense_date,
            payment_method: form.payment_method,
            created_by: user?.id,
            created_by_name: profile?.name || 'Unknown',
        });

        setForm({ category: 'lainnya', amount: '', description: '', expense_date: format(now, 'yyyy-MM-dd'), payment_method: 'cash' });
        setDialogOpen(false);
    };

    // Stats
    const stats = useMemo(() => {
        const total = expenses.reduce((s, e) => s + e.amount, 0);
        const cashTotal = expenses.filter(e => e.payment_method === 'cash').reduce((s, e) => s + e.amount, 0);
        const transferTotal = expenses.filter(e => e.payment_method === 'transfer').reduce((s, e) => s + e.amount, 0);

        const byCat = new Map<string, number>();
        expenses.forEach(e => byCat.set(e.category, (byCat.get(e.category) || 0) + e.amount));
        const topCategory = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])[0];

        return { total, cashTotal, transferTotal, topCategory, count: expenses.length };
    }, [expenses]);

    const formatRp = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;

    const columns: Column<Expense>[] = [
        {
            header: 'Tanggal',
            accessorKey: 'expense_date',
            cell: (item) => (
                <span className="text-sm">{format(new Date(item.expense_date), 'dd MMM yyyy', { locale: localeId })}</span>
            ),
        },
        {
            header: 'Kategori',
            accessorKey: 'category',
            cell: (item) => {
                const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.lainnya;
                return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cat.color}`}>
                        {cat.icon} {cat.label}
                    </span>
                );
            },
        },
        {
            header: 'Jumlah',
            accessorKey: 'amount',
            cell: (item) => <span className="font-semibold text-red-600 dark:text-red-400">- {formatRp(item.amount)}</span>,
        },
        {
            header: 'Metode',
            accessorKey: 'payment_method',
            cell: (item) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.payment_method === 'cash' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {item.payment_method === 'cash' ? 'Cash' : 'Transfer'}
                </span>
            ),
        },
        {
            header: 'Keterangan',
            accessorKey: 'description',
            cell: (item) => <span className="text-sm text-muted-foreground">{item.description || '-'}</span>,
        },
        {
            header: 'Dicatat Oleh',
            accessorKey: 'created_by_name',
            cell: (item) => <span className="text-sm">{item.created_by_name}</span>,
        },
        {
            header: '',
            accessorKey: 'id',
            cell: (item) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                    onClick={() => deleteExpense.mutate(item.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            ),
        },
    ];

    return (
        <MainLayout
            title="Pencatatan Pengeluaran"
            subtitle="Catat dan kelola semua pengeluaran operasional"
            actions={
                <div className="flex items-center gap-3">
                    <MonthInput
                        value={monthDate + '-01'}
                        onChange={(v) => setMonthDate(v.slice(0, 7))}
                        placeholder="Pilih bulan"
                        className="w-44"
                    />
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-xl">
                                <Plus className="w-4 h-4 mr-2" /> Tambah Pengeluaran
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md rounded-2xl">
                            <DialogHeader>
                                <DialogTitle>Catat Pengeluaran Baru</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label>Kategori</Label>
                                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as ExpenseCategory })}>
                                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {Object.entries(CATEGORY_MAP).map(([key, val]) => (
                                                <SelectItem key={key} value={key}>
                                                    <span className="flex items-center gap-2">{val.icon} {val.label}</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Jumlah (Rp)</Label>
                                    <Input isCurrency
                                        type="number"
                                        placeholder="50000"
                                        value={form.amount}
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className="rounded-xl"
                                        min={1}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tanggal</Label>
                                    <DateInput
                                        value={form.expense_date}
                                        onChange={(v) => setForm({ ...form, expense_date: v })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Metode Bayar</Label>
                                    <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v as 'cash' | 'transfer' })}>
                                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="cash">Cash</SelectItem>
                                            <SelectItem value="transfer">Transfer</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Keterangan (opsional)</Label>
                                    <Input
                                        placeholder="Keterangan..."
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <Button
                                    onClick={handleSubmit}
                                    className="w-full rounded-xl"
                                    disabled={createExpense.isPending || !form.amount}
                                >
                                    {createExpense.isPending ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            }
        >
            <div className="space-y-6">
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Total Pengeluaran"
                        value={formatRp(stats.total)}
                        icon={<Receipt className="w-5 h-5" />}
                        gradient="red"
                        animationDelay={0}
                    />
                    <StatsCard
                        title="Cash Keluar"
                        value={formatRp(stats.cashTotal)}
                        subtitle={`${expenses.filter(e => e.payment_method === 'cash').length} transaksi`}
                        icon={<Receipt className="w-5 h-5" />}
                        gradient="orange"
                        animationDelay={100}
                    />
                    <StatsCard
                        title="Transfer Keluar"
                        value={formatRp(stats.transferTotal)}
                        subtitle={`${expenses.filter(e => e.payment_method === 'transfer').length} transaksi`}
                        icon={<Receipt className="w-5 h-5" />}
                        gradient="blue"
                        animationDelay={200}
                    />
                    <StatsCard
                        title="Kategori Tertinggi"
                        value={stats.topCategory ? CATEGORY_MAP[stats.topCategory[0] as ExpenseCategory]?.label || '-' : '-'}
                        subtitle={stats.topCategory ? formatRp(stats.topCategory[1]) : undefined}
                        icon={<Receipt className="w-5 h-5" />}
                        gradient="purple"
                        animationDelay={300}
                    />
                </StatsGrid>

                <BeautifulTable
                    data={expenses}
                    columns={columns}
                    title={`Pengeluaran — ${format(new Date(monthDate + '-01'), 'MMMM yyyy', { locale: localeId })}`}
                    hideSelection
                    itemsPerPage={10}
                />
            </div>
        </MainLayout>
    );
}
