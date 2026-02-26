import { useState, useMemo } from 'react';
import { Wallet, Plus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCashierSessions, useCreateCashierSession } from '@/hooks/useCashierSessions';
import { CashierSession } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function CashierOpeningCash() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const now = new Date();
    const [dateFilter, setDateFilter] = useState('');

    const { data: sessions = [], isLoading } = useCashierSessions(dateFilter || undefined);
    const createSession = useCreateCashierSession();

    const [form, setForm] = useState({
        cashier_name: '',
        opening_cash: '',
        session_date: format(now, 'yyyy-MM-dd'),
        note: '',
    });

    const handleSubmit = async () => {
        const amount = parseInt(form.opening_cash);
        if (!form.cashier_name.trim() || isNaN(amount) || amount < 0) return;

        await createSession.mutateAsync({
            cashier_name: form.cashier_name.trim(),
            opening_cash: amount,
            session_date: form.session_date,
            note: form.note || undefined,
        });

        setForm({ cashier_name: '', opening_cash: '', session_date: format(now, 'yyyy-MM-dd'), note: '' });
        setDialogOpen(false);
    };

    const formatRp = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;

    const stats = useMemo(() => {
        const total = sessions.reduce((s, e) => s + e.opening_cash, 0);
        const todaySessions = sessions.filter(s => s.session_date === format(now, 'yyyy-MM-dd'));
        const todayTotal = todaySessions.reduce((s, e) => s + e.opening_cash, 0);
        return { total, todayTotal, count: sessions.length, todayCount: todaySessions.length };
    }, [sessions]);

    const columns: Column<CashierSession>[] = [
        {
            header: 'Tanggal',
            accessorKey: 'session_date',
            cell: (item) => (
                <span className="text-sm font-medium">
                    {format(new Date(item.session_date), 'dd MMM yyyy', { locale: localeId })}
                </span>
            ),
        },
        {
            header: 'Kasir',
            accessorKey: 'cashier_name',
            cell: (item) => <span className="font-medium">{item.cashier_name}</span>,
        },
        {
            header: 'Modal Awal',
            accessorKey: 'opening_cash',
            cell: (item) => (
                <span className="font-semibold text-green-600 dark:text-green-400">
                    {formatRp(item.opening_cash)}
                </span>
            ),
        },
        {
            header: 'Catatan',
            accessorKey: 'note',
            cell: (item) => <span className="text-sm text-muted-foreground">{item.note || '-'}</span>,
        },
        {
            header: 'Waktu Input',
            accessorKey: 'created_at',
            cell: (item) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(item.created_at), 'HH:mm', { locale: localeId })}
                </span>
            ),
        },
    ];

    return (
        <MainLayout
            title="Modal Awal Kasir"
            subtitle="Catat uang kembalian yang disediakan sebelum shift kasir"
            actions={
                <div className="flex items-center gap-3">
                    <Input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-40 rounded-xl"
                        placeholder="Filter tanggal"
                    />
                    {dateFilter && (
                        <Button variant="ghost" size="sm" onClick={() => setDateFilter('')} className="rounded-xl text-xs">
                            Reset
                        </Button>
                    )}
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-xl">
                                <Plus className="w-4 h-4 mr-2" /> Input Modal Awal
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md rounded-2xl">
                            <DialogHeader>
                                <DialogTitle>Input Modal Awal Kasir</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label>Nama Kasir</Label>
                                    <Input
                                        placeholder="Nama kasir..."
                                        value={form.cashier_name}
                                        onChange={(e) => setForm({ ...form, cashier_name: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Modal Awal (Rp)</Label>
                                    <Input
                                        type="number"
                                        placeholder="200000"
                                        value={form.opening_cash}
                                        onChange={(e) => setForm({ ...form, opening_cash: e.target.value })}
                                        className="rounded-xl"
                                        min={0}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tanggal</Label>
                                    <Input
                                        type="date"
                                        value={form.session_date}
                                        onChange={(e) => setForm({ ...form, session_date: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Catatan (opsional)</Label>
                                    <Input
                                        placeholder="Catatan..."
                                        value={form.note}
                                        onChange={(e) => setForm({ ...form, note: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <Button
                                    onClick={handleSubmit}
                                    className="w-full rounded-xl"
                                    disabled={createSession.isPending || !form.cashier_name || !form.opening_cash}
                                >
                                    {createSession.isPending ? 'Menyimpan...' : 'Simpan Modal Awal'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            }
        >
            <div className="space-y-6">
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Total Modal Hari Ini"
                        value={formatRp(stats.todayTotal)}
                        subtitle={`${stats.todayCount} kasir`}
                        icon={<Wallet className="w-5 h-5" />}
                        gradient="green"
                        animationDelay={0}
                    />
                    <StatsCard
                        title="Total Keseluruhan"
                        value={formatRp(stats.total)}
                        subtitle={`${stats.count} record`}
                        icon={<Wallet className="w-5 h-5" />}
                        gradient="blue"
                        animationDelay={100}
                    />
                    <StatsCard
                        title="Rata-rata Modal"
                        value={stats.count > 0 ? formatRp(Math.round(stats.total / stats.count)) : 'Rp 0'}
                        subtitle="Per sesi"
                        icon={<Wallet className="w-5 h-5" />}
                        gradient="amber"
                        animationDelay={200}
                    />
                </StatsGrid>

                <BeautifulTable
                    data={sessions}
                    columns={columns}
                    title={dateFilter ? `Modal Kasir — ${format(new Date(dateFilter), 'dd MMMM yyyy', { locale: localeId })}` : 'Semua Riwayat Modal Kasir'}
                    hideSelection
                    itemsPerPage={10}
                />
            </div>
        </MainLayout>
    );
}
