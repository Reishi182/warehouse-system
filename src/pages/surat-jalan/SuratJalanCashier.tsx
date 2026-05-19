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
import { AppModal } from '@/components/ui/app-modal';
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
                <>
                    <Button className="rounded-xl text-xs sm:text-sm" onClick={() => setDialogOpen(true)}>
                        <Plus className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">Buat Surat Jalan</span>
                    </Button>
                    <AppModal
                        open={dialogOpen}
                        onClose={() => setDialogOpen(false)}
                        hideHeader
                        noPadding
                        size="xl"
                    >
                        {/* Premium Header */}
                        <div className="relative p-6 text-white overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600">
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white" />
                                <div className="absolute -bottom-12 -left-8 w-52 h-52 rounded-full bg-white" />
                            </div>
                            <div className="relative z-10 flex items-center gap-3">
                                <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                                    <Truck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Buat Surat Jalan B2B</h2>
                                    <p className="text-white/70 text-sm mt-0.5">Pengiriman barang ke pelanggan</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 space-y-4 bg-gray-50/60 dark:bg-slate-900/60 rounded-b-2xl">
                            {/* Section 1: Pelanggan */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Informasi Pelanggan</span>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block" />Pilih Pelanggan *
                                        </label>
                                        <SearchableSelect
                                            options={customers.map(c => ({
                                                value: c.id,
                                                label: c.name,
                                                description: c.phone || c.email || undefined
                                            }))}
                                            value={selectedCustomerId}
                                            onValueChange={handleCustomerSelect}
                                            placeholder="Cari pelanggan..."
                                            searchPlaceholder="Ketik nama pelanggan..."
                                            emptyMessage="Pelanggan tidak ditemukan"
                                        />
                                    </div>

                                    {selectedCustomerId && (
                                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide mb-0.5">Nama</p>
                                                    <p className="font-bold text-gray-800 dark:text-gray-100">{recipientName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide mb-0.5">Telepon</p>
                                                    <p className="font-semibold text-gray-700 dark:text-gray-300">{recipientPhone || '-'}</p>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide mb-0.5">Alamat</p>
                                                    <p className="font-semibold text-gray-700 dark:text-gray-300">{recipientAddress || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nomor Surat Jalan</label>
                                            <Input
                                                value={customNumber}
                                                onChange={(e) => setCustomNumber(e.target.value)}
                                                placeholder="SJ-001 (kosongkan = auto)"
                                                className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700"
                                            />
                                            <p className="text-[10px] text-muted-foreground">Kosongkan untuk nomor otomatis</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                                <Paperclip className="w-3 h-3" />Lampiran PO Pelanggan
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={(e) => setCustomerPoFile(e.target.files?.[0] || null)}
                                                    className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700 file:mr-3 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded-lg file:px-2 file:py-1"
                                                />
                                            </div>
                                            {customerPoFile && (
                                                <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                                    <Paperclip className="w-3 h-3" />{customerPoFile.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Item Pengiriman */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-violet-500 rounded-full" />
                                    <span className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">Item Pengiriman</span>
                                </div>
                                <div className="p-4 space-y-4">
                                    {/* Lokasi Asal */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lokasi Asal Barang</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => { setSourceLocation('toko'); setSelectedItems([]); setSelectedProduct(''); }}
                                                className={`py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                                                    sourceLocation === 'toko'
                                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md shadow-green-200 dark:shadow-green-900/40'
                                                        : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                                                }`}
                                            >
                                                🏪 Toko
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setSourceLocation('gudang'); setSelectedItems([]); setSelectedProduct(''); }}
                                                className={`py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                                                    sourceLocation === 'gudang'
                                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/40'
                                                        : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                                                }`}
                                            >
                                                📦 Gudang
                                            </button>
                                        </div>
                                    </div>

                                    {/* Product add row */}
                                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                                        <div className="sm:col-span-3 space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                Produk dari {sourceLocation === 'gudang' ? 'Gudang' : 'Toko'}
                                            </label>
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
                                        <div className="sm:col-span-1 space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Jumlah</label>
                                            <Input
                                                type="number"
                                                value={quantity}
                                                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                                                min="0.001"
                                                step="any"
                                                className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700 text-center font-bold"
                                            />
                                        </div>
                                        <div className="sm:col-span-1 space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Satuan</label>
                                            <UnitSelector
                                                product={products.find(p => p.id === selectedProduct)}
                                                value={unit}
                                                onChange={setUnit}
                                                className="h-10 rounded-xl"
                                                disabled={!selectedProduct}
                                            />
                                        </div>
                                        <div className="sm:col-span-1">
                                            <Button onClick={handleAddItem} type="button"
                                                className="h-10 w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold gap-1">
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Selected items table */}
                                    {selectedItems.length > 0 && (
                                        <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                                                <div className="w-1.5 h-3.5 bg-emerald-500 rounded-full" />
                                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Item Dipilih</span>
                                                <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-1.5 py-0.5 rounded-full">{selectedItems.length}</span>
                                            </div>
                                            <div className="divide-y divide-gray-50 dark:divide-slate-700">
                                                {selectedItems.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-slate-700/20 transition-colors">
                                                        <span className="text-xs font-bold text-gray-300 w-5 shrink-0 text-center">{idx + 1}</span>
                                                        <span className="flex-1 font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{item.productName}</span>
                                                        <span className="inline-flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold px-3 py-1 rounded-lg text-sm shrink-0">
                                                            {item.quantity}
                                                        </span>
                                                        <span className="text-xs font-bold text-gray-500 uppercase w-10 shrink-0">{item.unit || 'pcs'}</span>
                                                        <button onClick={() => handleRemoveItem(idx)}
                                                            className="shrink-0 w-7 h-7 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors rounded-lg text-gray-400">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex gap-3 justify-end pt-1 pb-1">
                                <Button variant="outline" onClick={() => setDialogOpen(false)}
                                    className="rounded-xl px-6 border-gray-200 hover:bg-gray-100 font-semibold">
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={selectedItems.length === 0 || !selectedCustomerId || createSuratJalan.isPending}
                                    className="rounded-xl px-8 font-bold gap-2 text-white shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                                    {createSuratJalan.isPending ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Menyimpan...</>
                                    ) : (
                                        <><CheckCircle className="w-4 h-4" /> Buat Surat Jalan</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </AppModal>
                </>
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
            <AppModal 
                open={detailDialogOpen} 
                onClose={() => setDetailDialogOpen(false)}
                hideHeader
                noPadding
                size="xl"
            >
                {selectedSjDetail && (
                    <div className="flex flex-col h-full">
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Nama Penerima</p>
                                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selectedSjDetail.recipient_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Nomor Telepon</p>
                                            <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selectedSjDetail.recipient_phone || '-'}</p>
                                        </div>
                                        <div className="sm:col-span-2">
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
            </AppModal>

        </MainLayout>
    );
}
