
import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types';
import { Check, FileText, Package, User, Calendar, ChevronRight, Search, AlertCircle } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { DateInput } from '@/components/common/DatePicker';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';

interface SuratJalanData {
    id: string;
    number: string;
    recipient_name: string;
    recipient_address?: string;
    created_at: string;
    status: string;
    items: Array<{
        id: string;
        product_id: string;
        product_name: string;
        barcode: string;
        quantity: number;
        unit?: string | null;
        product?: {
            id: string;
            name: string;
            price: number;
        };
    }>;
}

interface InvoiceItemFromSJ {
    sjId: string;
    sjNumber: string;
    sjItemId: string;
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    price: number; // Manual price
}

interface CreateInvoiceFormProps {
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export default function CreateInvoiceForm({ onSubmit, onCancel }: CreateInvoiceFormProps) {
    // Step 1: Customer
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [dueDate, setDueDate] = useState('');

    // Step 2: Selected Surat Jalan
    const [selectedSJIds, setSelectedSJIds] = useState<Set<string>>(new Set());

    // Step 3: Items with manual prices
    const [itemPrices, setItemPrices] = useState<Record<string, number>>({});

    // Search
    const [sjSearch, setSjSearch] = useState('');

    // Fetch Customers
    const { data: customers = [] } = useQuery({
        queryKey: ['customers-list'],
        queryFn: async () => {
            const { data } = await supabase.from('customers').select('*').order('name');
            return data as Customer[];
        }
    });

    // Fetch Surat Jalan B2B for selected customer — excluding SJs already linked to an invoice
    const { data: suratJalans = [], isLoading: sjLoading } = useQuery({
        queryKey: ['surat-jalan-for-invoice', selectedCustomerId],
        queryFn: async () => {
            if (!selectedCustomerId) return [];

            // 1. Fetch SJ IDs already used in an invoice (via junction table)
            const { data: usedLinks } = await supabase
                .from('invoice_surat_jalan')
                .select('surat_jalan_id');
            const usedSjIds = (usedLinks || []).map((r: any) => r.surat_jalan_id as string);

            // 2. Build SJ query — match by customer_id if column exists, else fall back to recipient_name
            let query = supabase
                .from('surat_jalan')
                .select(`
                    id, number, recipient_name, recipient_address, created_at, status, customer_id,
                    items:surat_jalan_items(
                        id, product_id, product_name, barcode, quantity, unit,
                        product:products(id, name, price)
                    )
                `)
                .eq('type', 'B2B')
                .in('status', ['completed', 'approved', 'processing'])
                .order('created_at', { ascending: false });

            // Filter by customer_id (preferred — exact foreign key match)
            query = query.eq('customer_id', selectedCustomerId);

            const { data, error } = await query;
            if (error) throw error;

            // 3. Filter out SJs already linked to any invoice
            const available = (data || []).filter(
                (sj: any) => !usedSjIds.includes(sj.id)
            );

            return available as SuratJalanData[];
        },
        enabled: !!selectedCustomerId,
    });




    // Filter SJ by search
    const filteredSuratJalans = useMemo(() => {
        if (!sjSearch.trim()) return suratJalans;
        const q = sjSearch.toLowerCase();
        return suratJalans.filter(sj =>
            sj.number.toLowerCase().includes(q) ||
            sj.items.some(it => it.product_name.toLowerCase().includes(q))
        );
    }, [suratJalans, sjSearch]);

    // Auto-populate items from selected SJs
    const invoiceItems: InvoiceItemFromSJ[] = useMemo(() => {
        const items: InvoiceItemFromSJ[] = [];
        for (const sj of suratJalans) {
            if (!selectedSJIds.has(sj.id)) continue;
            for (const sjItem of sj.items) {
                const key = `${sj.id}_${sjItem.id}`;
                items.push({
                    sjId: sj.id,
                    sjNumber: sj.number,
                    sjItemId: sjItem.id,
                    productId: sjItem.product_id,
                    productName: sjItem.product_name || sjItem.product?.name || 'Unknown',
                    quantity: sjItem.quantity,
                    unit: sjItem.unit || 'pcs',
                    price: itemPrices[key] ?? 0,
                });
            }
        }
        return items;
    }, [suratJalans, selectedSJIds, itemPrices]);

    const subtotal = useMemo(() =>
        invoiceItems.reduce((sum, item) => sum + (item.quantity * item.price), 0),
        [invoiceItems]
    );

    // Handlers
    const handleCustomerSelect = useCallback((customerId: string) => {
        setSelectedCustomerId(customerId);
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            setRecipientName(customer.name);
            setRecipientAddress(customer.address || '');
            setRecipientPhone(customer.phone || '');
            setRecipientEmail(customer.email || '');
        }
        // Reset SJ selection when customer changes
        setSelectedSJIds(new Set());
        setItemPrices({});
    }, [customers]);

