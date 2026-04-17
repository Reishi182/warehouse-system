import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStockOpnameSessions, useStockOpnameRealtime } from '@/hooks/useStockOpnameSessions';
import MainLayout from '@/components/layout/MainLayout';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
;
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Check,
    X,
    ClipboardCheck,
    History,
    Eye,
    AlertCircle,
    Package,
    TrendingUp,
    TrendingDown,
    Minus,
    CheckCheck,
    XCircle,
    Loader2,
    FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { StockOpnameSession } from '@/types';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import PageSkeleton from '@/components/common/PageSkeleton';
import { useToast } from '@/hooks/use-toast';

// ─── Helpers ────────────────────────────────────────────────────

function formatDiff(diff: number): string {
    const sign = diff > 0 ? '+' : '';
    return `${sign}${diff}`;
}

function DiffBadge({ diff }: { diff: number }) {
    if (diff === 0) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                <Minus className="w-3 h-3" />0
            </span>
        );
    }
    if (diff > 0) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <TrendingUp className="w-3 h-3" />
                {formatDiff(diff)}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <TrendingDown className="w-3 h-3" />
            {formatDiff(diff)}
        </span>
    );
}

// ─── Approval Detail Dialog (per-item approve/reject) ───────────

function ApprovalDetailDialog({
    session,
    open,
    onClose,
}: {
    session: StockOpnameSession | null;
    open: boolean;
    onClose: () => void;
}) {
    const { user, profile } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const items = session?.items || [];

    // Track per-item decisions: 'approved' | 'rejected' | undefined (pending)
    const [decisions, setDecisions] = useState<Record<string, 'approved' | 'rejected'>>({});
    const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [showRejectInput, setShowRejectInput] = useState<string | null>(null);
    const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
    const [bulkRejectReason, setBulkRejectReason] = useState('');

    // Reset state when session changes
    useEffect(() => {
        if (session) {
            setDecisions({});
            setRejectReasons({});
            setShowRejectInput(null);
            setBulkRejectOpen(false);
            setBulkRejectReason('');
        }
    }, [session?.id]);

    if (!session) return null;

    const approvedCount = Object.values(decisions).filter(d => d === 'approved').length;
    const rejectedCount = Object.values(decisions).filter(d => d === 'rejected').length;
    const pendingCount = items.length - approvedCount - rejectedCount;

    const handleItemApprove = (itemId: string) => {
        setDecisions(prev => ({ ...prev, [itemId]: 'approved' }));
        setShowRejectInput(null);
    };

    const handleItemReject = (itemId: string, reason?: string) => {
        if (!reason && !rejectReasons[itemId]) {
            setShowRejectInput(itemId);
            return;
        }
        if (reason) {
            setRejectReasons(prev => ({ ...prev, [itemId]: reason }));
        }
        setDecisions(prev => ({ ...prev, [itemId]: 'rejected' }));
        setShowRejectInput(null);
    };

    const handleApproveAll = () => {
        const all: Record<string, 'approved'> = {};
        items.forEach(item => { all[item.id] = 'approved'; });
        setDecisions(all);
        setShowRejectInput(null);
    };

    const handleRejectAll = () => {
        setBulkRejectOpen(true);
    };

    const confirmBulkReject = () => {
        if (!bulkRejectReason.trim()) return;
        const all: Record<string, 'rejected'> = {};
        const allReasons: Record<string, string> = {};
        items.forEach(item => {
            all[item.id] = 'rejected';
            allReasons[item.id] = bulkRejectReason;
        });
        setDecisions(all);
        setRejectReasons(allReasons);
        setBulkRejectOpen(false);
    };

    const handleSubmitDecisions = async () => {
        if (!user || !profile || pendingCount > 0) return;
        setProcessing(true);
        try {
            const approvedItems = items.filter(item => decisions[item.id] === 'approved');
            const rejectedItems = items.filter(item => decisions[item.id] === 'rejected');

            // Apply stock adjustments for approved items
            for (const item of approvedItems) {
                const location = (item as any).location || 'gudang';
                const stockField = location === 'gudang' ? 'stock_gudang' : 'stock_toko';

                const { data: freshProduct, error: freshErr } = await supabase
                    .from('products')
                    .select(`id, ${stockField}`)
                    .eq('id', item.product_id)
                    .single();

                if (freshErr) throw freshErr;

                const currentStock = (freshProduct as any)?.[stockField] ?? 0;
                const newStock = Math.max(0, currentStock + item.difference);

                const { error: updateErr } = await supabase
                    .from('products')
                    .update({ [stockField]: newStock } as any)
                    .eq('id', item.product_id);

                if (updateErr) throw updateErr;

                // Log adjustment
                await supabase.from('stock_logs').insert({
                    product_id: item.product_id,
                    type: 'adjustment',
                    quantity: item.difference,
                    location,
                    user_id: user.id,
                    note: `Stok Opname ${session.session_number}: ${item.system_stock} → ${item.actual_stock}${item.note ? ` (${item.note})` : ''} | Disetujui: ${profile.name}`,
                    reference_type: 'stock_opname',
                    reference_id: session.id,
                });

                // Mark item approved
                await supabase
                    .from('stock_opname_items')
                    .update({
                        status: 'approved',
                        approved_by: user.id,
                        approved_by_name: profile.name,
                        approved_at: new Date().toISOString(),
                    })
                    .eq('id', item.id);
            }

            // Mark rejected items
            for (const item of rejectedItems) {
                await supabase
                    .from('stock_opname_items')
                    .update({
                        status: 'rejected',
                        approved_by: user.id,
                        approved_by_name: profile.name,
                        approved_at: new Date().toISOString(),
                    })
                    .eq('id', item.id);
            }

            // Determine overall session status — if ALL rejected, session is 'rejected',
            // if ALL approved, 'approved', otherwise 'approved' (partial = still approved overall)
            const allRejected = rejectedItems.length === items.length;
            const overallStatus = allRejected ? 'rejected' : 'approved';
            const rejectionNote = allRejected
                ? (bulkRejectReason || Object.values(rejectReasons).join('; '))
                : rejectedItems.length > 0
                    ? `Sebagian ditolak: ${rejectedItems.map(i => (i as any).product?.name || i.product_id.slice(0, 8)).join(', ')}`
                    : null;

            const { error: sessErr } = await supabase
                .from('stock_opname_sessions')
                .update({
                    status: overallStatus,
                    approved_by: user.id,
                    approved_by_name: profile.name,
                    approved_at: new Date().toISOString(),
                    rejected_reason: rejectionNote,
                })
                .eq('id', session.id);

            if (sessErr) throw sessErr;

            // Send notification
            await supabase.from('notifications').insert({
                title: allRejected ? 'Stok Opname Ditolak' : 'Stok Opname Disetujui',
                message: `Sesi ${session.session_number}: ${approvedItems.length} item disetujui, ${rejectedItems.length} item ditolak`,
                type: allRejected ? 'warning' : 'success',
                link: '/stock-opname',
            });

            queryClient.invalidateQueries({ queryKey: ['stock-opname-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['stock-logs'] });

            toast({
                title: 'Review Selesai',
                description: `${approvedItems.length} item disetujui, ${rejectedItems.length} item ditolak`,
            });

            onClose();
        } catch (error: any) {
            toast({
                title: 'Gagal Memproses',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Review Item — <span className="font-mono">{session.session_number}</span>
                    </DialogTitle>
                </DialogHeader>

                {/* Session meta */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground border-b pb-3">
                    <span>Diajukan oleh <strong className="text-foreground">{session.created_by_name}</strong></span>
                    <span>·</span>
                    <span>
                        {format(new Date(session.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                    </span>
                    <div className="ml-auto flex gap-2 items-center">
                        {approvedCount > 0 && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                                <Check className="w-3 h-3 mr-1" />{approvedCount} disetujui
                            </Badge>
                        )}
                        {rejectedCount > 0 && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                                <X className="w-3 h-3 mr-1" />{rejectedCount} ditolak
                            </Badge>
                        )}
                        {pendingCount > 0 && (
                            <Badge variant="outline" className="text-[10px]">
                                {pendingCount} belum direview
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Bulk actions */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border">
                    <span className="text-xs font-medium text-muted-foreground mr-auto">Aksi Massal:</span>
                    <Button
                        size="sm"
                        className="gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-xs"
                        onClick={handleApproveAll}
                        disabled={processing}
                    >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Setujui Semua
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={handleRejectAll}
                        disabled={processing}
                    >
                        <XCircle className="w-3.5 h-3.5" />
                        Tolak Semua
                    </Button>
                </div>

                {/* Bulk reject reason input */}
                {bulkRejectOpen && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 space-y-3">
                        <Label className="text-sm font-semibold text-red-700">Alasan Penolakan Semua Item</Label>
                        <Textarea
                            value={bulkRejectReason}
                            onChange={e => setBulkRejectReason(e.target.value)}
                            placeholder="Berikan alasan penolakan..."
                            rows={2}
                            className="border-red-200"
                        />
                        <div className="flex gap-2">
                            <Button size="sm" variant="destructive" onClick={confirmBulkReject} disabled={!bulkRejectReason.trim()}>
                                Konfirmasi Tolak Semua
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setBulkRejectOpen(false)}>
                                Batal
                            </Button>
                        </div>
                    </div>
                )}

                {/* Items list */}
                {items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        Tidak ada item tercatat dalam sesi ini.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item) => {
                            const decision = decisions[item.id];
                            const productName = (item as any).product?.name ?? `Produk ${item.product_id.slice(0, 8)}`;
                            const location = (item as any).location || 'gudang';

                            return (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "rounded-xl border-2 p-4 transition-all",
                                        decision === 'approved' && "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-800",
                                        decision === 'rejected' && "border-red-300 bg-red-50/50 dark:bg-red-900/10 dark:border-red-800",
                                        !decision && "border-border hover:border-primary/30"
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Product info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Package className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-sm truncate">{productName}</h4>
                                                    <Badge variant="outline" className="text-[10px] uppercase font-bold mt-0.5">
                                                        {location}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {/* Stock comparison */}
                                            <div className="grid grid-cols-3 gap-3 mt-3">
                                                <div className="p-2 rounded-lg bg-muted/40 text-center">
                                                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Sistem</p>
                                                    <p className="font-mono text-sm font-bold tabular-nums">{item.system_stock}</p>
                                                </div>
                                                <div className="p-2 rounded-lg bg-muted/40 text-center">
                                                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Fisik</p>
                                                    <p className="font-mono text-sm font-bold tabular-nums">{item.actual_stock}</p>
                                                </div>
                                                <div className="p-2 rounded-lg bg-muted/40 text-center">
                                                    <p className="text-[10px] font-medium uppercase text-muted-foreground">Selisih</p>
                                                    <DiffBadge diff={item.difference} />
                                                </div>
                                            </div>

                                            {item.note && (
                                                <p className="text-xs text-muted-foreground mt-2 italic">📝 {item.note}</p>
                                            )}

                                            {/* Per-item reject reason input */}
                                            {showRejectInput === item.id && (
                                                <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 space-y-2">
                                                    <Textarea
                                                        placeholder="Alasan penolakan item ini..."
                                                        value={rejectReasons[item.id] || ''}
                                                        onChange={e => setRejectReasons(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                        rows={2}
                                                        className="text-sm border-red-200"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            className="text-xs h-7"
                                                            disabled={!rejectReasons[item.id]?.trim()}
                                                            onClick={() => handleItemReject(item.id, rejectReasons[item.id])}
                                                        >
                                                            Konfirmasi Tolak
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-xs h-7"
                                                            onClick={() => setShowRejectInput(null)}
                                                        >
                                                            Batal
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Show decision badge */}
                                            {decision === 'rejected' && rejectReasons[item.id] && showRejectInput !== item.id && (
                                                <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
                                                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                    <span>Ditolak: {rejectReasons[item.id]}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                className={cn(
                                                    "gap-1.5 h-9 text-xs w-[110px] transition-all",
                                                    decision === 'approved'
                                                        ? "bg-emerald-600 hover:bg-emerald-700"
                                                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-300"
                                                )}
                                                onClick={() => handleItemApprove(item.id)}
                                                disabled={processing}
                                                variant={decision === 'approved' ? 'default' : 'outline'}
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                {decision === 'approved' ? 'Disetujui' : 'Setujui'}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className={cn(
                                                    "gap-1.5 h-9 text-xs w-[110px] transition-all",
                                                    decision === 'rejected'
                                                        ? "bg-red-600 text-white hover:bg-red-700 border-red-600"
                                                        : "text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                                )}
                                                onClick={() => handleItemReject(item.id)}
                                                disabled={processing}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                {decision === 'rejected' ? 'Ditolak' : 'Tolak'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-2">
                    <Button variant="outline" onClick={onClose} disabled={processing}>
                        Batal
                    </Button>
                    <Button
                        onClick={handleSubmitDecisions}
                        disabled={processing || pendingCount > 0}
                        className={cn(
                            "gap-2 min-w-[180px]",
                            pendingCount > 0
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary hover:bg-primary/90"
                        )}
                    >
                        {processing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Memproses...
                            </>
                        ) : pendingCount > 0 ? (
                            `Review ${pendingCount} item lagi`
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Konfirmasi Semua Keputusan
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── History Detail Dialog (read-only) ──────────────────────────

function HistoryDetailDialog({
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

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Detail Item — <span className="font-mono">{session.session_number}</span>
                    </DialogTitle>
                </DialogHeader>

                {/* Session meta */}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground border-b pb-3">
                    <span>Oleh <strong className="text-foreground">{session.created_by_name}</strong></span>
                    <span>·</span>
                    <span>
                        Diperiksa oleh <strong className="text-foreground">{session.approved_by_name || '-'}</strong>
                        {session.approved_at && (
                            <> pada {format(new Date(session.approved_at), 'dd MMM yyyy HH:mm', { locale: localeId })}</>
                        )}
                    </span>
                    <Badge
                        variant="outline"
                        className={cn(
                            "ml-auto text-[10px] font-bold",
                            session.status === 'approved' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                            session.status === 'rejected' && "bg-red-50 text-red-700 border-red-200"
                        )}
                    >
                        {session.status === 'approved' ? '✓ Disetujui' : '✗ Ditolak'}
                    </Badge>
                </div>

                {/* Rejection reason */}
                {isRejected && session.rejected_reason && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold">Alasan Penolakan: </span>
                            {session.rejected_reason}
                        </div>
                    </div>
                )}

                {/* Items table */}
                {items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        Tidak ada item tercatat dalam sesi ini.
                    </div>
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
                                    <th className="text-center px-3 py-3 font-semibold">Status</th>
                                    <th className="text-left px-4 py-3 font-semibold">Catatan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {items.map((item, idx) => (
                                    <tr
                                        key={item.id}
                                        className={cn(
                                            "transition-colors hover:bg-muted/30",
                                            idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                                        )}
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                    <Package className="w-3.5 h-3.5 text-primary" />
                                                </div>
                                                <span className="font-medium line-clamp-1">
                                                    {(item as any).product?.name ?? `Produk ${item.product_id.slice(0, 8)}`}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                                {(item as any).location}
                                            </Badge>
                                        </td>
                                        <td className="px-3 py-3 text-center font-mono tabular-nums">{item.system_stock}</td>
                                        <td className="px-3 py-3 text-center font-mono tabular-nums font-semibold">{item.actual_stock}</td>
                                        <td className="px-3 py-3 text-center">
                                            <DiffBadge diff={item.difference} />
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[10px] font-bold px-2",
                                                    item.status === 'approved' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                                                    item.status === 'rejected' && "bg-red-50 text-red-700 border-red-200",
                                                    item.status === 'pending' && "bg-amber-50 text-amber-700 border-amber-200"
                                                )}
                                            >
                                                {item.status === 'approved' ? '✓' : item.status === 'rejected' ? '✗' : '⏳'} {item.status === 'approved' ? 'Setuju' : item.status === 'rejected' ? 'Tolak' : 'Pending'}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.note ? (
                                                <span className="text-xs text-muted-foreground italic">"{item.note}"</span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
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

// ─── Main Page ─────────────────────────────────────────────────

export default function StockOpnameApproval() {
    const { user, profile } = useAuth();
    const { data: sessions, isLoading } = useStockOpnameSessions();
    const queryClient = useQueryClient();

    const [approvalSession, setApprovalSession] = useState<StockOpnameSession | null>(null);
    const [approvalOpen, setApprovalOpen] = useState(false);
    const [detailSession, setDetailSession] = useState<StockOpnameSession | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // ─── Real-time: auto-refresh when sessions/items change ───
    useStockOpnameRealtime();

    if (isLoading) {
        return (
            <MainLayout title="Persetujuan Opname" subtitle="Review dan setujui hasil stok opname">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    const pendingSessions = sessions?.filter(s => s.status === 'pending_approval') || [];
    const pastSessions = sessions?.filter(s => s.status !== 'pending_approval' && s.status !== 'draft') || [];

    // ─── BeautifulTable column definitions ──────────────────────
    const pendingColumns: Column<StockOpnameSession>[] = [
        {
            header: 'No. Sesi',
            accessorKey: 'session_number',
            cell: (s) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-amber-600" />
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 uppercase font-bold dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                        {s.session_number}
                    </Badge>
                </div>
            )
        },
        {
            header: 'Waktu Pengajuan',
            accessorKey: 'created_at',
            cell: (s) => (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    {format(new Date(s.created_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
                </span>
            )
        },
        {
            header: 'Diajukan Oleh',
            accessorKey: 'created_by_name',
            cell: (s) => <span className="text-sm font-medium">{s.created_by_name}</span>
        },
        {
            header: 'Jumlah Item',
            filterable: false,
            sortable: false,
            cell: (s) => (
                <Badge variant="secondary" className="text-xs font-medium">
                    <Package className="w-3 h-3 mr-1" />
                    {s.items?.length || 0} item
                </Badge>
            )
        },
        {
            header: 'Aksi',
            filterable: false,
            sortable: false,
            cell: (s) => (
                <Button
                    size="sm"
                    className="gap-2 shrink-0 h-8 font-medium"
                    onClick={() => {
                        setApprovalSession(s);
                        setApprovalOpen(true);
                    }}
                >
                    <Eye className="w-3.5 h-3.5" />
                    Detail & Review
                </Button>
            )
        }
    ];

    const historyColumns: Column<StockOpnameSession>[] = [
        {
            header: 'No. Sesi',
            accessorKey: 'session_number',
            cell: (s) => (
                <span className="font-mono font-bold text-sm">{s.session_number}</span>
            ),
        },
        {
            header: 'Status',
            accessorKey: 'status',
            filterable: true,
            filterOptions: [
                { label: 'Disetujui', value: 'approved' },
                { label: 'Ditolak', value: 'rejected' },
            ],
            cell: (s) => (
                <Badge
                    variant="outline"
                    className={cn(
                        "text-[10px] font-bold px-2",
                        s.status === 'approved' && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400",
                        s.status === 'rejected' && "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400"
                    )}
                >
                    {s.status === 'approved' ? '✓ Disetujui' : '✗ Ditolak'}
                </Badge>
            ),
        },
        {
            header: 'Diajukan Oleh',
            accessorKey: 'created_by_name',
            cell: (s) => <span className="text-sm">{s.created_by_name}</span>,
        },
        {
            header: 'Diperiksa Oleh',
            accessorKey: 'approved_by_name',
            cell: (s) => <span className="text-sm">{s.approved_by_name || '—'}</span>,
        },
        {
            header: 'Tanggal Review',
            accessorKey: 'approved_at',
            cell: (s) => (
                <span className="text-sm text-muted-foreground">
                    {s.approved_at
                        ? format(new Date(s.approved_at), 'dd MMM yyyy HH:mm', { locale: localeId })
                        : '—'}
                </span>
            ),
        },
        {
            header: 'Alasan Penolakan',
            accessorKey: 'rejected_reason',
            filterable: false,
            cell: (s) => s.rejected_reason ? (
                <div className="flex items-start gap-1.5 text-xs text-red-700 dark:text-red-400 max-w-[220px]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{s.rejected_reason}</span>
                </div>
            ) : (
                <span className="text-xs text-muted-foreground">—</span>
            ),
        },
        {
            header: 'Item',
            filterable: false,
            cell: (s) => (
                <Badge variant="secondary" className="text-xs">
                    {s.items?.length || 0} item
                </Badge>
            ),
        },
        {
            header: 'Aksi',
            filterable: false,
            cell: (s) => (
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 h-8 text-xs"
                    onClick={() => {
                        setDetailSession(s);
                        setDetailOpen(true);
                    }}
                >
                    <Eye className="w-3.5 h-3.5" />
                    Detail
                </Button>
            ),
        },
    ];

    return (
        <MainLayout title="Persetujuan Opname" subtitle="Review dan setujui hasil stok opname dari gudang/toko">
            <div className="space-y-6">
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Menunggu Persetujuan"
                        value={pendingSessions.length}
                        icon={<ClipboardCheck className="w-5 h-5" />}
                        subtitle={pendingSessions.length > 0 ? "perlu direview" : undefined}
                        subtitleType="warning"
                        gradient="orange"
                    />
                    <StatsCard
                        title="Telah Disetujui"
                        value={pastSessions.filter(s => s.status === 'approved').length}
                        icon={<Check className="w-5 h-5" />}
                        subtitleType="success"
                        gradient="emerald"
                    />
                    <StatsCard
                        title="Ditolak"
                        value={pastSessions.filter(s => s.status === 'rejected').length}
                        icon={<X className="w-5 h-5" />}
                        subtitleType="error"
                        gradient="orange"
                    />
                </StatsGrid>

                {/* Pending sessions — BeautifulTable */}
                <BeautifulTable
                    data={pendingSessions}
                    columns={pendingColumns}
                    title={
                        <div className="flex items-center gap-2">
                            <ClipboardCheck className="w-5 h-5 text-amber-600" />
                            <span className="text-amber-700 dark:text-amber-500">Permintaan Menunggu Persetujuan</span>
                        </div>
                    }
                    hideSelection
                    hideExport
                    variant="premium"
                    emptyState={{
                        icon: <ClipboardCheck className="w-7 h-7" />,
                        title: 'Tidak ada permintaan',
                        description: 'Tidak ada sesi stok opname yang menunggu persetujuan.',
                    }}
                />

                {/* ─── Riwayat menggunakan BeautifulTable ─── */}
                <BeautifulTable
                    data={pastSessions}
                    columns={historyColumns}
                    title="Riwayat Persetujuan"
                    hideSelection
                    hideExport={false}
                    exportFilename="riwayat-persetujuan-opname"
                    exportTitle="Riwayat Persetujuan Stok Opname"
                    emptyState={{
                        icon: <History className="w-7 h-7" />,
                        title: 'Belum ada riwayat',
                        description: 'Riwayat persetujuan stok opname akan muncul di sini.',
                    }}
                />
            </div>

            {/* ─── Approval Detail Dialog (per-item) ─── */}
            <ApprovalDetailDialog
                session={approvalSession}
                open={approvalOpen}
                onClose={() => { setApprovalOpen(false); setApprovalSession(null); }}
            />

            {/* ─── History Detail Dialog (read-only) ─── */}
            <HistoryDetailDialog
                session={detailSession}
                open={detailOpen}
                onClose={() => { setDetailOpen(false); setDetailSession(null); }}
            />
        </MainLayout>
    );
}
