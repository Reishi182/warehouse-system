import { useState, useMemo, useCallback } from 'react';
import {
    ClipboardCheck, Package, Warehouse, Store, Plus, Trash2,
    AlertTriangle, Loader2, ScanBarcode,
    Send, Clock, History, TrendingUp, TrendingDown, Minus,
    Eye, AlertCircle,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DateInput } from '@/components/common/DatePicker';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useProductUnits, unitsToSelectOptions } from '@/hooks/useProductUnits';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import {
    useSubmitStockOpnameSession,
    useStockOpnameSessions,
    useStockOpnameRealtime,
    generateSessionNumber,
    OpnameSessionPayload,
} from '@/hooks/useStockOpnameSessions';
import { StockOpnameProductPicker } from '@/components/products/StockOpnameProductPicker';
import { QuickImageUpload } from '@/components/products/QuickImageUpload';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { StockOpnameSession } from '@/types';

interface OpnameItem {
    product: Product;
    physicalGudang: number;
    physicalToko: number;
    mainGudang: number;
    subGudang: number;
    mainToko: number;
    subToko: number;
    note: string;
    adHocMultiUnit?: boolean;
    adHocMultiplier?: number;
    adHocMainLabel?: string;
    adHocSubLabel?: string;
}

function formatMultiUnitStock(
    stock: number,
    pcsPerBox: number | null | undefined,
    mainUnit: string | null | undefined,
    subUnit: string | null | undefined,
): string {
    const mainLabel = (mainUnit || 'box').toUpperCase();
    const subLabel = (subUnit || 'pcs').toUpperCase();
    if (!pcsPerBox || pcsPerBox <= 0) return `${stock} ${subLabel}`;
    const mainCount = Math.floor(stock / pcsPerBox);
    const remainder = parseFloat((stock % pcsPerBox).toFixed(2));
    if (mainCount === 0) return `${remainder} ${subLabel}`;
    if (remainder === 0) return `${mainCount} ${mainLabel}`;
    return `${mainCount} ${mainLabel} ${remainder} ${subLabel}`;
}

