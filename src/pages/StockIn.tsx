
import { useState } from 'react';
import { Package, Plus, Check, ArrowDownToLine } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import PageSkeleton from '@/components/common/PageSkeleton';
import LocationBadge from '@/components/common/LocationBadge';
import { Button } from '@/components/ui/button';
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
import { Product, Location } from '@/types';

export default function StockIn() {
  const getProductByBarcode = useDataStore(s => s.getProductByBarcode);
    const addStock = useDataStore(s => s.addStock);
    const loading = useDataStore(s => s.loading);
  const { toast } = useToast();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [location, setLocation] = useState<Location>('gudang');
  const [confirmed, setConfirmed] = useState(false);

  // Multi-unit helpers
  const [mainQty, setMainQty] = useState(0);
  const [subQty, setSubQty] = useState(0);

  if (loading) {
    return (
      <MainLayout title="Stok Masuk" subtitle="Tambah stok produk ke inventaris">
        <PageSkeleton variant="form" />
      </MainLayout>
    );
  }

  const handleBarcodeScanned = (barcode: string) => {
    const product = getProductByBarcode(barcode);
    if (product) {
      setSelectedProduct(product);
      setConfirmed(false);
      setQuantity(1);
      setMainQty(0);
      setSubQty(0);
      toast({
        title: 'Produk ditemukan',
        description: product.name,
      });
    } else {
      setSelectedProduct(null);
      toast({
        title: 'Produk tidak ditemukan',
        description: 'Barcode: ' + barcode,
        variant: 'destructive',
      });
    }
  };

  const handleAddStock = () => {
    if (!selectedProduct || quantity <= 0) {
      toast({
        title: 'Data tidak valid',
        description: 'Pilih produk dan masukkan jumlah yang valid',
        variant: 'destructive',
      });
      return;
    }

    addStock(selectedProduct.id, quantity, location);

    toast({
      title: 'Stok berhasil ditambahkan',
      description: `${quantity} ${selectedProduct.name} ditambahkan ke ${location}`,
    });

    // Reset form
    setSelectedProduct(null);
    setQuantity(1);
    setConfirmed(false);
  };

  return (
    <MainLayout title="Stok Masuk" subtitle="Tambah stok produk ke inventaris">
      <div className="space-y-6">


        <div className="space-y-6">
          {/* Scanner */}
          <Card className="rounded-3xl border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Scan Produk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarcodeScanner
                onScan={handleBarcodeScanned}
                placeholder="Scan atau masukkan barcode produk"
              />
            </CardContent>
          </Card>

          {/* Selected Product */}
          {selectedProduct && (
            <Card className="rounded-3xl border-indigo-100 shadow-sm animate-slide-up">
              <CardHeader className="bg-indigo-50/50 rounded-t-3xl border-b border-indigo-50">
                <CardTitle className="text-lg text-indigo-900">Produk Dipilih</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                  <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Package className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg text-gray-900">{selectedProduct.name}</p>
                    <p className="text-sm text-gray-500 font-mono">
                      Barcode: {selectedProduct.barcode}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-2xl font-bold text-gray-900">{selectedProduct.stock.gudang}</p>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Gudang</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-2xl font-bold text-gray-900">{selectedProduct.stock.toko}</p>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Toko</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-gray-700 font-semibold">Jumlah Masuk</Label>
                    
                    {selectedProduct.has_multi_unit ? (
                      <div className="space-y-3">
                        <div className="flex gap-2 items-center">
                          <div className="flex-1 space-y-1">
                            <Input
                              type="number"
                              min={0}
                              value={mainQty || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setMainQty(val);
                                setQuantity((val * (selectedProduct.pcs_per_box || 1)) + subQty);
                              }}
                              className="h-11 text-center font-bold rounded-xl"
                              placeholder="0"
                            />
                            <p className="text-[10px] text-center text-muted-foreground uppercase">{selectedProduct.main_unit || 'UNIT'}</p>
                          </div>
                          <Plus className="w-4 h-4 text-muted-foreground mt-[-15px]" />
                          <div className="flex-1 space-y-1">
                            <Input
                              type="number"
                              min={0}
                              value={subQty || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setSubQty(val);
                                setQuantity((mainQty * (selectedProduct.pcs_per_box || 1)) + val);
                              }}
                              className="h-11 text-center rounded-xl"
                              placeholder="0"
                            />
                            <p className="text-[10px] text-center text-muted-foreground uppercase">{selectedProduct.sell_unit || 'UNIT'}</p>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex justify-between items-center text-xs">
                          <span className="text-indigo-600 font-medium">Total (Ecer):</span>
                          <span className="font-bold text-indigo-700">{quantity} {selectedProduct.sell_unit?.toUpperCase()}</span>
                        </div>
                      </div>
                    ) : (
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                        min={1}
                        className="rounded-xl h-11"
                      />
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label className="text-gray-700 font-semibold">Lokasi Tujuan</Label>
                    <Select value={location} onValueChange={(v: Location) => setLocation(v)}>
                      <SelectTrigger className="rounded-xl h-11 bg-white border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="gudang" className="cursor-pointer rounded-lg my-1">Gudang Utama</SelectItem>
                        <SelectItem value="toko" className="cursor-pointer rounded-lg my-1">Display Toko</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Confirmation */}
                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="w-5 h-5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-indigo-900">
                      Saya konfirmasi menambahkan <strong>{quantity} {selectedProduct.sell_unit?.toUpperCase()}</strong>{' '}
                      {selectedProduct.has_multi_unit && `(${mainQty} ${selectedProduct.main_unit?.toUpperCase()} + ${subQty} ${selectedProduct.sell_unit?.toUpperCase()}) `}
                      produk <strong>{selectedProduct.name}</strong> ke <strong className="capitalize">{location}</strong>
                    </span>
                  </label>
                </div>

                <Button
                  onClick={handleAddStock}
                  disabled={!confirmed || quantity <= 0}
                  className="w-full rounded-xl h-12 text-lg font-medium shadow-lg shadow-indigo-100"
                  size="lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Tambah Stok
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!selectedProduct && (
            <Card className="animate-fade-in border-dashed border-2 rounded-3xl bg-gray-50/50">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Scan Barcode untuk Memulai</h3>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Gunakan scanner barcode atau kamera untuk memindai produk yang akan ditambahkan stoknya.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
