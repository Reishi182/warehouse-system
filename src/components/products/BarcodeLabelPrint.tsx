import { useState, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Product } from '@/types';
import { Printer, Barcode, Search, X, Minus, Plus } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import JsBarcode from 'jsbarcode';
import { useEffect } from 'react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: Product[];
}

interface LabelItem {
  product: Product;
  quantity: number;
}

function BarcodeCanvas({ value, width = 1.5, height = 40 }: { value: string; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
          format: 'CODE128',
          displayValue: false,
          width,
          height,
          margin: 2,
        });
      } catch {
        // invalid barcode
      }
    }
  }, [value, width, height]);

  return <canvas ref={canvasRef} />;
}

export default function BarcodeLabelPrint({ open, onOpenChange, products }: Props) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<LabelItem[]>([]);
  const [labelSize, setLabelSize] = useState<'small' | 'medium'>('medium');
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Label-Barcode',
  });

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode.includes(search)
  ).slice(0, 50);

  const addProduct = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeProduct = (id: string) => setItems(prev => prev.filter(i => i.product.id !== id));
  const updateQty = (id: string, qty: number) => setItems(prev => prev.map(i => i.product.id === id ? { ...i, quantity: Math.max(1, qty) } : i));

  const totalLabels = items.reduce((s, i) => s + i.quantity, 0);

  const labelWidthClass = labelSize === 'small' ? 'w-[50mm]' : 'w-[65mm]';
  const labelHeightClass = labelSize === 'small' ? 'h-[25mm]' : 'h-[35mm]';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-primary" />
            Cetak Label Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari produk (nama/barcode)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>

          {/* Product picker */}
          {search && (
            <div className="border rounded-xl max-h-48 overflow-y-auto divide-y">
              {filtered.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground text-sm">Tidak ditemukan</p>
              ) : filtered.map(p => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-muted/50 transition-colors text-left text-sm"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.barcode}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Rp {p.price.toLocaleString('id-ID')}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Selected items */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Produk Dipilih ({items.length})</h4>
                <Badge variant="secondary" className="text-xs">
                  {totalLabels} label
                </Badge>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {items.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 p-2.5 rounded-xl border bg-card">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.product.barcode}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQty(item.product.id, item.quantity - 1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateQty(item.product.id, parseInt(e.target.value) || 1)}
                        className="w-14 h-7 text-center text-sm rounded-lg"
                      />
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => updateQty(item.product.id, item.quantity + 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeProduct(item.product.id)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Size selector */}
          <div className="flex items-center gap-4">
            <Label className="text-sm">Ukuran Label:</Label>
            <div className="flex gap-2">
              <Button variant={labelSize === 'small' ? 'default' : 'outline'} size="sm" className="rounded-xl" onClick={() => setLabelSize('small')}>
                Kecil (50×25mm)
              </Button>
              <Button variant={labelSize === 'medium' ? 'default' : 'outline'} size="sm" className="rounded-xl" onClick={() => setLabelSize('medium')}>
                Sedang (65×35mm)
              </Button>
            </div>
          </div>

          {/* Print button */}
          <Button className="w-full rounded-xl" disabled={items.length === 0} onClick={() => handlePrint()}>
            <Printer className="w-4 h-4 mr-2" />
            Cetak {totalLabels} Label
          </Button>

          {/* Print preview (hidden on screen) */}
          <div className="hidden print:hidden">
            <div ref={printRef} className="flex flex-wrap gap-0 p-0 m-0" style={{ fontFamily: 'Arial, sans-serif' }}>
              {items.flatMap(item =>
                Array.from({ length: item.quantity }, (_, idx) => (
                  <div
                    key={`${item.product.id}-${idx}`}
                    className={`${labelWidthClass} ${labelHeightClass} border border-gray-300 flex flex-col items-center justify-center p-1 overflow-hidden`}
                    style={{ pageBreakInside: 'avoid' }}
                  >
                    <p className="text-[9px] font-bold text-center leading-tight truncate w-full" style={{ maxHeight: '2.5em', overflow: 'hidden' }}>
                      {item.product.name}
                    </p>
                    <BarcodeCanvas
                      value={item.product.barcode}
                      width={labelSize === 'small' ? 1 : 1.4}
                      height={labelSize === 'small' ? 25 : 32}
                    />
                    <p className="text-[8px] font-mono text-center">{item.product.barcode}</p>
                    <p className="text-[10px] font-bold text-center">
                      Rp {item.product.price.toLocaleString('id-ID')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Visual preview */}
          {items.length > 0 && (
            <div className="border rounded-xl p-3">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Preview Label</h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {items.slice(0, 4).map(item => (
                  <div
                    key={`preview-${item.product.id}`}
                    className="border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-2 min-w-[140px]"
                  >
                    <p className="text-[9px] font-bold text-center leading-tight truncate w-full">{item.product.name}</p>
                    <BarcodeCanvas value={item.product.barcode} width={1} height={24} />
                    <p className="text-[7px] font-mono text-muted-foreground">{item.product.barcode}</p>
                    <p className="text-[10px] font-bold">Rp {item.product.price.toLocaleString('id-ID')}</p>
                    <Badge variant="secondary" className="text-[8px] mt-0.5">×{item.quantity}</Badge>
                  </div>
                ))}
                {items.length > 4 && (
                  <div className="flex items-center text-xs text-muted-foreground">+{items.length - 4} lagi...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