function formatDiff(diff: number, unit?: string): string {
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff}${unit ? ` ${unit}` : ''}`;
}

// ─── Diff badge ──────────────────────────────────────────────
function DiffBadge({ diff }: { diff: number }) {
    if (diff === 0) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
            <Minus className="w-3 h-3" />0
        </span>
    );
    if (diff > 0) return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <TrendingUp className="w-3 h-3" />{formatDiff(diff)}
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <TrendingDown className="w-3 h-3" />{formatDiff(diff)}
        </span>
    );
}

// ─── Status badge ─────────────────────────────────────────────
function StatusBadgeSession({ status }: { status: string }) {
    const map: Record<string, { label: string; className: string }> = {
        pending_approval: { label: 'Menunggu', className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400' },
        approved: { label: 'Disetujui', className: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400' },
        rejected: { label: 'Ditolak', className: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400' },
        draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 border-gray-300' },
        completed: { label: 'Selesai', className: 'bg-blue-100 text-blue-700 border-blue-300' },
    };
    const cfg = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-600' };
    return (
        <span className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-full border', cfg.className)}>
            {cfg.label}
        </span>
    );
}

// ─── Session detail dialog ─────────────────────────────────────
function SessionDetailDialog({
    session,
    open,
    onClose,
}: {
    session: StockOpnameSession | null;
    open: boolean;
    onClose: () => void;
}) {
    if (!session) return null;
    const items = session.items || [];
    const isRejected = session.status === 'rejected';
    const isApproved = session.status === 'approved';

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardCheck className="w-5 h-5" />
                        <span className="font-mono">{session.session_number}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground border-b pb-3">
                    <StatusBadgeSession status={session.status} />
                    <span>·</span>
                    <span>Diajukan oleh <strong className="text-foreground">{session.created_by_name}</strong></span>
                    <span>·</span>
                    <span>{format(new Date(session.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}</span>
                    {isApproved && session.approved_by_name && (
                        <>
                            <span>·</span>
                            <span className="text-emerald-600 font-medium">✓ Disetujui oleh {session.approved_by_name}</span>
                        </>
                    )}
                </div>

                {isRejected && session.rejected_reason && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div><span className="font-semibold">Alasan Penolakan: </span>{session.rejected_reason}</div>
                    </div>
                )}

                {items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">Tidak ada item dalam sesi ini.</div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/60 border-b text-xs uppercase tracking-wider text-muted-foreground">
                                    <th className="text-left px-4 py-3 font-semibold">Produk</th>
                                    <th className="text-center px-3 py-3 font-semibold">Lokasi</th>
                                    <th className="text-center px-3 py-3 font-semibold">Sistem</th>
                                    <th className="text-center px-3 py-3 font-semibold">Fisik</th>
                                    <th className="text-center px-3 py-3 font-semibold">Selisih</th>
                                    <th className="text-left px-4 py-3 font-semibold">Catatan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {items.map((item, idx) => (
                                    <tr key={item.id} className={cn(
                                        "transition-colors hover:bg-muted/30",
                                        idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                                    )}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Package className="w-3.5 h-3.5 text-primary" />
                                                </div>
                                                <span className="font-medium line-clamp-1">
                                                    {(item as any).product?.name ?? item.product_id.slice(0, 8)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <Badge variant="outline" className="text-[10px] uppercase font-bold">{item.location}</Badge>
                                        </td>
                                        <td className="px-3 py-3 text-center font-mono tabular-nums">{item.system_stock}</td>
                                        <td className="px-3 py-3 text-center font-mono tabular-nums font-semibold">{item.actual_stock}</td>
                                        <td className="px-3 py-3 text-center"><DiffBadge diff={item.difference} /></td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground italic">
                                            {item.note ? `"${item.note}"` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Tutup</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

type Tab = 'new' | 'history';

export default function StockOpname() {
    const { products } = useData();
    const { user, profile } = useAuth();
    const { toast } = useToast();
    const { data: unitsData } = useProductUnits();
    const SELL_UNITS = unitsToSelectOptions(unitsData || []);

    const [tab, setTab] = useState<Tab>('new');
    const [searchQuery, setSearchQuery] = useState('');
    const [opnameItems, setOpnameItems] = useState<OpnameItem[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const [lastSessionNumber, setLastSessionNumber] = useState('');
    const [opnameDate, setOpnameDate] = useState<string>(
        new Date().toLocaleDateString('en-CA')
    );
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [detailSession, setDetailSession] = useState<StockOpnameSession | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const submitSession = useSubmitStockOpnameSession();
    const { data: sessions, isLoading: sessionsLoading } = useStockOpnameSessions();

    // Real-time: auto-refresh when session status changes (e.g. approved by main office)
    useStockOpnameRealtime();

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        const addedIds = new Set(opnameItems.map(i => i.product.id));
        return products
            .filter(p => !addedIds.has(p.id))
            .filter(p => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q))
            .slice(0, 8);
    }, [searchQuery, products, opnameItems]);

    const getUnitLabels = useCallback((product: Product) => {
        const mainLabel = SELL_UNITS.find(u => u.value === product.main_unit)?.label ?? (product.main_unit || 'BOX').toUpperCase();
        const subLabel = SELL_UNITS.find(u => u.value === product.sell_unit)?.label ?? (product.sell_unit || 'PCS').toUpperCase();
        return { mainLabel, subLabel };
    }, [SELL_UNITS]);

    const addProduct = useCallback((product: Product) => {
        const isMulti = product.has_multi_unit && product.pcs_per_box;
        const ppb = product.pcs_per_box || 1;
        setOpnameItems(prev => [
            ...prev,
            {
                product,
                physicalGudang: product.stock.gudang,
                physicalToko: product.stock.toko,
                mainGudang: isMulti ? Math.floor(product.stock.gudang / ppb) : 0,
                subGudang: isMulti ? parseFloat((product.stock.gudang % ppb).toFixed(2)) : product.stock.gudang,
                mainToko: isMulti ? Math.floor(product.stock.toko / ppb) : 0,
                subToko: isMulti ? parseFloat((product.stock.toko % ppb).toFixed(2)) : product.stock.toko,
                note: '',
            },
        ]);
        setSearchQuery('');
    }, []);

    const removeItem = useCallback((productId: string) => {
        setOpnameItems(prev => prev.filter(i => i.product.id !== productId));
    }, []);

    const updateItem = useCallback((productId: string, field: keyof OpnameItem, value: any) => {
        setOpnameItems(prev => prev.map(item => {
            if (item.product.id !== productId) return item;
            const updated = { ...item, [field]: value };
            const isMulti = (updated.product.has_multi_unit && updated.product.pcs_per_box) || (updated.adHocMultiUnit && updated.adHocMultiplier && Number(updated.adHocMultiplier) > 0);
            const ppb = isMulti ? (updated.adHocMultiUnit ? (updated.adHocMultiplier || 1) : (updated.product.pcs_per_box || 1)) : 1;
            if (isMulti) {
                if (field === 'mainGudang' || field === 'subGudang')
                    updated.physicalGudang = (updated.mainGudang * ppb) + updated.subGudang;
                if (field === 'mainToko' || field === 'subToko')
                    updated.physicalToko = (updated.mainToko * ppb) + updated.subToko;
            } else {
                if (field === 'subGudang') updated.physicalGudang = value;
                if (field === 'subToko') updated.physicalToko = value;
            }
            return updated;
        }));
    }, []);

    const handleBarcodeScan = useCallback((barcode: string) => {
        const product = products.find(p => p.barcode === barcode);
        if (!product) {
            toast({ title: 'Produk tidak ditemukan', description: `Barcode: ${barcode}`, variant: 'destructive' });
            return;
        }
        if (opnameItems.some(i => i.product.id === product.id)) {
            toast({ title: 'Sudah ditambahkan', description: product.name });
            return;
        }
        addProduct(product);
        toast({ title: 'Produk ditambahkan', description: product.name });
    }, [products, opnameItems, addProduct, toast]);

    const stats = useMemo(() => {
        let totalDiffGudang = 0, totalDiffToko = 0, itemsWithDiff = 0;
        opnameItems.forEach(item => {
            const dg = item.physicalGudang - item.product.stock.gudang;
            const dt = item.physicalToko - item.product.stock.toko;
            totalDiffGudang += dg;
            totalDiffToko += dt;
            if (dg !== 0 || dt !== 0) itemsWithDiff++;
        });
        return { totalDiffGudang, totalDiffToko, itemsWithDiff, totalItems: opnameItems.length };
    }, [opnameItems]);

    const handleSubmit = async () => {
        if (!user || !profile || opnameItems.length === 0) return;
        const changedItems = opnameItems.filter(item => {
            const dg = item.physicalGudang - item.product.stock.gudang;
            const dt = item.physicalToko - item.product.stock.toko;
            return dg !== 0 || dt !== 0;
        });
        if (changedItems.length === 0) {
            toast({ title: 'Tidak ada perubahan', description: 'Semua stok fisik sama dengan sistem', variant: 'destructive' });
            return;
        }
        const sessionNumber = generateSessionNumber();
        let isoDate = new Date().toISOString();
        if (opnameDate) {
            const nowTime = new Date().toISOString().split('T')[1];
            isoDate = new Date(`${opnameDate}T${nowTime}`).toISOString();
        }
        const payload: OpnameSessionPayload = {
            sessionNumber, location: 'both', opnameDate: isoDate,
            createdBy: user.id, createdByName: profile.name,
            items: changedItems.map(item => {
                const isMulti = (item.product.has_multi_unit && item.product.pcs_per_box) || (item.adHocMultiUnit && item.adHocMultiplier && item.adHocMultiplier > 0);
                return {
                    productId: item.product.id,
                    systemStockGudang: item.product.stock.gudang,
                    systemStockToko: item.product.stock.toko,
                    actualStockGudang: item.physicalGudang,
                    actualStockToko: item.physicalToko,
                    unitUsed: item.product.sell_unit ?? undefined,
                    mainUnitCountGudang: isMulti ? item.mainGudang : undefined,
                    subUnitCountGudang: isMulti ? item.subGudang : undefined,
                    mainUnitCountToko: isMulti ? item.mainToko : undefined,
                    subUnitCountToko: isMulti ? item.subToko : undefined,
                    note: item.note || undefined,
                };
            }),
            adHocProductUpdates: opnameItems
                .filter(item => item.adHocMultiUnit && item.adHocMultiplier && item.adHocMultiplier > 0)
                .map(item => ({
                    productId: item.product.id,
                    mainUnit: (item.adHocMainLabel || 'DUS').toLowerCase(),
                    subUnit: (item.adHocSubLabel || item.product.sell_unit || 'PCS').toLowerCase(),
                    pcsPerBox: item.adHocMultiplier!
                }))
        };
        try {
            await submitSession.mutateAsync(payload);
            setLastSessionNumber(sessionNumber);
            setSubmitted(true);
        } catch { }
    };

    const handleReset = () => {
        setOpnameItems([]);
        setSubmitted(false);
        setLastSessionNumber('');
    };

    // ─── BeautifulTable columns for session history ─────────
    const historyColumns: Column<StockOpnameSession>[] = [
        {
            header: 'No. Sesi',
            accessorKey: 'session_number',
            cell: (s) => <span className="font-mono font-bold text-sm">{s.session_number}</span>,
        },
        {
            header: 'Status',
            accessorKey: 'status',
            filterable: true,
            filterOptions: [
                { label: 'Menunggu', value: 'pending_approval' },
                { label: 'Disetujui', value: 'approved' },
                { label: 'Ditolak', value: 'rejected' },
            ],
            cell: (s) => <StatusBadgeSession status={s.status} />,
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            cell: (s) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(s.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                </span>
            ),
        },
        {
            header: 'Diajukan Oleh',
            accessorKey: 'created_by_name',
            cell: (s) => <span className="text-sm">{s.created_by_name}</span>,
        },
        {
            header: 'Disetujui Oleh',
            accessorKey: 'approved_by_name',
            cell: (s) => <span className="text-sm">{s.approved_by_name || '—'}</span>,
        },
        {
            header: 'Item',
            filterable: false,
            cell: (s) => (
                <Badge variant="secondary" className="text-xs">
                    <Package className="w-3 h-3 mr-1" />
                    {s.items?.length || 0}
                </Badge>
            ),
        },
        {
            header: 'Alasan Tolak',
            accessorKey: 'rejected_reason',
            filterable: false,
            cell: (s) => s.rejected_reason ? (
                <div className="flex items-start gap-1 text-xs text-red-600 dark:text-red-400 max-w-[180px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{s.rejected_reason}</span>
                </div>
            ) : <span className="text-xs text-muted-foreground">—</span>,
        },
        {
            header: 'Aksi',
            filterable: false,
            cell: (s) => (
                <Button
                    variant="ghost" size="sm"
                    className="gap-1.5 h-8 text-xs"
                    onClick={() => { setDetailSession(s); setDetailOpen(true); }}
                >
                    <Eye className="w-3.5 h-3.5" /> Detail
                </Button>
            ),
        },
    ];

    // ── Success screen ───────────────────────────────────────────
    if (submitted) {
        return (
            <MainLayout title="Stok Opname" subtitle="Pengecekan dan penyesuaian stok">
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 shadow-xl shadow-amber-200 dark:shadow-amber-900/30">
                        <Clock className="w-12 h-12 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Opname Diajukan!</h2>
                    <p className="text-muted-foreground mb-1">
                        Sesi <strong className="font-mono">{lastSessionNumber}</strong> telah dikirim ke Main Office.
                    </p>
                    <p className="text-sm text-muted-foreground mb-8">
                        Stok akan disesuaikan setelah mendapat persetujuan.
                    </p>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => { setTab('history'); setSubmitted(false); setOpnameItems([]); }} className="rounded-xl">
                            <History className="w-4 h-4 mr-2" /> Lihat Riwayat
                        </Button>
                        <Button onClick={handleReset} className="rounded-xl">
                            <ClipboardCheck className="w-4 h-4 mr-2" /> Opname Baru
                        </Button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout title="Stok Opname" subtitle="Hitung stok fisik dan sesuaikan dengan sistem">
            <div className="space-y-6">

                {/* ─── Tab switcher ─── */}
                <div className="flex justify-between items-center border-b">
                    <div className="flex gap-1">
                        {([
                            { key: 'new', icon: ClipboardCheck, label: 'Input Opname' },
                            { key: 'history', icon: History, label: 'Riwayat Sesi' },
                        ] as const).map(({ key, icon: Icon, label }) => (
                            <button
                                key={key}
                                onClick={() => setTab(key)}
                                className={cn(
                                    'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all',
                                    tab === key
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                                {key === 'history' && (sessions?.filter(s => s.status === 'pending_approval').length ?? 0) > 0 && (
                                    <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                        {sessions!.filter(s => s.status === 'pending_approval').length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ══════════════════════════════════════════
                    TAB: Input Opname
                ══════════════════════════════════════════ */}
                {tab === 'new' && (
                    <>
                        {/* Stats */}
                        <StatsGrid columns={4}>
                            <StatsCard title="Produk Dicek" value={stats.totalItems} icon={<Package className="w-5 h-5" />} gradient="blue" animationDelay={0} />
                            <StatsCard
                                title="Ada Selisih"
                                value={stats.itemsWithDiff}
                                icon={<AlertTriangle className="w-5 h-5" />}
                                subtitle={stats.itemsWithDiff > 0 ? 'perlu disesuaikan' : undefined}
                                subtitleType="warning"
                                gradient="orange"
                                animationDelay={100}
                            />
                            <StatsCard title="Selisih Gudang" value={formatDiff(stats.totalDiffGudang)} icon={<Warehouse className="w-5 h-5" />} gradient="amber" animationDelay={200} />
                            <StatsCard title="Selisih Toko" value={formatDiff(stats.totalDiffToko)} icon={<Store className="w-5 h-5" />} gradient="emerald" animationDelay={300} />
                        </StatsGrid>

                        {/* Info banner */}
                        <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-xl text-sm text-blue-700 dark:text-blue-400">
                            <Send className="w-4 h-4 shrink-0" />
                            <span>Setelah disimpan, laporan opname akan dikirim ke <strong>Main Office</strong> untuk persetujuan sebelum stok diubah.</span>
                        </div>

                        {/* Date + picker */}
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 space-y-1.5">
                                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tanggal Opname</Label>
                                <DateInput
                                    value={opnameDate}
                                    onChange={setOpnameDate}
                                    className="flex-1"
                                />
                            </div>
                            <div className="flex-1 flex items-end">
                                <Button
                                    className="w-full h-11 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shadow-sm"
                                    variant="outline"
                                    onClick={() => setIsPickerOpen(true)}
                                >
                                    <Plus className="w-5 h-5 mr-2" />
                                    Pilih Produk dari Daftar
                                </Button>
                            </div>
                        </div>

                        <StockOpnameProductPicker
                            open={isPickerOpen}
                            onOpenChange={setIsPickerOpen}
                            products={products}
                            onConfirm={(selectedProducts) => {
                                selectedProducts.forEach(addProduct);
                                toast({ title: `${selectedProducts.length} Produk Ditambahkan`, description: "Silakan sesuaikan kuantitas fisik di bawah." });
                            }}
                            alreadyAddedIds={opnameItems.map(i => i.product.id)}
                        />

                        {/* Barcode scanner */}
                        <div className="relative">
                            <BarcodeScanner
                                onScan={handleBarcodeScan}
                                placeholder="Atau scan barcode produk untuk ditambahkan cepat..."
                                className="w-full"
                            />
                            {searchQuery.trim() && searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-card border rounded-xl shadow-xl max-h-80 overflow-y-auto">
                                    {searchResults.map(product => {
                                        const isMulti = product.has_multi_unit && product.pcs_per_box;
                                        const { mainLabel, subLabel } = getUnitLabels(product);
                                        return (
                                            <button
                                                key={product.id}
                                                onClick={() => addProduct(product)}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-muted/50 overflow-hidden shrink-0">
                                                    {product.image_url
                                                        ? <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                                                        : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/30" /></div>
                                                    }
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{product.name}</p>
                                                    <p className="text-xs text-muted-foreground">{product.barcode}</p>
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground shrink-0">
                                                    <p>G: {isMulti ? formatMultiUnitStock(product.stock.gudang, product.pcs_per_box, product.main_unit, product.sell_unit) : product.stock.gudang}</p>
                                                    <p>T: {isMulti ? formatMultiUnitStock(product.stock.toko, product.pcs_per_box, product.main_unit, product.sell_unit) : product.stock.toko}</p>
                                                </div>
                                                <Plus className="w-4 h-4 text-primary shrink-0" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Opname product list */}
                        {opnameItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl text-muted-foreground">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <ScanBarcode className="w-8 h-8 opacity-30" />
                                </div>
                                <p className="font-medium">Belum ada produk</p>
                                <p className="text-sm mt-1">Scan barcode atau pilih produk dari daftar untuk memulai opname</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {opnameItems.map((item) => {
                                    const { product } = item;
                                    const isMulti = (product.has_multi_unit && product.pcs_per_box) || (item.adHocMultiUnit && item.adHocMultiplier && Number(item.adHocMultiplier) > 0);
                                    const ppb = isMulti ? (item.adHocMultiUnit ? (item.adHocMultiplier || 1) : (product.pcs_per_box || 1)) : 1;
                                    const { mainLabel: defaultMainLabel, subLabel: defaultSubLabel } = getUnitLabels(product);
                                    const mainLabel = item.adHocMultiUnit ? (item.adHocMainLabel || 'DUS').toUpperCase() : defaultMainLabel;
                                    const subLabel = item.adHocMultiUnit ? (item.adHocSubLabel || defaultSubLabel).toUpperCase() : defaultSubLabel;
                                    const diffGudang = parseFloat((item.physicalGudang - product.stock.gudang).toFixed(2));
                                    const diffToko = parseFloat((item.physicalToko - product.stock.toko).toFixed(2));
                                    const hasDiff = diffGudang !== 0 || diffToko !== 0;

                                    return (
                                        <div
                                            key={product.id}
                                            className={cn(
                                                'rounded-2xl border bg-card p-4 transition-all shadow-sm',
                                                hasDiff
                                                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/10'
                                                    : 'border-border'
                                            )}
                                        >
                                            {/* Product header */}
                                            <div className="flex items-start gap-3 mb-4">
                                                <QuickImageUpload 
                                                    productId={product.id} 
                                                    currentUrl={product.image_url} 
                                                    className="w-12 h-12 shrink-0 rounded-xl border" 
                                                    onUploadSuccess={(url) => {
                                                        updateItem(product.id, 'product', { ...product, image_url: url });
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-sm truncate">{product.name}</h4>
                                                    <p className="text-xs text-muted-foreground font-mono mb-1">{product.barcode}</p>
                                                    {isMulti && (
                                                        <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 border-blue-200">
                                                            📦 1 {mainLabel} = {ppb} {subLabel}
                                                        </Badge>
                                                    )}
                                                    {!(product.has_multi_unit && product.pcs_per_box) && !item.adHocMultiUnit && (
                                                        <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-primary mt-1" onClick={() => updateItem(product.id, 'adHocMultiUnit', true)}>
                                                            + Gunakan Konversi (Mis: 1 Dus = 12 Pcs)
                                                        </Button>
                                                    )}
                                                    {item.adHocMultiUnit && (
                                                        <div className="flex items-center gap-2 mt-2 bg-blue-50/50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-800">
                                                            <span className="text-xs font-medium">1</span>
                                                            <Select
                                                                value={item.adHocMainLabel || 'DUS'}
                                                                onValueChange={v => updateItem(product.id, 'adHocMainLabel', v)}
                                                            >
                                                                <SelectTrigger className="h-7 text-xs min-w-[80px] border-blue-200">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {SELL_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                            <span className="text-xs font-medium">=</span>
                                                            <Input type="number" min={1} value={item.adHocMultiplier || ''} onChange={e => updateItem(product.id, 'adHocMultiplier', parseFloat(e.target.value) || 0)} placeholder="Mis: 12" className="h-7 text-xs w-[100px]" />
                                                            <Select
                                                                value={item.adHocSubLabel || defaultSubLabel.toLowerCase()}
                                                                onValueChange={v => updateItem(product.id, 'adHocSubLabel', v)}
                                                            >
                                                                <SelectTrigger className="h-7 text-xs min-w-[80px] border-blue-200">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {SELL_UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-red-50 shrink-0" onClick={() => removeItem(product.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            {/* Stock input grid */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {/* GUDANG */}
                                                <div className="space-y-2 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                                            <Warehouse className="w-3.5 h-3.5" /> Gudang
                                                        </Label>
                                                        <span className="text-xs text-muted-foreground">
                                                            Sistem: <strong>{isMulti ? formatMultiUnitStock(product.stock.gudang, ppb, mainLabel, product.sell_unit) : product.stock.gudang}</strong>
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] text-muted-foreground uppercase">Stok Fisik</Label>
                                                        {isMulti ? (
                                                            <div className="flex gap-2 items-center">
                                                                <div className="flex-1 space-y-0.5">
                                                                    <Input type="number" min={0} step="any" value={item.mainGudang || ''} onChange={e => updateItem(product.id, 'mainGudang', parseFloat(e.target.value) || 0)} className="h-9 text-center font-bold" placeholder="0" />
                                                                    <p className="text-[10px] text-center text-muted-foreground">{mainLabel}</p>
                                                                </div>
                                                                <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                                                                <div className="flex-1 space-y-0.5">
                                                                    <Input type="number" min={0} step="any" value={item.subGudang || ''} onChange={e => updateItem(product.id, 'subGudang', parseFloat(e.target.value) || 0)} className="h-9 text-center" placeholder="0" />
                                                                    <p className="text-[10px] text-center text-muted-foreground">{subLabel}</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Input type="number" min={0} step="any" value={item.subGudang || ''} onChange={e => updateItem(product.id, 'subGudang', parseFloat(e.target.value) || 0)} className="h-9" placeholder="Jumlah fisik" />
                                                        )}
                                                    </div>
                                                    {diffGudang !== 0 ? (
                                                        <div className={cn('text-xs font-bold px-2 py-1 rounded-md text-center', diffGudang > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                                                            Selisih: {formatDiff(diffGudang)} {isMulti ? subLabel : ''}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-emerald-600 text-center font-medium">✓ Sesuai</div>
                                                    )}
                                                </div>

                                                {/* TOKO */}
                                                <div className="space-y-2 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                                            <Store className="w-3.5 h-3.5" /> Toko
                                                        </Label>
                                                        <span className="text-xs text-muted-foreground">
                                                            Sistem: <strong>{isMulti ? formatMultiUnitStock(product.stock.toko, ppb, mainLabel, product.sell_unit) : product.stock.toko}</strong>
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[10px] text-muted-foreground uppercase">Stok Fisik</Label>
                                                        {isMulti ? (
                                                            <div className="flex gap-2 items-center">
                                                                <div className="flex-1 space-y-0.5">
                                                                    <Input type="number" min={0} step="any" value={item.mainToko || ''} onChange={e => updateItem(product.id, 'mainToko', parseFloat(e.target.value) || 0)} className="h-9 text-center font-bold" placeholder="0" />
                                                                    <p className="text-[10px] text-center text-muted-foreground">{mainLabel}</p>
                                                                </div>
                                                                <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                                                                <div className="flex-1 space-y-0.5">
                                                                    <Input type="number" min={0} step="any" value={item.subToko || ''} onChange={e => updateItem(product.id, 'subToko', parseFloat(e.target.value) || 0)} className="h-9 text-center" placeholder="0" />
                                                                    <p className="text-[10px] text-center text-muted-foreground">{subLabel}</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Input type="number" min={0} step="any" value={item.subToko || ''} onChange={e => updateItem(product.id, 'subToko', parseFloat(e.target.value) || 0)} className="h-9" placeholder="Jumlah fisik" />
                                                        )}
                                                    </div>
                                                    {diffToko !== 0 ? (
                                                        <div className={cn('text-xs font-bold px-2 py-1 rounded-md text-center', diffToko > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>
                                                            Selisih: {formatDiff(diffToko)} {isMulti ? subLabel : ''}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-emerald-600 text-center font-medium">✓ Sesuai</div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Multi-unit total */}
                                            {isMulti && (
                                                <div className="mt-2 p-2 px-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900 flex justify-between items-center text-xs">
                                                    <span className="text-blue-600 font-medium italic">Total Konversi Fisik:</span>
                                                    <div className="flex gap-4">
                                                        <span>Gudang: <strong>{item.physicalGudang} {subLabel}</strong></span>
                                                        <span>Toko: <strong>{item.physicalToko} {subLabel}</strong></span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Note */}
                                            <div className="mt-3">
                                                <Textarea
                                                    value={item.note}
                                                    onChange={e => updateItem(product.id, 'note', e.target.value)}
                                                    placeholder="Catatan (opsional) — misal: rusak, hilang, salah input..."
                                                    className="resize-none h-16 text-xs rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Submit bar */}
                        {opnameItems.length > 0 && (
                            <div className="sticky bottom-0 z-30 bg-background/95 backdrop-blur-sm border-t pt-4 pb-6 -mx-4 px-4 sm:-mx-6 sm:px-6">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-sm text-muted-foreground">
                                        <strong>{stats.totalItems}</strong> produk dicek
                                        {stats.itemsWithDiff > 0 && (
                                            <span className="text-amber-600 dark:text-amber-400 ml-2">
                                                • <strong>{stats.itemsWithDiff}</strong> ada selisih
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="outline" onClick={handleReset} className="rounded-xl">Reset</Button>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={submitSession.isPending || stats.itemsWithDiff === 0}
                                            className="rounded-xl min-w-[220px]"
                                        >
                                            {submitSession.isPending ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mengirim...</>
                                            ) : (
                                                <><Send className="w-4 h-4 mr-2" />Ajukan ke Main Office ({stats.itemsWithDiff})</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ══════════════════════════════════════════
                    TAB: Riwayat Sesi — BeautifulTable
                ══════════════════════════════════════════ */}
                {tab === 'history' && (
                    <BeautifulTable<StockOpnameSession>
                        data={sessions || []}
                        columns={historyColumns}
                        title="Riwayat Sesi Opname"
                        subtitle="Semua sesi stok opname yang telah diajukan"
                        isLoading={sessionsLoading}
                        hideSelection
                        hideExport={false}
                        exportFilename="riwayat-opname"
                        exportTitle="Riwayat Sesi Stok Opname"
                        emptyState={{
                            icon: <History className="w-7 h-7" />,
                            title: 'Belum ada riwayat',
                            description: 'Sesi stok opname yang telah diajukan akan muncul di sini.',
                        }}
                    />
                )}
            </div>

            {/* Session detail dialog */}
            <SessionDetailDialog
                session={detailSession}
                open={detailOpen}
                onClose={() => { setDetailOpen(false); setDetailSession(null); }}
            />
        </MainLayout>
    );
}
