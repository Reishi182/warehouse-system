import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatRupiah } from '@/lib/format';
import {
    ClipboardPenLine,
    Plus,
    Users,
    Wallet,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
} from 'lucide-react';
import { useTabs, useCreateTab } from '@/hooks/useTabs';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerTab, Location, TabStatus } from '@/types';

export default function TabsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('open');
    const [formData, setFormData] = useState({
        customerName: '',
        customerPhone: '',
        stockLocation: 'toko' as Location,
    });

    const { data: tabs = [], isLoading } = useTabs();
    const createTab = useCreateTab();

    const filteredTabs = useMemo(() => {
        if (activeTab === 'all') return tabs;
        return tabs.filter(t => t.status === activeTab);
    }, [tabs, activeTab]);

    const stats = useMemo(() => {
        const open = tabs.filter(t => t.status === 'open');
        const settled = tabs.filter(t => t.status === 'settled');
        const totalOutstanding = open.reduce((acc, t) => acc + t.total_amount, 0);
        return { openCount: open.length, settledCount: settled.length, totalOutstanding };
    }, [tabs]);

    const handleCreate = () => {
        if (!formData.customerName.trim() || !user) return;
        createTab.mutate({
            customerName: formData.customerName.trim(),
            customerPhone: formData.customerPhone.trim() || undefined,
            stockLocation: formData.stockLocation,
            cashierId: user.id,
            cashierName: user.name,
        }, {
            onSuccess: (newTab) => {
                setIsCreateOpen(false);
                setFormData({ customerName: '', customerPhone: '', stockLocation: 'toko' });
                navigate(`/tabs/${newTab.id}`);
            },
        });
    };


    const statusConfig: Record<TabStatus, { label: string; color: string; icon: React.ReactNode }> = {
        open: { label: 'Aktif', color: 'bg-orange-100 text-orange-700', icon: <Clock className="w-3 h-3" /> },
        settled: { label: 'Lunas', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3 h-3" /> },
        cancelled: { label: 'Dibatalkan', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
    };

    const columns: Column<CustomerTab>[] = [
        {
            header: 'No. Tab',
            accessorKey: 'tab_number',
            cell: (item) => <span className="font-mono font-semibold text-primary">{item.tab_number}</span>,
        },
        {
            header: 'Pelanggan',
            accessorKey: 'customer_name',
            cell: (item) => (
                <div>
                    <p className="font-semibold">{item.customer_name}</p>
                    {item.customer_phone && (
                        <p className="text-xs text-muted-foreground">{item.customer_phone}</p>
                    )}
                </div>
            ),
        },
        {
            header: 'Total',
            accessorKey: 'total_amount',
            cell: (item) => (
                <span className={`font-bold ${item.status === 'open' ? 'text-orange-600' : ''}`}>
                    {formatRupiah(item.total_amount)}
                </span>
            ),
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (item) => {
                const config = statusConfig[item.status];
                return (
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                        {config.icon}
                        {config.label}
                    </span>
                );
            },
        },
        {
            header: 'Kasir',
            accessorKey: 'cashier_name',
            cell: (item) => <span className="text-sm">{item.cashier_name}</span>,
        },
        {
            header: 'Dibuat',
            accessorKey: 'created_at',
            cell: (item) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(item.created_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                </span>
            ),
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (item) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/tabs/${item.id}`)}
                    className="gap-1"
                >
                    <Eye className="w-4 h-4" />
                    Detail
                </Button>
            ),
        },
    ];

    if (isLoading) {
        return (
            <MainLayout title="Nota Gantung" subtitle="Kelola tab pelanggan">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Nota Gantung (Tab)"
            subtitle="Kelola transaksi tertunda pelanggan"
            actions={
                <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Buat Tab Baru
                </Button>
            }
        >
            <div className="space-y-6">
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Tab Aktif"
                        value={stats.openCount}
                        icon={<ClipboardPenLine className="w-5 h-5" />}
                        className="border-l-4 border-l-orange-500"
                    />
                    <StatsCard
                        title="Total Outstanding"
                        value={formatRupiah(stats.totalOutstanding)}
                        icon={<Wallet className="w-5 h-5" />}
                        className="border-l-4 border-l-red-500"
                    />
                    <StatsCard
                        title="Tab Lunas"
                        value={stats.settledCount}
                        icon={<CheckCircle2 className="w-5 h-5" />}
                        className="border-l-4 border-l-green-500"
                    />
                </StatsGrid>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="open">Aktif ({stats.openCount})</TabsTrigger>
                        <TabsTrigger value="settled">Lunas ({stats.settledCount})</TabsTrigger>
                        <TabsTrigger value="cancelled">Dibatalkan</TabsTrigger>
                        <TabsTrigger value="all">Semua</TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab}>
                        <BeautifulTable
                            data={filteredTabs}
                            columns={columns}
                            title="Daftar Tab"
                            isLoading={isLoading}
                            hideSelection
                            hideExport
                            emptyState={{
                                icon: <ClipboardPenLine className="w-10 h-10" />,
                                title: "Belum Ada Tab",
                                description: "Buat tab baru untuk pelanggan yang ingin bayar nanti.",
                                actionLabel: "Buat Tab Baru",
                                onAction: () => setIsCreateOpen(true),
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Create Tab Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Buat Tab Baru</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nama Pelanggan *</Label>
                            <Input
                                className="rounded-xl h-11"
                                value={formData.customerName}
                                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                                placeholder="Masukkan nama pelanggan"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>No. Telepon (Opsional)</Label>
                            <Input
                                className="rounded-xl h-11"
                                value={formData.customerPhone}
                                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                placeholder="08xx..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Lokasi Stok</Label>
                            <RadioGroup
                                value={formData.stockLocation}
                                onValueChange={(v) => setFormData({ ...formData, stockLocation: v as Location })}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="toko" id="toko" />
                                    <Label htmlFor="toko" className="font-normal cursor-pointer">Toko</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="gudang" id="gudang" />
                                    <Label htmlFor="gudang" className="font-normal cursor-pointer">Gudang</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">
                            Batal
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!formData.customerName.trim() || createTab.isPending}
                            className="rounded-xl"
                        >
                            {createTab.isPending ? 'Membuat...' : 'Buat Tab'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
