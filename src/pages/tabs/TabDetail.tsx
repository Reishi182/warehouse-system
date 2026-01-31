import { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import ProductSearchSelect from '@/components/common/ProductSearchSelect';
import POSReceipt from '@/components/pos/POSReceipt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
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
import {
    ArrowLeft,
    Plus,
    Printer,
    CreditCard,
    XCircle,
    Package,
    Clock,
    CheckCircle2,
    Trash2,
    User,
    Phone,
    MapPin,
} from 'lucide-react';
import { useTab, useAddTabTransaction, useSettleTab, useCancelTab } from '@/hooks/useTabs';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { TabTransaction, PaymentMethod } from '@/types';

export default function TabDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: storeSettings } = useStoreSettings();
    const receiptRef = useRef<HTMLDivElement>(null);

    const [isAddTxOpen, setIsAddTxOpen] = useState(false);
    const [isSettleOpen, setIsSettleOpen] = useState(false);
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState<TabTransaction | null>(null);
    const [isPrintOpen, setIsPrintOpen] = useState(false);

    // Add transaction form state
    const [cartItems, setCartItems] = useState<Array<{ productId: string; quantity: number }>>([]);

    // Settle form state
    const [settleForm, setSettleForm] = useState({
        paymentMethod: 'cash' as PaymentMethod,
        amountPaid: 0,
    });

    // Cancel form state
    const [cancelReason, setCancelReason] = useState('');

    const { data: tab, isLoading } = useTab(id || '');
    const { data: products = [] } = useProducts();
    const addTransaction = useAddTabTransaction();
    const settleTab = useSettleTab();
    const cancelTab = useCancelTab();

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
    });

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

    const cartTotal = useMemo(() => {
        return cartItems.reduce((acc, item) => {
            const product = products.find(p => p.id === item.productId);
            return acc + (product?.price || 0) * item.quantity;
        }, 0);
    }, [cartItems, products]);

    const changeAmount = useMemo(() => {
        if (!tab) return 0;
        return Math.max(0, settleForm.amountPaid - tab.total_amount);
    }, [settleForm.amountPaid, tab]);

    const handleAddProduct = (productId: string) => {
        const existing = cartItems.find(i => i.productId === productId);
        if (existing) {
            setCartItems(cartItems.map(i =>
                i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
            ));
        } else {
            setCartItems([...cartItems, { productId, quantity: 1 }]);
        }
    };

    const handleRemoveProduct = (productId: string) => {
        setCartItems(cartItems.filter(i => i.productId !== productId));
    };

    const handleQuantityChange = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            handleRemoveProduct(productId);
        } else {
            setCartItems(cartItems.map(i =>
                i.productId === productId ? { ...i, quantity } : i
            ));
        }
    };

    const handleAddTransaction = () => {
        if (!tab || !user || cartItems.length === 0) return;

        addTransaction.mutate({
            tabId: tab.id,
            tabNumber: tab.tab_number,
            stockLocation: tab.stock_location,
            items: cartItems,
            cashierId: user.id,
            cashierName: user.name,
            products: products.map(p => ({ id: p.id, name: p.name, barcode: p.barcode, price: p.price })),
        }, {
            onSuccess: () => {
                setIsAddTxOpen(false);
                setCartItems([]);
            },
        });
    };

    const handleSettle = () => {
        if (!tab || !user) return;

        settleTab.mutate({
            tabId: tab.id,
            paymentMethod: settleForm.paymentMethod,
            amountPaid: settleForm.amountPaid,
            changeAmount,
            settledBy: user.id,
            settledByName: user.name,
        }, {
            onSuccess: () => {
                setIsSettleOpen(false);
            },
        });
    };

    const handleCancel = () => {
        if (!tab || !user || !cancelReason.trim()) return;

        cancelTab.mutate({
            tabId: tab.id,
            reason: cancelReason.trim(),
            cancelledBy: user.id,
            cancelledByName: user.name,
        }, {
            onSuccess: () => {
                setIsCancelOpen(false);
                navigate('/tabs');
            },
        });
    };

    const openPrintDialog = (tx: TabTransaction) => {
        setSelectedTx(tx);
        setIsPrintOpen(true);
    };

    if (isLoading) {
        return (
            <MainLayout title="Detail Tab" subtitle="Memuat...">
                <PageSkeleton variant="form" />
            </MainLayout>
        );
    }

    if (!tab) {
        return (
            <MainLayout title="Tab Tidak Ditemukan" subtitle="">
                <div className="text-center py-12">
                    <p className="text-muted-foreground">Tab tidak ditemukan atau telah dihapus.</p>
                    <Button onClick={() => navigate('/tabs')} className="mt-4">
                        Kembali ke Daftar Tab
                    </Button>
                </div>
            </MainLayout>
        );
    }

    const statusConfig = {
        open: { label: 'Aktif', color: 'bg-orange-500', icon: <Clock className="w-4 h-4" /> },
        settled: { label: 'Lunas', color: 'bg-green-500', icon: <CheckCircle2 className="w-4 h-4" /> },
        cancelled: { label: 'Dibatalkan', color: 'bg-red-500', icon: <XCircle className="w-4 h-4" /> },
    };

    const status = statusConfig[tab.status];
    const transactionCount = tab.transactions?.length || 0;

    // Calculate running total for each transaction
    const getRunningTotal = (txIndex: number) => {
        if (!tab.transactions) return 0;
        return tab.transactions
            .slice(0, txIndex + 1)
            .reduce((acc, tx) => acc + tx.subtotal, 0);
    };

    return (
        <MainLayout
            title={`Tab ${tab.tab_number}`}
            subtitle={`Pelanggan: ${tab.customer_name}`}
            actions={
                <Button variant="outline" onClick={() => navigate('/tabs')} className="rounded-xl gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                </Button>
            }
        >
            <div className="space-y-6">
                {/* Header Info */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-full bg-primary/10">
                                    <User className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{tab.customer_name}</h2>
                                    {tab.customer_phone && (
                                        <p className="text-muted-foreground flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {tab.customer_phone}
                                        </p>
                                    )}
                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        Lokasi: {tab.stock_location === 'toko' ? 'Toko' : 'Gudang'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <Badge className={`${status.color} text-white gap-1`}>
                                    {status.icon}
                                    {status.label}
                                </Badge>
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Total Outstanding</p>
                                    <p className={`text-2xl font-bold ${tab.status === 'open' ? 'text-orange-600' : ''}`}>
                                        {formatCurrency(tab.total_amount)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {tab.status === 'open' && (
                            <>
                                <Separator className="my-4" />
                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={() => setIsAddTxOpen(true)} className="gap-2 rounded-xl">
                                        <Plus className="w-4 h-4" />
                                        Tambah Transaksi
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSettleForm({ ...settleForm, amountPaid: tab.total_amount });
                                            setIsSettleOpen(true);
                                        }}
                                        className="gap-2 rounded-xl text-green-600 border-green-600 hover:bg-green-50"
                                        disabled={tab.total_amount === 0}
                                    >
                                        <CreditCard className="w-4 h-4" />
                                        Tutup Tab (Bayar)
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsCancelOpen(true)}
                                        className="gap-2 rounded-xl text-red-600 border-red-600 hover:bg-red-50"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Batalkan Tab
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Transactions List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Riwayat Transaksi ({transactionCount})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {transactionCount === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Belum ada transaksi</p>
                                {tab.status === 'open' && (
                                    <Button onClick={() => setIsAddTxOpen(true)} className="mt-4 gap-2">
                                        <Plus className="w-4 h-4" />
                                        Tambah Transaksi Pertama
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {tab.transactions?.map((tx, index) => (
                                    <div key={tx.id} className="border rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="font-semibold">Transaksi #{index + 1}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {format(new Date(tx.created_at), 'EEEE, dd MMMM yyyy - HH:mm', { locale: idLocale })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-lg">{formatCurrency(tx.subtotal)}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openPrintDialog(tx)}
                                                    className="h-8 w-8"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            {tx.items?.map(item => (
                                                <div key={item.id} className="flex justify-between text-sm">
                                                    <span>{item.product_name} x{item.quantity}</span>
                                                    <span className="text-muted-foreground">{formatCurrency(item.subtotal)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Add Transaction Dialog */}
            <Dialog open={isAddTxOpen} onOpenChange={setIsAddTxOpen}>
                <DialogContent className="rounded-2xl max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Tambah Transaksi</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <ProductSearchSelect
                            products={products}
                            onSelect={handleAddProduct}
                            stockLocation={tab.stock_location}
                            showStock
                        />

                        {cartItems.length > 0 && (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {cartItems.map(item => {
                                    const product = products.find(p => p.id === item.productId);
                                    if (!product) return null;
                                    return (
                                        <div key={item.productId} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{product.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatCurrency(product.price)} x {item.quantity} = {formatCurrency(product.price * item.quantity)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 0)}
                                                    className="w-16 h-8 text-center"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveProduct(item.productId)}
                                                    className="h-8 w-8 text-red-500"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {cartItems.length > 0 && (
                            <div className="flex justify-between items-center p-3 bg-primary/10 rounded-xl">
                                <span className="font-semibold">Total Transaksi</span>
                                <span className="text-xl font-bold">{formatCurrency(cartTotal)}</span>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddTxOpen(false)} className="rounded-xl">
                            Batal
                        </Button>
                        <Button
                            onClick={handleAddTransaction}
                            disabled={cartItems.length === 0 || addTransaction.isPending}
                            className="rounded-xl"
                        >
                            {addTransaction.isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Settle Tab Dialog */}
            <Dialog open={isSettleOpen} onOpenChange={setIsSettleOpen}>
                <DialogContent className="rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Tutup Tab - Pembayaran</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-muted rounded-xl">
                            <p className="text-sm text-muted-foreground">Total yang harus dibayar</p>
                            <p className="text-3xl font-bold">{formatCurrency(tab.total_amount)}</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Metode Pembayaran</Label>
                            <RadioGroup
                                value={settleForm.paymentMethod}
                                onValueChange={(v) => setSettleForm({ ...settleForm, paymentMethod: v as PaymentMethod })}
                                className="flex gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="cash" id="cash" />
                                    <Label htmlFor="cash" className="font-normal cursor-pointer">Tunai</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="transfer" id="transfer" />
                                    <Label htmlFor="transfer" className="font-normal cursor-pointer">Transfer</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        {settleForm.paymentMethod === 'cash' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Jumlah Bayar</Label>
                                    <Input
                                        type="number"
                                        className="rounded-xl h-11 text-lg"
                                        value={settleForm.amountPaid || ''}
                                        onChange={(e) => setSettleForm({ ...settleForm, amountPaid: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
                                    <span className="font-semibold">Kembalian</span>
                                    <span className="text-xl font-bold text-green-600">{formatCurrency(changeAmount)}</span>
                                </div>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSettleOpen(false)} className="rounded-xl">
                            Batal
                        </Button>
                        <Button
                            onClick={handleSettle}
                            disabled={settleForm.amountPaid < tab.total_amount || settleTab.isPending}
                            className="rounded-xl bg-green-600 hover:bg-green-700"
                        >
                            {settleTab.isPending ? 'Memproses...' : 'Selesaikan Pembayaran'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Tab Dialog */}
            <AlertDialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Batalkan Tab?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Semua stok yang sudah diambil akan dikembalikan. Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label>Alasan Pembatalan</Label>
                        <Input
                            className="mt-2 rounded-xl"
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Masukkan alasan pembatalan..."
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Tidak Jadi</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancel}
                            disabled={!cancelReason.trim() || cancelTab.isPending}
                            className="rounded-xl bg-red-600 hover:bg-red-700"
                        >
                            {cancelTab.isPending ? 'Membatalkan...' : 'Ya, Batalkan Tab'}
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
                    {selectedTx && (
                        <div className="py-4">
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
                                    tabNumber: tab.tab_number,
                                    customerName: tab.customer_name,
                                    transactionNumber: (tab.transactions?.findIndex(t => t.id === selectedTx.id) || 0) + 1,
                                    runningTotal: getRunningTotal(tab.transactions?.findIndex(t => t.id === selectedTx.id) || 0),
                                    isPending: tab.status === 'open',
                                }}
                            />
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPrintOpen(false)} className="rounded-xl">
                            Tutup
                        </Button>
                        <Button onClick={() => handlePrint()} className="rounded-xl gap-2">
                            <Printer className="w-4 h-4" />
                            Cetak
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