    const toggleSJ = useCallback((sjId: string) => {
        setSelectedSJIds(prev => {
            const next = new Set(prev);
            if (next.has(sjId)) {
                next.delete(sjId);
                // Clear prices for removed SJ items
                setItemPrices(prevPrices => {
                    const updated = { ...prevPrices };
                    for (const key of Object.keys(updated)) {
                        if (key.startsWith(sjId + '_')) delete updated[key];
                    }
                    return updated;
                });
            } else {
                next.add(sjId);
            }
            return next;
        });
    }, []);

    const selectAllSJ = useCallback(() => {
        if (selectedSJIds.size === filteredSuratJalans.length) {
            setSelectedSJIds(new Set());
            setItemPrices({});
        } else {
            setSelectedSJIds(new Set(filteredSuratJalans.map(sj => sj.id)));
        }
    }, [filteredSuratJalans, selectedSJIds.size]);

    const handlePriceChange = useCallback((sjId: string, sjItemId: string, price: number) => {
        const key = `${sjId}_${sjItemId}`;
        setItemPrices(prev => ({ ...prev, [key]: price }));
    }, []);

    const handleSubmit = () => {
        const items = invoiceItems.map(item => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            total: item.quantity * item.price,
            suratJalanId: item.sjId,
            suratJalanNumber: item.sjNumber,
        }));

        onSubmit({
            customerId: selectedCustomerId || null,
            recipientName,
            recipientAddress,
            dueDate,
            items,
            totalAmount: subtotal,
            suratJalanIds: Array.from(selectedSJIds),
        });
    };

    const hasUnpricedItems = invoiceItems.some(item => item.price <= 0);
    const canSubmit = selectedSJIds.size > 0 && invoiceItems.length > 0 && !hasUnpricedItems && !!recipientName;

    return (
        <div className="space-y-6">
            {/* ═══════════════════════════════════════════ */}
            {/* STEP 1: PELANGGAN & TANGGAL                */}
            {/* ═══════════════════════════════════════════ */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2">
                    <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Pilih Pelanggan</h3>
                </div>

                <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-600 font-medium text-xs uppercase tracking-wider">Nama Pelanggan</Label>
                            <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                                <SelectTrigger className="w-full bg-white border-gray-200 rounded-xl h-11 focus:ring-indigo-100 focus:border-indigo-300">
                                    <SelectValue placeholder="Cari pelanggan..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-gray-100 shadow-lg max-h-60">
                                    {customers.map(c => (
                                        <SelectItem
                                            key={c.id}
                                            value={c.id}
                                            className="focus:bg-indigo-50 focus:text-indigo-600 rounded-lg cursor-pointer py-2.5 my-0.5 mx-1"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-3 h-3 text-indigo-600" />
                                                </div>
                                                <span className="font-medium">{c.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-600 font-medium text-xs uppercase tracking-wider">Tanggal Jatuh Tempo</Label>
                            <DateInput
                                value={dueDate}
                                onChange={(value) => setDueDate(value)}
                                placeholder="Pilih tanggal jatuh tempo"
                                disablePast
                                className="bg-white"
                            />
                        </div>
                    </div>

                    {/* Customer info card */}
                    {selectedCustomerId && (
                        <div className="bg-white rounded-xl p-4 border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Nama</p>
                                    <p className="font-medium text-sm">{recipientName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Telepon</p>
                                    <p className="font-medium text-sm">{recipientPhone || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Email</p>
                                    <p className="font-medium text-sm">{recipientEmail || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground mb-1">Alamat</p>
                                    <p className="font-medium text-sm truncate" title={recipientAddress}>{recipientAddress || '-'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* STEP 2: PILIH SURAT JALAN                  */}
            {/* ═══════════════════════════════════════════ */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${selectedCustomerId ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}>2</div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Pilih Surat Jalan</h3>
                    </div>
                    {selectedSJIds.size > 0 && (
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100 animate-in fade-in zoom-in duration-200">
                            {selectedSJIds.size} SJ dipilih
                        </span>
                    )}
                </div>

                {!selectedCustomerId ? (
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8 text-center">
                        <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-400 font-medium">Pilih pelanggan terlebih dahulu</p>
                    </div>
                ) : sjLoading ? (
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-8 text-center">
                        <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
                        <p className="text-sm text-gray-400">Memuat surat jalan...</p>
                    </div>
                ) : suratJalans.length === 0 ? (
                    <div className="bg-amber-50 rounded-2xl border border-amber-200 p-8 text-center">
                        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                        <p className="text-sm text-amber-700 font-bold">Tidak ada Surat Jalan</p>
                        <p className="text-xs text-amber-500 mt-1">Pelanggan ini belum memiliki Surat Jalan B2B yang completed.</p>
                        <p className="text-xs text-amber-500">Invoice tidak bisa dibuat tanpa Surat Jalan.</p>
                    </div>
                ) : (
                    <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-4 space-y-3">
                        {/* Search + Select All */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Cari nomor SJ atau produk..."
                                    value={sjSearch}
                                    onChange={e => setSjSearch(e.target.value)}
                                    className="pl-9 bg-white border-gray-200 rounded-xl h-10 text-sm"
                                />
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={selectAllSJ}
                                className="rounded-xl text-xs h-10 px-4 border-gray-200"
                            >
                                {selectedSJIds.size === filteredSuratJalans.length ? 'Batal Semua' : 'Pilih Semua'}
                            </Button>
                        </div>

                        {/* SJ Cards */}
                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                            {filteredSuratJalans.map(sj => {
                                const isSelected = selectedSJIds.has(sj.id);
                                const itemCount = sj.items.length;
                                const sjDate = format(new Date(sj.created_at), 'dd MMM yyyy', { locale: idLocale });

                                return (
                                    <div
                                        key={sj.id}
                                        onClick={() => toggleSJ(sj.id)}
                                        className={`
                                            relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer
                                            transition-all duration-200 group
                                            ${isSelected
                                                ? 'bg-indigo-50 border-indigo-300 shadow-sm ring-1 ring-indigo-200'
                                                : 'bg-white border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30'
                                            }
                                        `}
                                    >
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSJ(sj.id)}
                                            className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                        />
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-sm ${isSelected ? 'text-indigo-700' : 'text-gray-900'}`}>{sj.number}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    sj.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                                    sj.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>{sj.status}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" /> {sjDate}
                                                </span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Package className="w-3 h-3" /> {itemCount} item
                                                </span>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="h-6 w-6 rounded-full bg-indigo-600 flex items-center justify-center animate-in zoom-in duration-200">
                                                <Check className="w-3.5 h-3.5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════ */}
            {/* STEP 3: DETAIL ITEM & HARGA                */}
            {/* ═══════════════════════════════════════════ */}
            {selectedSJIds.size > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">3</div>
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Detail Item & Harga</h3>
                        </div>
                        <span className="text-xs text-gray-400">{invoiceItems.length} item dari {selectedSJIds.size} SJ</span>
                    </div>

                    {hasUnpricedItems && (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <p className="text-xs text-amber-700 font-medium">Lengkapi harga untuk semua item sebelum menyimpan invoice.</p>
                        </div>
                    )}

                    <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-gray-50/80">
                                <TableRow className="border-b border-gray-100">
                                    <TableHead className="py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Produk</TableHead>
                                    <TableHead className="py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">No. SJ</TableHead>
                                    <TableHead className="py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Qty</TableHead>
                                    <TableHead className="py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Unit</TableHead>
                                    <TableHead className="py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right w-[180px]">Harga Satuan</TableHead>
                                    <TableHead className="py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoiceItems.map((item, idx) => {
                                    const lineTotal = item.quantity * item.price;
                                    return (
                                        <TableRow key={`${item.sjId}_${item.sjItemId}`} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <TableCell className="font-medium text-gray-800 text-sm max-w-[200px]">
                                                <span className="truncate block" title={item.productName}>{item.productName}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md">{item.sjNumber}</span>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-gray-900">{item.quantity}</TableCell>
                                            <TableCell className="text-center text-gray-500 text-sm">{item.unit}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="relative inline-flex items-center">
                                                    <span className="absolute left-3 text-xs text-gray-400 pointer-events-none">Rp</span>
                                                    <Input
                                                        isCurrency
                                                        type="number"
                                                        min="0"
                                                        step="any"
                                                        className={`pl-8 w-[150px] h-9 text-right text-sm rounded-lg border-gray-200 focus:ring-indigo-200 focus:border-indigo-400 ${item.price <= 0 ? 'border-amber-300 bg-amber-50' : 'bg-white'}`}
                                                        value={item.price || ''}
                                                        placeholder="0"
                                                        onChange={e => handlePriceChange(item.sjId, item.sjItemId, Number(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-gray-900 tabular-nums">
                                                {lineTotal > 0 ? `Rp ${lineTotal.toLocaleString('id-ID')}` : '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Summary */}
                    <div className="flex justify-end pt-2">
                        <div className="w-full md:w-2/5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="font-medium text-gray-900 tabular-nums">Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Surat Jalan</span>
                                <span className="font-medium text-gray-600">{selectedSJIds.size} dokumen</span>
                            </div>
                            <div className="border-t border-gray-100 pt-3 mt-1 flex justify-between items-center">
                                <span className="font-bold text-lg text-gray-900">Total</span>
                                <span className="font-bold text-xl text-indigo-600 tabular-nums">Rp {subtotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <Button variant="outline" onClick={onCancel} className="rounded-xl border-gray-200 h-11 px-6">
                    Batal
                </Button>
                <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="rounded-xl h-11 px-8 shadow-lg bg-indigo-600 hover:bg-indigo-700 gap-2 transition-all"
                >
                    <FileText className="w-4 h-4" />
                    Simpan Invoice
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
