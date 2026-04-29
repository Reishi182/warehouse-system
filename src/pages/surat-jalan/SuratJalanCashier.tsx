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
import { Package, Truck, CheckCircle, Plus, Trash2, Clock, FileText, Eye, User, Paperclip } from 'lucide-react';
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
import SearchableSelect from '@/components/common/SearchableSelect';
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
                const { data } = await supabase.from('products').select('id, name, barcode, price, image_url, stock_gudang, stock_toko, has_multi_unit, main_unit, pcs_per_box, box_price, sell_by_quantity, sell_unit, bulk_quantity, bulk_price, created_at, updated_at').gt(stockColumn, 0).range(from, from + PAGE_SIZE - 1);
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
                                <SearchableSelect
                                    options={customers.map(c => ({
                                        value: c.id,
                                        label: c.name,
                                        description: c.phone || c.email || undefined
                                    }))}
                                    value={selectedCustomerId}
                                    onValueChange={handleCustomerSelect}
                                    placeholder="Pilih Pelanggan..."
                                    searchPlaceholder="Cari pelanggan..."
                                    emptyMessage="Pelanggan tidak ditemukan"
                                    className="rounded-xl h-11 bg-white border-gray-200"
                                />
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
                <DialogContent className="max-w-3xl bg-slate-50 dark:bg-slate-900 border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
                    {selectedSjDetail && (
                        <div className="flex flex-col h-full max-h-[90vh]">
                            {/* Premium Gradient Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white relative shrink-0">
                                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                    <FileText className="w-32 h-32" />
                                </div>
                                <div className="flex justify-between items-start relative z-10">
                                    <div>
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            Detail Surat Jalan
                                        </h2>
                                        <p className="text-blue-100 flex items-center gap-1.5 mt-1 font-mono text-sm">
                                            {selectedSjDetail.number || 'Memuat...'}
                                        </p>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-semibold border border-white/30 shadow-sm flex items-center gap-2">
                                        {selectedSjDetail.status === 'completed' && <CheckCircle className="w-4 h-4" />}
                                        {selectedSjDetail.status === 'processing' && <Truck className="w-4 h-4" />}
                                        {selectedSjDetail.status === 'pending_review' && <Clock className="w-4 h-4" />}
                                        {selectedSjDetail.status === 'approved' && <CheckCircle className="w-4 h-4" />}
                                        {selectedSjDetail.status === 'pending_review' ? 'Menunggu Review' :
                                         selectedSjDetail.status === 'approved' ? 'Disetujui' :
                                         selectedSjDetail.status === 'processing' ? 'Dalam Pengiriman' :
                                         selectedSjDetail.status === 'completed' ? 'Selesai' :
                                         selectedSjDetail.status === 'rejected' ? 'Ditolak' : selectedSjDetail.status}
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                                {/* Info Grid 1 */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-blue-500" /> Tanggal
                                        </p>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                                            {selectedSjDetail.completed_at ? format(new Date(selectedSjDetail.completed_at), 'dd MMM yyyy', { locale: idLocale }) : format(new Date(selectedSjDetail.created_at), 'dd MMM yyyy', { locale: idLocale })}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {selectedSjDetail.completed_at ? format(new Date(selectedSjDetail.completed_at), 'HH:mm', { locale: idLocale }) : format(new Date(selectedSjDetail.created_at), 'HH:mm', { locale: idLocale })} WIB
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5 text-blue-500" /> Dokumen & Referensi
                                        </p>
                                        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{selectedSjDetail.items?.length || 0} Produk</p>
                                        {selectedSjDetail.customer_po_url && (
                                            <a 
                                                href={selectedSjDetail.customer_po_url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium text-xs rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                            >
                                                <Paperclip className="w-3 h-3" />
                                                Lampiran PO
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Info Grid 2 */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                    <div className="bg-gray-50/80 dark:bg-slate-700/50 px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                        <User className="w-4 h-4 text-blue-500" />
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                                            Informasi Penerima
                                        </h3>
                                    </div>
                                    <div className="p-4 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Nama Penerima</p>
                                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selectedSjDetail.recipient_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Nomor Telepon</p>
                                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selectedSjDetail.recipient_phone || '-'}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Alamat Lengkap</p>
                                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selectedSjDetail.recipient_address || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Items */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                        <Package className="w-4 h-4 text-blue-500" />
                                        Daftar Barang Dikirim ({selectedSjDetail.items?.length || 0} item)
                                    </h3>
                                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {selectedSjDetail.items?.map((item: any, idx: number) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-blue-50 dark:bg-blue-500/10 p-2 rounded-lg">
                                                            <Package className="w-4 h-4 text-blue-500" />
                                                        </div>
                                                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                                                            {item.product?.name || item.product_name || 'Produk tidak diketahui'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pl-11 sm:pl-0">
                                                        <LocationBadge location={item.from_location} />
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-flex items-center justify-center bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-bold px-3 py-1 rounded-lg min-w-[3rem]">
                                                                {item.quantity}
                                                            </span>
                                                            <span className="text-xs font-medium text-gray-500 uppercase w-8 text-left">{item.unit || 'pcs'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!selectedSjDetail.items || selectedSjDetail.items.length === 0) && (
                                                <div className="p-8 text-center text-muted-foreground text-sm">
                                                    Tidak ada data barang
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-gray-700 flex justify-end shrink-0">
                                <Button variant="outline" className="rounded-xl px-6" onClick={() => setDetailDialogOpen(false)}>
                                    Tutup
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </MainLayout>
    );
}
