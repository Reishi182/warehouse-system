import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
    Plus,
    User,
    ChevronRight,
    Search,
    ClipboardList,
} from 'lucide-react';
import { useTabs, useCreateTab, useAddTabTransaction } from '@/hooks/useTabs';
import { useProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { CustomerTab, Location } from '@/types';
import { CartItem } from '@/hooks/usePOSCart';
import { toast } from 'sonner';

interface SaveToTabDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cartItems: CartItem[];
    stockLocation: Location;
    onSuccess: () => void;
}

export function SaveToTabDialog({
    open,
    onOpenChange,
    cartItems,
    stockLocation,
    onSuccess,
}: SaveToTabDialogProps) {
    const { profile } = useAuth();
    const { data: tabs = [], isLoading } = useTabs();
    const { data: products = [] } = useProducts();
    const createTab = useCreateTab();
    const addTransaction = useAddTabTransaction();

    const [view, setView] = useState<'select' | 'create'>('select');
    const [searchQuery, setSearchQuery] = useState('');
    const [createForm, setCreateForm] = useState({ customerName: '', customerPhone: '' });
    const [selectedTabId, setSelectedTabId] = useState<string | null>(null);

    // Filter only open tabs
    const openTabs = useMemo(() => {
        const filtered = tabs.filter(t => t.status === 'open');
        if (!searchQuery) return filtered;
        const query = searchQuery.toLowerCase();
        return filtered.filter(t =>
            t.customer_name.toLowerCase().includes(query) ||
            t.tab_number.toLowerCase().includes(query)
        );
    }, [tabs, searchQuery]);

    const handleCreateTab = () => {
        if (!createForm.customerName.trim()) {
            toast.error('Nama pelanggan wajib diisi');
            return;
        }

        createTab.mutate({
            customerName: createForm.customerName.trim(),
            customerPhone: createForm.customerPhone.trim() || undefined,
            stockLocation,
            cashierId: profile?.user_id || '',
            cashierName: profile?.name || 'Kasir',
        }, {
            onSuccess: (newTab) => {
                setSelectedTabId(newTab.id);
                setView('select');
                setCreateForm({ customerName: '', customerPhone: '' });
            },
        });
    };

    const handleSaveToTab = () => {
        if (!selectedTabId || cartItems.length === 0) return;

        // Find the selected tab to get tabNumber
        const selectedTab = openTabs.find(t => t.id === selectedTabId);
        if (!selectedTab) {
            toast.error('Tab tidak ditemukan');
            return;
        }

        const items = cartItems.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
        }));

        // Map products to the format expected by the mutation
        const productData = products.map(p => ({
            id: p.id,
            name: p.name,
            barcode: p.barcode,
            price: p.price,
        }));

        addTransaction.mutate({
            tabId: selectedTabId,
            tabNumber: selectedTab.tab_number,
            items,
            stockLocation,
            cashierId: profile?.user_id || '',
            cashierName: profile?.name || 'Kasir',
            products: productData,
        }, {
            onSuccess: () => {
                toast.success('Item berhasil disimpan ke Tab');
                onSuccess();
                onOpenChange(false);
                setSelectedTabId(null);
                setSearchQuery('');
            },
        });
    };

    const handleClose = () => {
        onOpenChange(false);
        setView('select');
        setSelectedTabId(null);
        setSearchQuery('');
        setCreateForm({ customerName: '', customerPhone: '' });
    };

    // Calculate cart total for display
    const cartTotal = cartItems.reduce((acc, item) => {
        const itemTotal = item.product.price * item.quantity;
        // discount is now a fixed amount in Rupiah per item
        const itemDiscount = item.discount * item.quantity;
        return acc + (itemTotal - itemDiscount);
    }, 0);

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5" />
                        {view === 'create' ? 'Buat Tab Baru' : 'Simpan ke Tab'}
                    </DialogTitle>
                </DialogHeader>

                {view === 'select' ? (
                    <div className="space-y-4">
                        {/* Cart Summary */}
                        <div className="bg-muted/30 rounded-xl p-3 border">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{cartItems.length} item di keranjang</span>
                                <span className="font-semibold">Rp {cartTotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Cari tab..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 rounded-xl"
                            />
                        </div>

                        {/* Tab List */}
                        <ScrollArea className="h-[250px]">
                            <div className="space-y-2 pr-2">
                                {/* Create New Tab Button */}
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-3 h-14 rounded-xl border-dashed"
                                    onClick={() => setView('create')}
                                >
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Plus className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-medium">Buat Tab Baru</span>
                                </Button>

                                {isLoading ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        Memuat...
                                    </div>
                                ) : openTabs.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                        Belum ada tab aktif
                                    </div>
                                ) : (
                                    openTabs.map((tab) => (
                                        <div
                                            key={tab.id}
                                            onClick={() => setSelectedTabId(tab.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedTabId === tab.id
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                : 'hover:bg-muted/30'
                                                }`}
                                        >
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <User className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{tab.customer_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {tab.tab_number} · Rp {(tab.running_total || 0).toLocaleString('id-ID')}
                                                </p>
                                            </div>
                                            <ChevronRight className={`h-4 w-4 transition-colors ${selectedTabId === tab.id ? 'text-primary' : 'text-muted-foreground'
                                                }`} />
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>

                        {/* Save Button */}
                        <Button
                            className="w-full rounded-xl h-11"
                            disabled={!selectedTabId || addTransaction.isPending}
                            onClick={handleSaveToTab}
                        >
                            {addTransaction.isPending ? 'Menyimpan...' : 'Simpan ke Tab'}
                        </Button>
                    </div>
                ) : (
                    /* Create Tab Form */
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nama Pelanggan *</label>
                            <Input
                                placeholder="Nama pelanggan..."
                                value={createForm.customerName}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, customerName: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">No. Telepon (opsional)</label>
                            <Input
                                placeholder="08xx..."
                                value={createForm.customerPhone}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl"
                                onClick={() => setView('select')}
                            >
                                Batal
                            </Button>
                            <Button
                                className="flex-1 rounded-xl"
                                disabled={createTab.isPending || !createForm.customerName.trim()}
                                onClick={handleCreateTab}
                            >
                                {createTab.isPending ? 'Membuat...' : 'Buat Tab'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
