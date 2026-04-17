import { useState, useMemo, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import POSReceipt from '@/components/pos/POSReceipt';
import TabSummaryReceipt from '@/components/pos/TabSummaryReceipt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { formatRupiah } from '@/lib/format';
import {
    Plus,
    Printer,
    CreditCard,
    XCircle,
    Clock,
    CheckCircle2,
    User,
    ChevronRight,
    ArrowLeft,
    Package,
    FileText,
    Trash2,
} from 'lucide-react';
import { useTabs, useTab, useCreateTab, useSettleTab, useCancelTab, useDeleteTabTransaction } from '@/hooks/useTabs';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { CustomerTab, TabTransaction, PaymentMethod, Location } from '@/types';

interface TabDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    stockLocation: Location;
}

export function TabDialog({ open, onOpenChange, stockLocation }: TabDialogProps) {
    const { profile } = useAuth();
    const { data: storeSettings } = useStoreSettings();
    const receiptRef = useRef<HTMLDivElement>(null);
    const summaryReceiptRef = useRef<HTMLDivElement>(null);

    // View state
    const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
    const [selectedTabId, setSelectedTabId] = useState<string | null>(null);
    const [activeListTab, setActiveListTab] = useState('open');

    // Create form state
    const [createForm, setCreateForm] = useState({ customerName: '', customerPhone: '' });

    // Settle state
    const [isSettling, setIsSettling] = useState(false);
    const [settleForm, setSettleForm] = useState({ paymentMethod: 'cash' as PaymentMethod, amountPaid: 0 });

    // Cancel state
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelReason, setCancelReason] = useState('');

    // Print state
    const [selectedTx, setSelectedTx] = useState<TabTransaction | null>(null);
    const [isPrintOpen, setIsPrintOpen] = useState(false);
    const [isPrintSummaryOpen, setIsPrintSummaryOpen] = useState(false);

    // Delete transaction state
    const [txToDelete, setTxToDelete] = useState<TabTransaction | null>(null);

    // Data hooks
    const { data: tabs = [], isLoading } = useTabs();
    const { data: selectedTab, refetch: refetchTab } = useTab(selectedTabId || '');
    const createTab = useCreateTab();
    const settleTab = useSettleTab();
    const cancelTab = useCancelTab();
    const deleteTransaction = useDeleteTabTransaction();

    const handlePrint = useReactToPrint({ contentRef: receiptRef });
    const handlePrintSummary = useReactToPrint({ contentRef: summaryReceiptRef });

    const filteredTabs = useMemo(() => {
        if (activeListTab === 'all') return tabs;
        return tabs.filter(t => t.status === activeListTab);
    }, [tabs, activeListTab]);

    const openCount = useMemo(() => tabs.filter(t => t.status === 'open').length, [tabs]);


    const changeAmount = useMemo(() => {
        if (!selectedTab) return 0;
        return Math.max(0, settleForm.amountPaid - selectedTab.total_amount);
    }, [settleForm.amountPaid, selectedTab]);

    // Handlers
    const handleCreate = () => {
        if (!createForm.customerName.trim() || !profile) return;
        createTab.mutate({
            customerName: createForm.customerName.trim(),
            customerPhone: createForm.customerPhone.trim() || undefined,
            stockLocation,
            cashierId: profile.user_id,
            cashierName: profile.name,
        }, {
            onSuccess: (newTab) => {
                setCreateForm({ customerName: '', customerPhone: '' });
                setSelectedTabId(newTab.id);
                setView('detail');
            },
        });
    };

    const handleSettle = () => {
        if (!selectedTab || !profile) return;

        settleTab.mutate({
            tabId: selectedTab.id,
            paymentMethod: settleForm.paymentMethod,
            amountPaid: settleForm.amountPaid,
            changeAmount,
            settledBy: profile.user_id,
            settledByName: profile.name,
        }, {
            onSuccess: () => {
                setIsSettling(false);
                setView('list');
                setSelectedTabId(null);
            },
        });
    };

    const handleCancel = () => {
        if (!selectedTab || !profile || !cancelReason.trim()) return;

        cancelTab.mutate({
            tabId: selectedTab.id,
            reason: cancelReason.trim(),
            cancelledBy: profile.user_id,
            cancelledByName: profile.name,
        }, {
            onSuccess: () => {
                setIsCancelling(false);
                setView('list');
                setSelectedTabId(null);
                setCancelReason('');
            },
        });
    };

    const openTabDetail = (tab: CustomerTab) => {
        setSelectedTabId(tab.id);
        setView('detail');
    };

    const goBackToList = () => {
        setView('list');
        setSelectedTabId(null);
    };

    const getRunningTotal = (txIndex: number) => {
        if (!selectedTab?.transactions) return 0;
        return selectedTab.transactions
            .slice(0, txIndex + 1)
            .reduce((acc, tx) => acc + tx.subtotal, 0);
    };

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            setView('list');
            setSelectedTabId(null);
        }
        onOpenChange(open);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleDialogClose}>
                <DialogContent className="rounded-2xl max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className="flex items-center gap-2">
                            {view !== 'list' && (
                                <Button variant="ghost" size="icon" onClick={goBackToList} className="h-8 w-8">
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                            )}
                            {view === 'list' && 'Nota Gantung (Tab)'}
                            {view === 'create' && 'Buat Tab Baru'}
                            {view === 'detail' && selectedTab && `Tab: ${selectedTab.customer_name}`}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden">
                        {/* LIST VIEW */}
                        {view === 'list' && (
                            <div className="flex flex-col h-full">
                                <div className="flex items-center justify-between mb-3">
                                    <Tabs value={activeListTab} onValueChange={setActiveListTab} className="flex-1">
                                        <TabsList className="h-9">
                                            <TabsTrigger value="open" className="text-xs">Aktif ({openCount})</TabsTrigger>
                                            <TabsTrigger value="settled" className="text-xs">Lunas</TabsTrigger>
                                            <TabsTrigger value="cancelled" className="text-xs">Dibatalkan</TabsTrigger>
                                            <TabsTrigger value="all" className="text-xs">Semua</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                    <Button size="sm" onClick={() => setView('create')} className="ml-2 rounded-xl">
                                        <Plus className="w-4 h-4 mr-1" /> Baru
                                    </Button>
                                </div>

                                <ScrollArea className="flex-1">
                                    {isLoading ? (
                                        <div className="text-center py-8 text-muted-foreground">Memuat...</div>
                                    ) : filteredTabs.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                            <p>Belum ada tab</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 pr-2">
                                            {filteredTabs.map(tab => (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => openTabDetail(tab)}
                                                    className="w-full p-3 rounded-xl border hover:bg-muted/50 transition-colors text-left flex items-center gap-3"
                                                >
                                                    <div className="p-2 rounded-full bg-primary/10">
                                                        <User className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold truncate">{tab.customer_name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {format(new Date(tab.created_at), 'dd MMM, HH:mm', { locale: idLocale })}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-bold ${tab.status === 'open' ? 'text-orange-600' : ''}`}>
                                                            {formatRupiah(tab.total_amount)}
                                                        </p>
                                                        <Badge
                                                            variant={tab.status === 'open' ? 'secondary' : tab.status === 'settled' ? 'default' : 'destructive'}
                                                            className="text-xs"
                                                        >
                                                            {tab.status === 'open' ? 'Aktif' : tab.status === 'settled' ? 'Lunas' : 'Batal'}
                                                        </Badge>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        )}

                        {/* CREATE VIEW */}
                        {view === 'create' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nama Pelanggan *</Label>
                                    <Input
                                        className="rounded-xl h-11"
                                        value={createForm.customerName}
                                        onChange={(e) => setCreateForm({ ...createForm, customerName: e.target.value })}
                                        placeholder="Masukkan nama pelanggan"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>No. Telepon (Opsional)</Label>
                                    <Input
                                        className="rounded-xl h-11"
                                        value={createForm.customerPhone}
                                        onChange={(e) => setCreateForm({ ...createForm, customerPhone: e.target.value })}
                                        placeholder="08xx..."
                                    />
                                </div>
                                <div className="p-3 bg-muted rounded-xl text-sm">
                                    <span className="text-muted-foreground">Lokasi Stok:</span>{' '}
                                    <span className="font-semibold">{stockLocation === 'toko' ? '🏪 Toko' : '📦 Gudang'}</span>
                                </div>
                                <Button
                                    onClick={handleCreate}
                                    disabled={!createForm.customerName.trim() || createTab.isPending}
                                    className="w-full rounded-xl h-11"
                                >
                                    {createTab.isPending ? 'Membuat...' : 'Buat Tab'}
                                </Button>
                            </div>
                        )}

                        {/* DETAIL VIEW */}
                        {view === 'detail' && selectedTab && (
                            <ScrollArea className="h-[60vh]">
                                <div className="space-y-4 pr-2">
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                                        <div>
                                            <p className="font-bold text-lg">{selectedTab.customer_name}</p>
                                            <p className="text-xs text-muted-foreground">{selectedTab.tab_number}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-xl font-bold ${selectedTab.status === 'open' ? 'text-orange-600' : ''}`}>
                                                {formatRupiah(selectedTab.total_amount)}
                                            </p>
                                            <Badge variant={selectedTab.status === 'open' ? 'secondary' : 'default'}>
                                                {selectedTab.status === 'open' ? 'Aktif' : 'Lunas'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {selectedTab.status === 'open' && (
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setSettleForm({ ...settleForm, amountPaid: selectedTab.total_amount });
                                                    setIsSettling(true);
                                                }}
                                                className="flex-1 rounded-xl gap-1 text-green-600 border-green-600"
                                                disabled={selectedTab.total_amount === 0}
                                            >
                                                <CreditCard className="w-4 h-4" /> Bayar
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsCancelling(true)}
                                                className="rounded-xl text-red-600 border-red-600"
                                                size="icon"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    )}

                                    {/* Rekap button - shows for all tab statuses */}
                                    {(selectedTab.transactions?.length || 0) > 0 && (
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsPrintSummaryOpen(true)}
                                            className="w-full rounded-xl gap-1"
                                        >
                                            <FileText className="w-4 h-4" /> Cetak Rekap Transaksi
                                        </Button>
                                    )}

                                    <Separator />

                                    {/* Transactions */}
                                    <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                                            <Package className="w-4 h-4" />
                                            Transaksi ({selectedTab.transactions?.length || 0})
                                        </h4>
                                        {(selectedTab.transactions?.length || 0) === 0 ? (
                                            <p className="text-center py-4 text-muted-foreground text-sm">Belum ada transaksi</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {selectedTab.transactions?.map((tx, index) => (
                                                    <div key={tx.id} className="p-3 border rounded-xl">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div>
                                                                <p className="font-semibold text-sm">#{index + 1}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {format(new Date(tx.created_at), 'dd/MM HH:mm', { locale: idLocale })}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold">{formatRupiah(tx.subtotal)}</span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        setSelectedTx(tx);
                                                                        setIsPrintOpen(true);
                                                                    }}
                                                                    className="h-7 w-7"
                                                                >
                                                                    <Printer className="w-3 h-3" />
                                                                </Button>
                                                                {selectedTab.status === 'open' && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => setTxToDelete(tx)}
                                                                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground space-y-0.5">
                                                            {tx.items?.map(item => (
                                                                <div key={item.id} className="flex justify-between">
                                                                    <span>{item.product_name} x{item.quantity}</span>
                                                                    <span>{formatRupiah(item.subtotal)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Settle Dialog */}
            <Dialog open={isSettling} onOpenChange={setIsSettling}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Pembayaran Tab</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-xl text-center">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-3xl font-bold">{formatRupiah(selectedTab?.total_amount || 0)}</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Metode Pembayaran</Label>
                            <RadioGroup
                                value={settleForm.paymentMethod}
                                onValueChange={(v) => setSettleForm({ ...settleForm, paymentMethod: v as PaymentMethod })}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="cash" id="settle-cash" />
                                    <Label htmlFor="settle-cash" className="cursor-pointer">Tunai</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="transfer" id="settle-transfer" />
                                    <Label htmlFor="settle-transfer" className="cursor-pointer">Transfer</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {settleForm.paymentMethod === 'cash' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Jumlah Bayar</Label>
                                    <Input isCurrency
                                        type="number"
                                        className="rounded-xl h-11"
                                        value={settleForm.amountPaid || ''}
                                        onChange={(e) => setSettleForm({ ...settleForm, amountPaid: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                                    <span className="font-semibold">Kembalian</span>
                                    <span className="text-xl font-bold text-green-600">{formatRupiah(changeAmount)}</span>
                                </div>
                            </>
                        )}

                        <Button
                            onClick={handleSettle}
                            disabled={settleForm.amountPaid < (selectedTab?.total_amount || 0) || settleTab.isPending}
                            className="w-full rounded-xl bg-green-600 hover:bg-green-700"
                        >
                            {settleTab.isPending ? 'Memproses...' : 'Selesaikan Pembayaran'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Cancel Dialog */}
            <AlertDialog open={isCancelling} onOpenChange={setIsCancelling}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Batalkan Tab?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Semua stok akan dikembalikan. Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Label>Alasan</Label>
                        <Input
                            className="mt-2 rounded-xl"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Masukkan alasan..."
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Tidak</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            disabled={!cancelReason.trim() || cancelTab.isPending}
                            className="rounded-xl bg-red-600 hover:bg-red-700"
                        >
                            {cancelTab.isPending ? 'Membatalkan...' : 'Ya, Batalkan'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Print Receipt Dialog */}
            <Dialog open={isPrintOpen} onOpenChange={setIsPrintOpen}>
                <DialogContent className="rounded-2xl max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Cetak Struk</DialogTitle>
                    </DialogHeader>
                    {selectedTx && selectedTab && (
                        <div className="py-2">
                            <POSReceipt
                                ref={receiptRef}
                                saleNumber={selectedTx.transaction_number}
                                cashierName={selectedTx.cashier_name}
                                date={new Date(selectedTx.created_at)}
                                items={(selectedTx.items || []).map(item => ({
                                    name: item.product_name,
                                    quantity: item.quantity,
                                    price: item.price,
                                    discount: 0,
                                    subtotal: item.subtotal,
                                }))}
                                subtotal={selectedTx.subtotal}
                                orderDiscount={0}
                                total={selectedTx.subtotal}
                                paymentMethod="cash"
                                amountPaid={0}
                                change={0}
                                storeName={storeSettings?.store_name || 'WAREHOUSE SYSTEM'}
                                storeAddress={storeSettings?.store_address || ''}
                                tabInfo={{
                                    tabNumber: selectedTab.tab_number,
                                    customerName: selectedTab.customer_name,
                                    transactionNumber: (selectedTab.transactions?.findIndex(t => t.id === selectedTx.id) || 0) + 1,
                                    runningTotal: getRunningTotal(selectedTab.transactions?.findIndex(t => t.id === selectedTx.id) || 0),
                                    isPending: selectedTab.status === 'open',
                                }}
                            />
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsPrintOpen(false)} className="rounded-xl">
                            Tutup
                        </Button>
                        <Button onClick={() => handlePrint()} className="rounded-xl gap-1">
                            <Printer className="w-4 h-4" /> Cetak
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Print Tab Summary Dialog */}
            <Dialog open={isPrintSummaryOpen} onOpenChange={setIsPrintSummaryOpen}>
                <DialogContent className="rounded-2xl max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Cetak Rekap Tab
                        </DialogTitle>
                    </DialogHeader>
                    {selectedTab && (
                        <div className="py-2">
                            <TabSummaryReceipt
                                ref={summaryReceiptRef}
                                tab={selectedTab}
                                storeName={storeSettings?.store_name || 'WAREHOUSE SYSTEM'}
                                storeAddress={storeSettings?.store_address || ''}
                            />
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsPrintSummaryOpen(false)} className="rounded-xl">
                            Tutup
                        </Button>
                        <Button onClick={() => handlePrintSummary()} className="rounded-xl gap-1">
                            <Printer className="w-4 h-4" /> Cetak Rekap
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Transaction Confirmation Dialog */}
            <AlertDialog open={!!txToDelete} onOpenChange={(open) => !open && setTxToDelete(null)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Transaksi ini akan dihapus dan stok produk akan dikembalikan.
                            {txToDelete && (
                                <div className="mt-3 p-3 bg-muted rounded-xl text-sm">
                                    <p className="font-semibold text-foreground mb-2">
                                        {formatRupiah(txToDelete.subtotal)}
                                    </p>
                                    <div className="space-y-1 text-muted-foreground">
                                        {txToDelete.items?.map(item => (
                                            <div key={item.id} className="flex justify-between">
                                                <span>{item.product_name} x{item.quantity}</span>
                                                <span>{formatRupiah(item.subtotal)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-red-600 hover:bg-red-700"
                            disabled={deleteTransaction.isPending}
                            onClick={() => {
                                if (txToDelete && selectedTab && profile) {
                                    deleteTransaction.mutate({
                                        tabId: selectedTab.id,
                                        transactionId: txToDelete.id,
                                        deletedBy: profile.user_id,
                                    }, {
                                        onSuccess: async () => {
                                            await refetchTab();
                                            setTxToDelete(null);
                                        },
                                    });
                                }
                            }}
                        >
                            {deleteTransaction.isPending ? 'Menghapus...' : 'Hapus Transaksi'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
