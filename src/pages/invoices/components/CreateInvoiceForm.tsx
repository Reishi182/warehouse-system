
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, Customer } from '@/types';
import ProductSearchSelect from '@/components/common/ProductSearchSelect';
import { Plus, Trash2, Check, User } from 'lucide-react';
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

interface CreateInvoiceFormProps {
    onSubmit: (data: any) => void;
    onCancel: () => void;
}

export default function CreateInvoiceForm({ onSubmit, onCancel }: CreateInvoiceFormProps) {
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [dueDate, setDueDate] = useState('');

    // Item Selection
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [price, setPrice] = useState<number>(0);

    const [items, setItems] = useState<any[]>([]);

    // Fetch Products (paginated to bypass Supabase 1000-row limit)
    const { data: products = [] } = useQuery({
        queryKey: ['products-available-for-invoice'],
        queryFn: async () => {
            const PAGE_SIZE = 1000;
            let allData: any[] = [];
            let from = 0;
            let hasMore = true;
            while (hasMore) {
                const { data } = await supabase.from('products').select('*').range(from, from + PAGE_SIZE - 1);
                allData = allData.concat(data || []);
                if (!data || data.length < PAGE_SIZE) { hasMore = false; } else { from += PAGE_SIZE; }
            }
            return allData as Product[];
        }
    });

    // Fetch Customers
    const { data: customers = [] } = useQuery({
        queryKey: ['customers-list'],
        queryFn: async () => {
            const { data } = await supabase.from('customers').select('*');
            return data as Customer[];
        }
    });

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

    const handleProductSelect = (productId: string) => {
        setSelectedProduct(productId);
        const product = products.find(p => p.id === productId);
        if (product) {
            setPrice(product.price);
        }
    };

    const handleAddItem = () => {
        if (!selectedProduct || quantity <= 0 || price < 0) return;
        const product = products.find(p => p.id === selectedProduct);
        if (!product) return;

        const newItem = {
            productId: product.id,
            productName: product.name,
            quantity,
            price,
            total: quantity * price
        };

        setItems([...items, newItem]);
        setSelectedProduct('');
        setQuantity(1);
        setPrice(0);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + item.total, 0);
    };

    const handleSubmit = () => {
        onSubmit({
            customerId: selectedCustomerId || null,
            recipientName,
            recipientAddress,
            dueDate,
            items,
            totalAmount: calculateTotal(),
        });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                {/* Customer Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-gray-600 font-medium">Pilih Pelanggan</Label>
                        <Select value={selectedCustomerId} onValueChange={handleCustomerSelect}>
                            <SelectTrigger className="w-full bg-white border-gray-200 rounded-xl h-11 focus:ring-indigo-100 focus:border-indigo-300">
                                <SelectValue placeholder="Cari pelanggan..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-gray-100 shadow-lg">
                                {customers.map(c => (
                                    <SelectItem
                                        key={c.id}
                                        value={c.id}
                                        className="focus:bg-indigo-50 focus:text-indigo-600 rounded-lg cursor-pointer py-2.5 my-1 mx-1"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center">
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
                        <Label className="text-gray-600 font-medium">Tanggal Jatuh Tempo</Label>
                        <DateInput
                            value={dueDate}
                            onChange={(value) => setDueDate(value)}
                            placeholder="Pilih tanggal jatuh tempo"
                            disablePast
                            className="bg-white"
                        />
                    </div>
                </div>

                {/* Auto-filled customer info */}
                {selectedCustomerId && (
                    <div className="bg-white rounded-xl p-4 space-y-3 border border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Nama Penerima</p>
                                <p className="font-medium text-sm">{recipientName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">No. Telepon</p>
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

            <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Detail Item</h3>
                    <span className="text-xs text-gray-400">{items.length} item ditambahkan</span>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-end bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex-1 space-y-2 w-full">
                        <Label className="text-xs font-semibold text-gray-500 uppercase">Produk</Label>
                        <ProductSearchSelect
                            products={products}
                            value={selectedProduct}
                            onChange={handleProductSelect}
                            placeholder="Cari produk..."
                            excludeIds={items.map((i: any) => i.productId)}
                        />
                    </div>

                    <div className="w-full md:w-24 space-y-2">
                        <Label className="text-xs font-semibold text-gray-500 uppercase">Qty</Label>
                        <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={e => setQuantity(Number(e.target.value))}
                            className="bg-white border-gray-200 rounded-lg h-10 text-center"
                        />
                    </div>

                    <div className="w-full md:w-40 space-y-2">
                        <Label className="text-xs font-semibold text-gray-500 uppercase">Harga</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs text-gray-400">Rp</span>
                            <Input isCurrency
                                type="number"
                                min="0"
                                className="pl-8 bg-white border-gray-200 rounded-lg h-10"
                                value={price}
                                onChange={e => setPrice(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <Button onClick={handleAddItem} disabled={!selectedProduct} className="h-10 px-4 rounded-lg shadow-sm">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>

                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-gray-50/50">
                            <TableRow className="border-b border-gray-100">
                                <TableHead className="py-3 text-xs font-semibold text-gray-500 uppercase">Produk</TableHead>
                                <TableHead className="py-3 text-xs font-semibold text-gray-500 uppercase text-center">Qty</TableHead>
                                <TableHead className="py-3 text-xs font-semibold text-gray-500 uppercase text-right">Harga</TableHead>
                                <TableHead className="py-3 text-xs font-semibold text-gray-500 uppercase text-right">Total</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, idx) => (
                                <TableRow key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                                    <TableCell className="font-medium text-gray-700">{item.productName}</TableCell>
                                    <TableCell className="text-center text-gray-600">{item.quantity}</TableCell>
                                    <TableCell className="text-right text-gray-600">{item.price.toLocaleString()}</TableCell>
                                    <TableCell className="text-right font-bold text-gray-900">{item.total.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full" onClick={() => handleRemoveItem(idx)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {items.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-32 text-gray-400 text-sm">
                                        Belum ada item ditambahkan
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex justify-end pt-2">
                    <div className="w-full md:w-1/3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="font-medium text-gray-900">Rp {calculateTotal().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Pajak (0%)</span>
                            <span className="font-medium text-gray-900">Rp 0</span>
                        </div>
                        <div className="border-t border-gray-100 pt-3 mt-1 flex justify-between items-center">
                            <span className="font-bold text-lg text-gray-900">Total</span>
                            <span className="font-bold text-xl text-indigo-600">Rp {calculateTotal().toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <Button variant="outline" onClick={onCancel} className="rounded-xl border-gray-200 h-11 px-6">Batal</Button>
                <Button onClick={handleSubmit} disabled={items.length === 0 || !recipientName} className="rounded-xl h-11 px-8 shadow-lg">
                    Simpan Invoice
                </Button>
            </div>
        </div>
    );
}
