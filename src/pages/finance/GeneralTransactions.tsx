import { useState, useMemo } from 'react';
import { Plus, ArrowUpCircle, ArrowDownCircle, Calendar as CalendarIcon, Upload, Trash2, ExternalLink, History, Wallet } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { DateInput } from '@/components/common/DatePicker';
import { useAuth } from '@/contexts/AuthContext';
import {
    useOtherTransactions,
    useCreateOtherTransaction,
    useDeleteOtherTransaction,
} from '@/hooks/useOtherTransactions';
import { OtherTransaction } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export default function GeneralTransactions() {
    const { user, profile } = useAuth();
    const { data: transactions = [], isLoading } = useOtherTransactions();
    const createTransaction = useCreateOtherTransaction();
    const deleteTransaction = useDeleteOtherTransaction();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');

    // Filter State
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

    // Form State
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    const handleSave = async () => {
        if (!date || !category || !amount) return;

        let proofUrl: string | undefined;

        if (file) {
            setUploading(true);
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `transactions/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error } = await supabase.storage
                    .from('uploads')
                    .upload(fileName, file);

                if (error) throw error;

                const { data } = supabase.storage
                    .from('uploads')
                    .getPublicUrl(fileName);

                proofUrl = data.publicUrl;
            } catch (err) {
                console.error('Upload failed:', err);
                setUploading(false);
                return;
            }
            setUploading(false);
        }

        await createTransaction.mutateAsync({
            transaction_date: format(date, 'yyyy-MM-dd'),
            type,
            category,
            amount: parseInt(amount.replace(/\D/g, '')),
            description,
            proof_url: proofUrl,
            created_by: user?.id || '',
            created_by_name: profile?.name || '',
        });

        setIsAddOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setDate(new Date());
        setType('expense');
        setCategory('');
        setAmount('');
        setDescription('');
        setFile(null);
    };

    const handleDelete = async () => {
        if (deleteId) {
            await deleteTransaction.mutateAsync(deleteId);
            setDeleteId(null);
        }
    };

    const categories = type === 'income'
        ? ['Penjualan Aset', 'Investasi', 'Lain-lain']
        : ['Operasional', 'Gaji', 'Listrik & Air', 'Maintenance', 'Perlengkapan', 'Sewa', 'Lain-lain'];

    // DATA PROCESSING

    // Daily Data
    const dailyData = useMemo(() => {
        return transactions.filter(t => t.transaction_date === selectedDate);
    }, [transactions, selectedDate]);

    const dailySummary = useMemo(() => {
        const income = dailyData.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = dailyData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { income, expense, net: income - expense };
    }, [dailyData]);

    // Monthly Data
    const monthlyData = useMemo(() => {
        const filtered = transactions.filter(t => t.transaction_date.startsWith(selectedMonth));
        // Group by date
        const grouped: Record<string, { date: string; income: number; expense: number; net: number }> = {};

        filtered.forEach(t => {
            if (!grouped[t.transaction_date]) {
                grouped[t.transaction_date] = { date: t.transaction_date, income: 0, expense: 0, net: 0 };
            }
            if (t.type === 'income') {
                grouped[t.transaction_date].income += t.amount;
            } else {
                grouped[t.transaction_date].expense += t.amount;
            }
        });

        // Calculate net and sort
        return Object.values(grouped)
            .map(d => ({ ...d, net: d.income - d.expense }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [transactions, selectedMonth]);

    const monthlySummary = useMemo(() => {
        const income = monthlyData.reduce((sum, d) => sum + d.income, 0);
        const expense = monthlyData.reduce((sum, d) => sum + d.expense, 0);
        return { income, expense, net: income - expense };
    }, [monthlyData]);

    const monthOptions = useMemo(() => {
        const options: { value: string; label: string }[] = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = format(d, 'MMMM yyyy', { locale: localeId });
            options.push({ value, label });
        }
        return options;
    }, []);

    // COLUMNS

    const dailyColumns: Column<OtherTransaction>[] = [
        {
            header: 'Tanggal',
            accessorKey: 'transaction_date',
            cell: (item) => format(new Date(item.transaction_date), 'dd MMM yyyy', { locale: localeId }),
        },
        {
            header: 'Tipe',
            accessorKey: 'type',
            cell: (item) => (
                <span className={cn(
                    "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full w-fit",
                    item.type === 'income' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                    {item.type === 'income' ? <ArrowUpCircle className="w-3 h-3" /> : <ArrowDownCircle className="w-3 h-3" />}
                    {item.type === 'income' ? 'Masuk' : 'Keluar'}
                </span>
            ),
        },
        {
            header: 'Kategori',
            accessorKey: 'category',
        },
        {
            header: 'Keterangan',
            accessorKey: 'description',
            cell: (item) => <span className="text-muted-foreground text-sm line-clamp-1">{item.description || '-'}</span>,
        },
        {
            header: 'Nominal',
            accessorKey: 'amount',
            cell: (item) => (
                <span className={cn(
                    "font-bold",
                    item.type === 'income' ? "text-green-600" : "text-red-600"
                )}>
                    {item.type === 'income' ? '+' : '-'} Rp {item.amount.toLocaleString('id-ID')}
                </span>
            ),
        },
        {
            header: 'Bukti',
            accessorKey: 'proof_url',
            sortable: false,
            cell: (item) => item.proof_url ? (
                <a
                    href={item.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
                >
                    <ExternalLink className="w-3 h-3" />
                </a>
            ) : <span className="text-muted-foreground text-xs">-</span>,
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (item) => (
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteId(item.id)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            ),
        },
    ];

    interface MonthlyRow { date: string; income: number; expense: number; net: number }
    const monthlyColumns: Column<MonthlyRow>[] = [
        {
            header: 'Tanggal',
            accessorKey: 'date',
            cell: (item) => (
                <span className="font-medium">
                    {format(new Date(item.date), 'dd MMMM yyyy', { locale: localeId })}
                </span>
            )
        },
        {
            header: 'Total Masuk',
            accessorKey: 'income',
            cell: (item) => (
                <span className="text-green-600 font-semibold">
                    {item.income > 0 ? `Rp ${item.income.toLocaleString('id-ID')}` : '-'}
                </span>
            )
        },
        {
            header: 'Total Keluar',
            accessorKey: 'expense',
            cell: (item) => (
                <span className="text-red-600 font-semibold">
                    {item.expense > 0 ? `Rp ${item.expense.toLocaleString('id-ID')}` : '-'}
                </span>
            )
        },
        {
            header: 'Net Harian',
            accessorKey: 'net',
            cell: (item) => (
                <span className={cn(
                    "font-bold",
                    item.net > 0 ? "text-green-600" : item.net < 0 ? "text-red-600" : "text-gray-600"
                )}>
                    Rp {item.net.toLocaleString('id-ID')}
                </span>
            )
        }
    ];

    if (isLoading) {
        return (
            <MainLayout title="Transaksi Umum" subtitle="Catat pemasukan dan pengeluaran operasional">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Transaksi Umum"
            subtitle="Catat pemasukan dan pengeluaran operasional (Main Office)"
            actions={
                <Button onClick={() => setIsAddOpen(true)} className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" /> Catat Transaksi
                </Button>
            }
        >
            <div className="space-y-6">

                <StatsGrid columns={4}>
                    <StatsCard
                        title="Total Transaksi"
                        value={transactions.length}
                        icon={<History className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Total Masuk"
                        value={`Rp ${transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0).toLocaleString()}`}
                        icon={<ArrowUpCircle className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Total Keluar"
                        value={`Rp ${transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0).toLocaleString()}`}
                        icon={<ArrowDownCircle className="w-5 h-5" />}
                        subtitleType="error"
                    />
                    <StatsCard
                        title="Net"
                        value={`Rp ${(transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) - transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)).toLocaleString()}`}
                        icon={<Wallet className="w-5 h-5" />}
                        subtitleType="info"
                    />
                </StatsGrid>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="daily" className="flex items-center gap-2">
                            <History className="w-4 h-4" />
                            Harian
                        </TabsTrigger>
                        <TabsTrigger value="monthly" className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            Bulanan
                        </TabsTrigger>
                    </TabsList>

                    {/* DAILY TAB */}
                    <TabsContent value="daily" className="mt-6 space-y-6">
                        <Card className="rounded-2xl border-border shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span>Laporan Harian</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Filters & Summary */}
                                <div className="flex flex-wrap gap-4 items-end p-4 rounded-xl bg-muted/30 border">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-xs text-muted-foreground">Pilih Tanggal</Label>
                                        <DateInput
                                            value={selectedDate}
                                            onChange={setSelectedDate}
                                            placeholder="Pilih tanggal"
                                            className="w-[200px]"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-3 flex-1 justify-end">
                                        <div className="px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                            <span className="text-xs text-green-600 block">Total Masuk</span>
                                            <span className="font-bold text-green-700">Rp {dailySummary.income.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                            <span className="text-xs text-red-600 block">Total Keluar</span>
                                            <span className="font-bold text-red-700">Rp {dailySummary.expense.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="px-4 py-2 rounded-lg bg-primary/5 border border-primary/20">
                                            <span className="text-xs text-muted-foreground block">Net Harian</span>
                                            <span className={cn("font-bold", dailySummary.net >= 0 ? "text-primary" : "text-red-600")}>
                                                Rp {dailySummary.net.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <BeautifulTable
                                    data={dailyData}
                                    columns={dailyColumns}
                                    title={`Transaksi (${format(new Date(selectedDate), 'dd MMMM yyyy', { locale: localeId })})`}
                                    hideSelection
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* MONTHLY TAB */}
                    <TabsContent value="monthly" className="mt-6 space-y-6">
                        <Card className="rounded-2xl border-border shadow-sm">
                            <CardHeader>
                                <CardTitle>Laporan Bulanan</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Filters & Summary */}
                                <div className="flex flex-wrap gap-4 items-end p-4 rounded-xl bg-muted/30 border">
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Pilih Bulan</Label>
                                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                            <SelectTrigger className="w-[200px] rounded-xl bg-background">
                                                <SelectValue placeholder="Pilih bulan" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {monthOptions.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value} className="rounded-lg">
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex flex-wrap gap-3 flex-1 justify-end">
                                        <div className="px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                            <span className="text-xs text-green-600 block">Total Masuk</span>
                                            <span className="font-bold text-green-700">Rp {monthlySummary.income.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                            <span className="text-xs text-red-600 block">Total Keluar</span>
                                            <span className="font-bold text-red-700">Rp {monthlySummary.expense.toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="px-4 py-2 rounded-lg bg-primary/5 border border-primary/20">
                                            <span className="text-xs text-muted-foreground block">Net Bulanan</span>
                                            <span className={cn("font-bold", monthlySummary.net >= 0 ? "text-primary" : "text-red-600")}>
                                                Rp {monthlySummary.net.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <BeautifulTable
                                    data={monthlyData}
                                    columns={monthlyColumns}
                                    title={`Ringkasan Harian (${monthOptions.find(o => o.value === selectedMonth)?.label || selectedMonth})`}
                                    hideSelection
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Add Dialog */}
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Catat Transaksi Baru</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            {/* Form fields same as before... */}
                            <div className="grid grid-cols-2 gap-4 p-1 bg-muted rounded-lg">
                                <button
                                    onClick={() => setType('income')}
                                    className={cn(
                                        "flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                        type === 'income' ? "bg-white text-green-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <ArrowUpCircle className="w-4 h-4" /> Pemasukan
                                </button>
                                <button
                                    onClick={() => setType('expense')}
                                    className={cn(
                                        "flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                                        type === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <ArrowDownCircle className="w-4 h-4" /> Pengeluaran
                                </button>
                            </div>

                            <div className="space-y-2">
                                <Label>Tanggal</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP", { locale: localeId }) : <span>Pilih tanggal</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="space-y-2">
                                <Label>Kategori</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Pilih kategori" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Nominal (Rp)</Label>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    min={0}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Keterangan</Label>
                                <Textarea
                                    placeholder="Detail transaksi..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Bukti / Foto (Opsional)</Label>
                                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        <Upload className="w-6 h-6 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                            {file ? file.name : "Klik untuk upload bukti"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
                                <Button onClick={handleSave} disabled={!amount || !category || uploading}>
                                    {uploading ? 'Menyimpan...' : 'Simpan'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation */}
                <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Data transaksi yang dihapus tidak dapat dikembalikan.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Hapus
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </div>
        </MainLayout>
    );
}
