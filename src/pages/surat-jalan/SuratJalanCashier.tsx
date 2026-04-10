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
import { Package, Truck, CheckCircle, List, Store, Warehouse, Plus, Trash2, Clock, FileText, XCircle, ArrowRight, PlayCircle, Eye } from 'lucide-react';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
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
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedSjDetail, setSelectedSjDetail] = useState<any | null>(null);

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

    const tableColumns: Column<any>[] = [
        {
            header: 'No. Surat Jalan',
            accessorKey: 'number',
            cell: (row) => <span className="font-semibold">{row.number}</span>
        },
        {
            header: 'Penerima',
            accessorKey: 'recipient_name',
            cell: (row) => (
                <div>
                    <p className="font-medium">{row.recipient_name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.recipient_address}</p>
                </div>
            )
        },
        {
            header: 'Tanggal Dibuat',
            accessorKey: 'created_at',
            cell: (row) => row.created_at ? format(new Date(row.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale }) : '-'
        },
        {
            header: 'Lokasi Asal',
            accessorKey: 'source_location',
            cell: (row) => <LocationBadge location={row.source_location} />
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (row) => <StatusBadge status={row.status} />
        },
        {
            header: 'Aksi',
            accessorKey: 'id',
            sortable: false,
            filterable: false,
            cell: (row) => (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => {
                        setSelectedSjDetail(row);
                        setDetailDialogOpen(true);
                    }}
                >
                    <Eye className="w-4 h-4 mr-2" />
                    Detail
                </Button>
            )
        }
    ];

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
            let stockDisplay = `${availableStock} ${product.sell_unit || 'pcs'}`;
            if (product.has_multi_unit && product.main_unit && product.pcs_per_box) {
                const mainQty = Math.floor(availableStock / product.pcs_per_box);
                const remainQty = availableStock % product.pcs_per_box;
                if (remainQty === 0) stockDisplay = `${mainQty} ${product.main_unit}`;
                else stockDisplay = `${mainQty} ${product.main_unit} ${remainQty} ${product.sell_unit}`;
            }

            toast({
                title: 'Stok tidak cukup!',
                description: `Stok tersedia: ${stockDisplay}`,
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

                {/* All Surat Jalans in BeautifulTable */}
                <div className="mt-8">
                    <BeautifulTable
                        data={suratJalans}
                        columns={tableColumns}
                        title="Daftar Surat Jalan"
                        subtitle="Semua surat jalan yang pernah dibuat"
                        variant="premium"
                        emptyState={{
                            icon: <FileText className="w-8 h-8 text-white" />,
                            title: "Belum Ada Surat Jalan",
                            description: "Buat surat jalan pertama Anda dengan tombol di atas."
                        }}
                    />
                </div>
            </div>

            {/* Detail Dialog */}
            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                <DialogContent className="max-w-2xl rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>Detail Surat Jalan: {selectedSjDetail?.number}</DialogTitle>
                        <DialogDescription>
                            Dikirim kepada {selectedSjDetail?.recipient_name}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSjDetail && (
                        <div className="space-y-4 py-4">
                            <div className="bg-muted/30 rounded-xl p-4 flex gap-4 text-sm border">
                                <div>
                                    <p className="text-muted-foreground mb-1 text-xs">Penerima</p>
                                    <p className="font-semibold">{selectedSjDetail.recipient_name}</p>
                                    <p className="text-muted-foreground">{selectedSjDetail.recipient_address}</p>
                                </div>
                                <div className="ml-auto text-right">
                                    <div className="mb-3">
                                        <p className="text-muted-foreground mb-1 text-xs">Tanggal</p>
                                        <p className="font-medium">
                                            {selectedSjDetail.completed_at ? format(new Date(selectedSjDetail.completed_at), 'dd MMM yyyy', { locale: idLocale }) : '-'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground mb-1 text-xs">Kontak</p>
                                        <p className="font-medium">{selectedSjDetail.recipient_phone || '-'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <h4 className="font-semibold text-sm">Daftar Barang Dikirim</h4>
                            <div className="border rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500">Nama Barang</th>
                                            <th className="px-4 py-3 text-center font-medium text-gray-500 w-24">Jumlah</th>
                                            <th className="px-4 py-3 text-center font-medium text-gray-500 w-32">Lokasi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {selectedSjDetail.items?.map((item: any) => (
                                            <tr key={item.id} className="hover:bg-muted/50">
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">{item.product?.name || item.product_name || 'Produk tidak diketahui'}</p>
                                                </td>
                                                <td className="px-4 py-3 text-center font-medium">
                                                    {item.quantity} <span className="text-muted-foreground">{item.unit || ''}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <LocationBadge location={item.from_location} />
                                                </td>
                                            </tr>
                                        ))}
                                        {(!selectedSjDetail.items || selectedSjDetail.items.length === 0) && (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                                                    Tidak ada data barang
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            
                            {selectedSjDetail.customer_po_url && (
                                <div className="mt-4">
                                    <h4 className="font-semibold text-sm mb-2">Lampiran PO</h4>
                                    <a 
                                        href={selectedSjDetail.customer_po_url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-primary text-sm hover:underline flex items-center gap-1"
                                    >
                                        <FileText className="w-4 h-4" /> Lihat Dokumen PO
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </MainLayout>
    );
}
