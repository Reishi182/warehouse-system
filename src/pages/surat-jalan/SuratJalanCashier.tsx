import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import ProductSearchSelect from '@/components/common/ProductSearchSelect';
import UnitSelector from '@/components/common/UnitSelector';
import StatusBadge from '@/components/common/StatusBadge';
import LocationBadge from '@/components/common/LocationBadge';
import { useSuratJalanB2B } from '@/hooks/useSuratJalanB2B';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Truck, CheckCircle, List, Store, Warehouse, Plus, Trash2, Clock, FileText, XCircle, ArrowRight, PlayCircle } from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, Customer } from '@/types';
import { compressImageToFile, isImageFile } from '@/lib/imageCompression';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function SuratJalanCashier() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { suratJalans, createSuratJalan, cancelSuratJalan, isLoading } = useSuratJalanB2B();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSj, setSelectedSj] = useState<any | null>(null);

    // Form State
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [sourceLocation, setSourceLocation] = useState<'gudang' | 'toko'>('toko');
    const [selectedItems, setSelectedItems] = useState<{ productId: string, quantity: number, unit?: string, productName: string }[]>([]);
    const [customNumber, setCustomNumber] = useState('');
    const [customerPoFile, setCustomerPoFile] = useState<File | null>(null);

    // Product Selection State
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [unit, setUnit] = useState<string>('pcs');

    // Fetch Customers
    const { data: customers = [] } = useQuery({
        queryKey: ['customers'],
        queryFn: async () => {
            const { data } = await supabase.from('customers').select('*').order('name');
            return data as Customer[];
        }
    });

    // Fetch Products for selection based on source location (paginated to bypass Supabase 1000-row limit)
    const { data: products = [] } = useQuery({
        queryKey: ['products-available', sourceLocation],
        queryFn: async () => {
            const stockColumn = sourceLocation === 'gudang' ? 'stock_gudang' : 'stock_toko';
            const PAGE_SIZE = 1000;
            let allData: any[] = [];
            let from = 0;
            let hasMore = true;
            while (hasMore) {
                const { data } = await supabase.from('products').select('*').gt(stockColumn, 0).range(from, from + PAGE_SIZE - 1);
                allData = allData.concat(data || []);
                if (!data || data.length < PAGE_SIZE) { hasMore = false; } else { from += PAGE_SIZE; }
            }
            return allData as Product[];
        }
    });

    if (isLoading) {
        return (
            <MainLayout title="Surat Jalan B2B (Kasir)" subtitle="Kelola surat jalan pengiriman">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    // Filter orders by status
    const pendingReview = suratJalans.filter((sj: any) => sj.status === 'pending_review');
    const approved = suratJalans.filter((sj: any) => sj.status === 'approved');
    const processing = suratJalans.filter((sj: any) => sj.status === 'processing');
    const completed = suratJalans.filter((sj: any) => sj.status === 'completed');
    const rejected = suratJalans.filter((sj: any) => sj.status === 'rejected');

    const stats = {
        pendingReview: pendingReview.length,
        approved: approved.length,
        processing: processing.length,
        completed: completed.length,
    };

    // Handle customer selection - auto-fill fields
    const handleCustomerSelect = (customerId: string) => {
        setSelectedCustomerId(customerId);
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            setRecipientName(customer.name);
            setRecipientAddress(customer.address || '');
            setRecipientPhone(customer.phone || '');
            setRecipientEmail(customer.email || '');
        }
    };

    const handleAddItem = () => {
        if (!selectedProduct || quantity <= 0) return;
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return;

        if (selectedItems.find(i => i.productId === selectedProduct)) return;

        // Check stock availability
        const availableStock = sourceLocation === 'gudang'
            ? (product as any).stock_gudang
            : (product as any).stock_toko;

        const actualQuantity = (product.has_multi_unit && unit === product.main_unit) 
            ? quantity * (product.pcs_per_box || 1) 
            : quantity;

        if (actualQuantity > availableStock) {
            toast({
                title: 'Stok tidak cukup!',
                description: `Stok tersedia: ${Math.floor(availableStock / (product.has_multi_unit && unit === product.main_unit ? (product.pcs_per_box || 1) : 1))} ${unit} (${availableStock} ${product.sell_unit || 'pcs'})`,
                variant: 'destructive'
            });
            return;
        }

        setSelectedItems([...selectedItems, {
            productId: selectedProduct,
            quantity: quantity,
            unit: unit,
            productName: product.name
        }]);

        setSelectedProduct('');
        setQuantity(1);
        setUnit('pcs');
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...selectedItems];
        newItems.splice(index, 1);
        setSelectedItems(newItems);
    };

    const handleSubmit = async () => {
        if (!user) return;

        let customerPoUrl: string | undefined;
        if (customerPoFile) {
            const fileToUpload = isImageFile(customerPoFile)
                ? await compressImageToFile(customerPoFile, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 })
                : customerPoFile;

            const fileExt = fileToUpload.name.split('.').pop();
            const fileName = `customer-po/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(fileName, fileToUpload);

            if (!uploadError) {
                const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
                customerPoUrl = urlData.publicUrl;
            }
        }

        createSuratJalan.mutate({
            recipientName,
            recipientAddress,
            recipientPhone,
            recipientEmail,
            items: selectedItems.map(i => ({ productId: i.productId, quantity: i.quantity, unit: i.unit })),
            userId: user.id,
            sourceLocation,
            customNumber: customNumber.trim() || undefined,
            customerPoUrl,
        }, {
            onSuccess: () => {
                setDialogOpen(false);
                resetForm();
            }
        });
    };

    const resetForm = () => {
        setSelectedCustomerId('');
        setRecipientName('');
        setRecipientAddress('');
        setRecipientPhone('');
        setRecipientEmail('');
        setSelectedItems([]);
        setSourceLocation('toko');
        setCustomNumber('');
        setCustomerPoFile(null);
    };


    return (
        <MainLayout
            title="Surat Jalan B2B (Kasir)"
            subtitle="Buat dan kelola surat jalan pengiriman ke customer"
            actions={
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl text-xs sm:text-sm">
                            <Plus className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Buat Surat Jalan</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl rounded-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Buat Surat Jalan B2B</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            {/* Customer Selection */}
                            <div className="space-y-2">
                                <Label>Pilih Pelanggan</Label>
                                <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                                    <SelectTrigger className="rounded-xl h-11 bg-white border-gray-200">
                                        <SelectValue placeholder="Pilih Pelanggan..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl max-h-[200px]">
                                        {customers.map(c => (
                                            <SelectItem key={c.id} value={c.id} className="rounded-lg my-1 cursor-pointer">
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Custom Number & PO Attachment */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nomor Surat Jalan</Label>
                                    <Input
                                        value={customNumber}
                                        onChange={(e) => setCustomNumber(e.target.value)}
                                        placeholder="SJ-001 (kosongkan untuk auto)"
                                        className="rounded-xl h-11"
                                    />
                                    <p className="text-xs text-muted-foreground">Kosongkan jika ingin nomor otomatis</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Lampiran PO Pelanggan (opsional)</Label>
                                    <Input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(e) => setCustomerPoFile(e.target.files?.[0] || null)}
                                        className="rounded-xl h-11"
                                    />
                                    {customerPoFile && (
                                        <p className="text-xs text-green-600">📎 {customerPoFile.name}</p>
                                    )}
                                </div>
                            </div>

                            {/* Auto-filled customer info */}
                            {selectedCustomerId && (
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 space-y-3 border border-indigo-100">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-indigo-600 font-medium mb-1">Nama Penerima</p>
                                            <p className="font-semibold text-gray-900">{recipientName}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-indigo-600 font-medium mb-1">No. Telepon</p>
                                            <p className="font-semibold text-gray-900">{recipientPhone || '-'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-indigo-600 font-medium mb-1">Email</p>
                                            <p className="font-semibold text-gray-900">{recipientEmail || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-indigo-600 font-medium mb-1">Alamat</p>
                                            <p className="font-semibold text-gray-900">{recipientAddress || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="border-t pt-4">
                                <h4 className="text-sm font-medium mb-4">Item Pengiriman</h4>

                                {/* Source Location Selector */}
                                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                    <Label className="text-blue-700 dark:text-blue-300 mb-2 block">Lokasi Asal Barang</Label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => { setSourceLocation('toko'); setSelectedItems([]); setSelectedProduct(''); }}
                                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${sourceLocation === 'toko'
                                                ? 'bg-green-600 text-white shadow-md'
                                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border'
                                                }`}
                                        >
                                            🏪 Toko
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setSourceLocation('gudang'); setSelectedItems([]); setSelectedProduct(''); }}
                                            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${sourceLocation === 'gudang'
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border'
                                                }`}
                                        >
                                            📦 Gudang
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-4 items-end mb-4">
                                    <div className="flex-1 space-y-2">
                                        <Label>Produk dari {sourceLocation === 'gudang' ? 'Gudang' : 'Toko'}</Label>
                                        <ProductSearchSelect
                                            products={products}
                                            value={selectedProduct}
                                            onChange={setSelectedProduct}
                                            placeholder="Cari produk..."
                                            showStock={true}
                                            stockLocation={sourceLocation}
                                            excludeIds={selectedItems.map(i => i.productId)}
                                        />
                                    </div>
                                    <div className="w-24 space-y-2">
                                        <Label>Jumlah</Label>
                                        <Input
                                            type="number"
                                            className="rounded-xl h-11"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.valueAsNumber)}
                                            min="1"
                                        />
                                    </div>
                                    <div className="w-32 space-y-2">
                                        <Label>Satuan</Label>
                                        <UnitSelector
                                            product={products.find(p => p.id === selectedProduct)}
                                            value={unit}
                                            onChange={setUnit}
                                            className="rounded-xl h-11"
                                            disabled={!selectedProduct}
                                        />
                                    </div>
                                    <Button onClick={handleAddItem} type="button" className="h-11 rounded-xl px-4">
                                        <Plus className="w-5 h-5" />
                                    </Button>
                                </div>

                                {selectedItems.length > 0 && (
                                    <div className="rounded-xl border overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-medium text-gray-500">Produk</th>
                                                    <th className="px-4 py-3 text-center font-medium text-gray-500 w-24">Qty</th>
                                                    <th className="px-4 py-3 text-right font-medium text-gray-500 w-16"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {selectedItems.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="px-4 py-3">{item.productName}</td>
                                                        <td className="px-4 py-3 text-center font-medium">{item.quantity} {item.unit || ''}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                onClick={() => handleRemoveItem(idx)}
                                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Batal</Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={selectedItems.length === 0 || !selectedCustomerId || createSuratJalan.isPending}
                                className="rounded-xl"
                            >
                                {createSuratJalan.isPending ? 'Menyimpan...' : 'Buat Surat Jalan'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            }
        >
            <div className="space-y-6">
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Menunggu Review"
                        value={stats.pendingReview}
                        icon={<Clock className="w-5 h-5" />}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Siap Proses"
                        value={stats.approved}
                        icon={<CheckCircle className="w-5 h-5" />}
                        subtitle={stats.approved > 0 ? "perlu diproses" : undefined}
                        subtitleType="info"
                    />
                    <StatsCard
                        title="Dalam Pengiriman"
                        value={stats.processing}
                        icon={<Truck className="w-5 h-5" />}
                        subtitleType="info"
                    />
                    <StatsCard
                        title="Selesai"
                        value={stats.completed}
                        icon={<Package className="w-5 h-5" />}
                        subtitleType="success"
                    />
                </StatsGrid>

                {/* Approved - Waiting for Warehouse to Process */}
                {approved.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            Menunggu Diproses Gudang ({approved.length})
                        </h3>
                        <div className="grid gap-4">
                            {approved.map((sj: any) => (
                                <div key={sj.id} className="bg-card border border-blue-200 rounded-lg p-4 shadow-sm opacity-90">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className="font-bold text-lg">{sj.number}</span>
                                                <StatusBadge status={sj.status} showIcon />
                                                <LocationBadge location={sj.source_location} />
                                            </div>
                                            <p className="text-muted-foreground font-medium">{sj.recipient_name}</p>
                                            <p className="text-sm text-muted-foreground">{sj.recipient_address}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pending Review */}
                {pendingReview.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-yellow-600">
                            <Clock className="h-5 w-5" />
                            Menunggu Review Main Office ({pendingReview.length})
                        </h3>
                        <div className="grid gap-4">
                            {pendingReview.map((sj: any) => (
                                <div key={sj.id} className="bg-card border border-yellow-200 rounded-lg p-4 shadow-sm opacity-90">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold">{sj.number}</span>
                                                <StatusBadge status={sj.status} showIcon />
                                            </div>
                                            <p className="text-sm text-muted-foreground">{sj.recipient_name}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => cancelSuratJalan.mutate(sj.id)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            Batalkan
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Processing */}
                {processing.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-600">
                            <Truck className="h-5 w-5" />
                            Dalam Pengiriman ({processing.length})
                        </h3>
                        <div className="grid gap-4">
                            {processing.map((sj: any) => (
                                <div key={sj.id} className="bg-card border border-purple-200 rounded-lg p-4 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold">{sj.number}</span>
                                                <StatusBadge status={sj.status} showIcon />
                                            </div>
                                            <p className="text-sm text-muted-foreground">{sj.recipient_name}</p>
                                            <p className="text-xs text-purple-600">Menunggu gudang menyelesaikan pengiriman</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Rejected */}
                {rejected.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-600">
                            <XCircle className="h-5 w-5" />
                            Ditolak ({rejected.length})
                        </h3>
                        <div className="grid gap-4 opacity-75">
                            {rejected.map((sj: any) => (
                                <div key={sj.id} className="bg-card border border-red-200 rounded-lg p-4 shadow-sm">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold">{sj.number}</span>
                                                <StatusBadge status={sj.status} showIcon />
                                            </div>
                                            <p className="text-sm text-muted-foreground">{sj.recipient_name}</p>
                                            {sj.review_notes && (
                                                <p className="text-sm text-red-600 mt-1">Alasan: {sj.review_notes}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Completed History */}
                {completed.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold mb-4 text-muted-foreground">Riwayat Selesai</h3>
                        <div className="grid gap-4 opacity-75">
                            {completed.slice(0, 5).map((sj: any) => (
                                <div key={sj.id} className="bg-card border rounded-lg p-4 flex justify-between items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold">{sj.number}</p>
                                            <StatusBadge status={sj.status} showIcon />
                                        </div>
                                        <p className="text-sm text-muted-foreground">Ke: {sj.recipient_name}</p>
                                    </div>
                                    <div className="text-right text-sm text-muted-foreground">
                                        {sj.completed_at && format(new Date(sj.completed_at), 'dd MMM yyyy', { locale: idLocale })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {suratJalans.length === 0 && (
                    <div className="text-center py-16 bg-muted/20 rounded-lg border border-dashed">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Belum Ada Surat Jalan</h3>
                        <p className="text-muted-foreground mb-4">Buat surat jalan pertama Anda</p>
                        <Button onClick={() => setDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Buat Surat Jalan
                        </Button>
                    </div>
                )}
            </div>

        </MainLayout>
    );
}
