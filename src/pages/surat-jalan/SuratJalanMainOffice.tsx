
import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { useSuratJalanB2B } from '@/hooks/useSuratJalanB2B';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, FileText, CheckCircle, Clock, Package, TruckIcon, Users, ArrowRight, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, Customer } from '@/types';
import StatusBadge from '@/components/common/StatusBadge';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate } from 'react-router-dom';

export default function SuratJalanMainOffice() {
    const { user } = useAuth();
    const { suratJalans, createSuratJalan, cancelSuratJalan, isLoading } = useSuratJalanB2B();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const navigate = useNavigate();

    // Form State
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [selectedItems, setSelectedItems] = useState<{ productId: string, quantity: number, productName: string }[]>([]);

    // Product Selection State
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);

    // Fetch Customers
    const { data: customers = [] } = useQuery({
        queryKey: ['customers'],
        queryFn: async () => {
            const { data } = await supabase.from('customers').select('*').order('name');
            return data as Customer[];
        }
    });

    // Fetch Products for selection
    const { data: products = [] } = useQuery({
        queryKey: ['products-available'],
        queryFn: async () => {
            const { data } = await supabase.from('products').select('*').gt('stock_gudang', 0);
            return data as Product[];
        }
    });

    if (isLoading) {
        return (
            <MainLayout title="Surat Jalan (B2B)" subtitle="Kelola pengiriman ke pihak luar">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    // Stats calculations
    const stats = {
        total: suratJalans.length,
        pending: suratJalans.filter((s: any) => s.status === 'pending_warehouse').length,
        processing: suratJalans.filter((s: any) => s.status === 'processing').length,
        completed: suratJalans.filter((s: any) => s.status === 'completed').length,
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

        // Check if already added
        if (selectedItems.find(i => i.productId === selectedProduct)) {
            return;
        }

        setSelectedItems([...selectedItems, {
            productId: selectedProduct,
            quantity: quantity,
            productName: product.name
        }]);

        setSelectedProduct('');
        setQuantity(1);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...selectedItems];
        newItems.splice(index, 1);
        setSelectedItems(newItems);
    };

    const handleSubmit = () => {
        if (!user) return;
        createSuratJalan.mutate({
            recipientName,
            recipientAddress,
            recipientPhone,
            recipientEmail,
            items: selectedItems,
            userId: user.id
        }, {
            onSuccess: () => {
                setDialogOpen(false);
                setIsAlertOpen(true);
                setSelectedCustomerId('');
                setRecipientName('');
                setRecipientAddress('');
                setRecipientPhone('');
                setRecipientEmail('');
                setSelectedItems([]);
            }
        });
    };

    return (
        <MainLayout
            title="Surat Jalan (B2B)"
            subtitle="Kelola pengiriman barang ke pihak luar (B2B)"
            actions={
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl text-xs sm:text-sm">
                            <Plus className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Buat Surat Jalan</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl rounded-3xl">
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
                                <div className="flex gap-4 items-end mb-4">
                                    <div className="flex-1 space-y-2">
                                        <Label>Produk</Label>
                                        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                            <SelectTrigger className="rounded-xl h-11 bg-white border-gray-200">
                                                <SelectValue placeholder="Pilih Produk..." />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl max-h-[200px]">
                                                {products.map(p => (
                                                    <SelectItem key={p.id} value={p.id} className="rounded-lg my-1 cursor-pointer">
                                                        {p.name} (Stok: {(p as any).stock_gudang ?? p.stock?.gudang ?? 0})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                                                        <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
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
                            <Button onClick={handleSubmit} disabled={selectedItems.length === 0 || !selectedCustomerId} className="rounded-xl">
                                Buat Surat Jalan
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            }
        >
            <div className="space-y-6">
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Draft"
                        value={stats.total}
                        icon={<FileText className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Proses Gudang"
                        value={stats.pending}
                        icon={<Package className="w-5 h-5" />}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Dikirim"
                        value={stats.processing}
                        icon={<TruckIcon className="w-5 h-5" />}
                        subtitleType="info"
                    />
                    <StatsCard
                        title="Selesai"
                        value={stats.completed}
                        icon={<CheckCircle className="w-5 h-5" />}
                        subtitleType="success"
                    />
                </StatsGrid>

                {/* Alert Dialog for Invoice Reminder */}
                <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                    <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Surat Jalan Berhasil Dibuat!</AlertDialogTitle>
                            <AlertDialogDescription>
                                Apakah Anda ingin langsung membuat <strong>Invoice/Tagihan</strong> untuk surat jalan ini?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction onClick={() => {
                                setIsAlertOpen(false);
                                navigate('/invoices'); // Navigate to Invoices
                            }} className="rounded-xl">
                                Ya, Buat Invoice
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Content Section */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Daftar Surat Jalan</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="h-4 w-4" />
                        <span>{customers.length} Pelanggan Terdaftar</span>
                    </div>
                </div>

                <div className="grid gap-4">
                    {suratJalans.map((sj: any) => (
                        <div key={sj.id} className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 dark:hover:shadow-indigo-900/20 transition-all duration-300 hover:-translate-y-1">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
                                            <FileText className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <span className="font-bold text-lg text-gray-900 dark:text-white">{sj.number}</span>
                                            <div className="mt-0.5">
                                                <StatusBadge status={sj.status} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-3 ml-13">
                                        <span className="text-gray-900 dark:text-white font-semibold">{sj.recipient_name}</span>
                                        <ArrowRight className="h-4 w-4 text-gray-300" />
                                        <span className="text-gray-500 text-sm">{sj.recipient_address || 'Alamat tidak tersedia'}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2 ml-13">
                                        Dibuat: {format(new Date(sj.created_at), 'dd MMM yyyy, HH:mm', { locale: idLocale })}
                                    </p>
                                </div>
                                {sj.status === 'pending_warehouse' && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => cancelSuratJalan.mutate(sj.id)}
                                        className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        Batalkan
                                    </Button>
                                )}
                            </div>

                            <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800 dark:to-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                <h4 className="text-xs font-bold uppercase text-gray-400 mb-3 tracking-wider flex items-center gap-2">
                                    <Package className="h-3.5 w-3.5" />
                                    Item Pengiriman
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {sj.items?.map((item: any) => (
                                        <div key={item.id} className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm flex justify-between items-center">
                                            <span className="font-medium text-gray-700 dark:text-gray-300 text-sm truncate">{item.product_name}</span>
                                            <span className="font-mono bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs font-bold ml-2 shrink-0">{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Progress Tracking */}
                            <div className="mt-6 flex items-center justify-between text-sm px-2">
                                <div className={`flex flex-col items-center gap-1 ${sj.status !== 'cancelled' ? 'text-green-600' : 'text-gray-400'}`}>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${sj.status !== 'cancelled' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100'}`}>
                                        <CheckCircle className="h-4 w-4" />
                                    </div>
                                    <span className="font-medium text-xs">Main Office</span>
                                </div>

                                <div className={`h-0.5 flex-1 mx-2 rounded-full ${['processing', 'completed'].includes(sj.status) ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />

                                <div className={`flex flex-col items-center gap-1 ${['processing', 'completed'].includes(sj.status) ? 'text-green-600' : 'text-gray-400'}`}>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${['processing', 'completed'].includes(sj.status) ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                        {['processing', 'completed'].includes(sj.status) ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                    </div>
                                    <span className="font-medium text-xs">Gudang</span>
                                </div>

                                <div className={`h-0.5 flex-1 mx-2 rounded-full ${sj.status === 'completed' ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-700'}`} />

                                <div className={`flex flex-col items-center gap-1 ${sj.status === 'completed' ? 'text-green-600' : 'text-gray-400'}`}>
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${sj.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                        {sj.status === 'completed' ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                    </div>
                                    <span className="font-medium text-xs">Auditor</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {suratJalans.length === 0 && (
                        <div className="relative text-center py-16 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 overflow-hidden">
                            {/* Decorative elements */}
                            <div className="absolute top-4 left-4 h-20 w-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full blur-2xl" />
                            <div className="absolute bottom-4 right-4 h-32 w-32 bg-purple-100 dark:bg-purple-900/30 rounded-full blur-3xl" />

                            <div className="relative z-10">
                                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-indigo-900/30 mb-6">
                                    <TruckIcon className="h-10 w-10 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Belum Ada Surat Jalan</h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                                    Mulai kelola pengiriman B2B Anda dengan membuat surat jalan pertama.
                                </p>
                                <Button
                                    onClick={() => setDialogOpen(true)}
                                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
                                >
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Buat Surat Jalan Pertama
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}

