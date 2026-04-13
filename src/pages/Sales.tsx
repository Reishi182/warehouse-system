
import { useMemo, useState } from 'react';
import { Package, Trash2, ShoppingCart, Plus, Minus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import PageSkeleton from '@/components/common/PageSkeleton';
import { Button } from '@/components/ui/button';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useDataStore } from '@/store/useDataStore';
import { useToast } from '@/hooks/use-toast';
import { Location, PaymentMethod, Product } from '@/types';

type CartItem = {
  product: Product;
  quantity: number;
};

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function Sales() {
  const getProductByBarcode = useDataStore(s => s.getProductByBarcode);
    const createSale = useDataStore(s => s.createSale);
    const loading = useDataStore(s => s.loading);
  const { toast } = useToast();

  const [stockLocation, setStockLocation] = useState<Location>('toko');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [items, setItems] = useState<CartItem[]>([]);

  const totalAmount = useMemo(() => {
    return items.reduce((acc, it) => acc + it.product.price * it.quantity, 0);
  }, [items]);

  if (loading) {
    return (
      <MainLayout title="Penjualan" subtitle="Input penjualan baru">
        <PageSkeleton variant="form" />
      </MainLayout>
    );
  }

  const handleScan = (barcode: string) => {
    const product = getProductByBarcode(barcode);
    if (!product) {
      toast({ title: 'Produk tidak ditemukan', description: `Barcode: ${barcode}`, variant: 'destructive' });
      return;
    }

    setItems((prev) => {
      const idx = prev.findIndex((it) => it.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };


  const updateQty = (productId: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((it) => (it.product.id === productId ? { ...it, quantity: qty } : it))
        .filter((it) => it.quantity > 0),
    );
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((it) => it.product.id !== productId));
  };

  const handleCreateSale = async () => {
    const ok = await createSale({
      paymentMethod,
      stockLocation,
      items: items.map((it) => ({ productId: it.product.id, quantity: it.quantity })),
    });

    if (!ok) return;

    toast({
      title: 'Penjualan tersimpan',
      description: `Total Rp ${totalAmount.toLocaleString('id-ID')} (${paymentMethod})`,
    });

    setItems([]);
  };

  return (
    <MainLayout title="Penjualan" subtitle="Buat invoice penjualan (cash / transfer)">
      <div className="space-y-6">

        <div className="space-y-6">
          <Card className="rounded-3xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Scan Produk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Barcode</Label>
                <BarcodeScanner onScan={handleScan} placeholder="Scan atau masukkan barcode" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lokasi Stok Keluar</Label>
                  <Select value={stockLocation} onValueChange={(v: Location) => setStockLocation(v)}>
                    <SelectTrigger className="rounded-xl h-11 bg-white border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="gudang" className="rounded-lg cursor-pointer my-1">Gudang</SelectItem>
                      <SelectItem value="toko" className="rounded-lg cursor-pointer my-1">Toko</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Metode Pembayaran</Label>
                  <Select value={paymentMethod} onValueChange={(v: PaymentMethod) => setPaymentMethod(v)}>
                    <SelectTrigger className="rounded-xl h-11 bg-white border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="cash" className="rounded-lg cursor-pointer my-1">Cash</SelectItem>
                      <SelectItem value="transfer" className="rounded-lg cursor-pointer my-1">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-gray-100 shadow-sm animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Item Penjualan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  Scan produk untuk menambahkan item.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>Harga</th>
                        <th className="text-center">Qty</th>
                        <th className="text-right">Subtotal</th>
                        <th className="text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={it.product.id}>
                          <td>
                            <p className="font-medium">{it.product.name}</p>
                            <p className="text-xs text-muted-foreground">{it.product.barcode}</p>
                          </td>
                          <td className="font-semibold">Rp {it.product.price.toLocaleString('id-ID')}</td>
                          <td className="text-center">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => updateQty(it.product.id, it.quantity - 1)}
                                className="rounded-full h-8 w-8"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Input
                                type="number"
                                min={0}
                                value={it.quantity}
                                onChange={(e) => updateQty(it.product.id, parseFloat(e.target.value) || 0)}
                                className="w-16 text-center h-8 rounded-lg"
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => updateQty(it.product.id, it.quantity + 1)}
                                className="rounded-full h-8 w-8"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="text-right font-semibold">
                            Rp {(it.product.price * it.quantity).toLocaleString('id-ID')}
                          </td>
                          <td className="text-right">
                            <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600 rounded-full" onClick={() => removeItem(it.product.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="text-sm text-gray-500">
                  Tanggal: {toISODate(new Date())}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-indigo-600">Rp {totalAmount.toLocaleString('id-ID')}</p>
                </div>
              </div>

              <Button
                className="w-full mt-4 rounded-xl h-12 text-lg font-semibold shadow-lg shadow-indigo-100"
                size="lg"
                disabled={items.length === 0 || totalAmount <= 0}
                onClick={handleCreateSale}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Simpan Penjualan
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
