
import { useState } from 'react';
import { Package, ArrowRight, Check, X, Trash2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import BarcodeScanner from '@/components/common/BarcodeScanner';
import PageSkeleton from '@/components/common/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { BeautifulTable } from '@/components/common/BeautifulTable';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useDataStore } from '@/store/useDataStore';
import { useRole } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Location, RequestStatus, StockRequestItem } from '@/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function StockRequests() {
  const products = useDataStore(s => s.products);
    const requests = useDataStore(s => s.requests);
    const getProductByBarcode = useDataStore(s => s.getProductByBarcode);
    const createStockOutRequest = useDataStore(s => s.createStockOutRequest);
    const updateRequestStatus = useDataStore(s => s.updateRequestStatus);
    const loading = useDataStore(s => s.loading);
  const role = useRole();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRejectRequestId, setSelectedRejectRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | RequestStatus>('all');

  // Multi-item request state
  const [requestItems, setRequestItems] = useState<StockRequestItem[]>([]);
  const [useSameLocation, setUseSameLocation] = useState(true); // Default active
  const [masterFromLocation, setMasterFromLocation] = useState<Location>('gudang');
  const [masterToLocation, setMasterToLocation] = useState<Location>('toko');

  if (loading) {
    return (
      <MainLayout title="Permintaan Stok" subtitle="Kelola permintaan stok keluar">
        <PageSkeleton variant="table" />
      </MainLayout>
    );
  }

  const canCreateRequest = role === 'warehouse' || role === 'admin';
  const canApproveRequest = role === 'cashier' || role === 'admin';

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  const getReservedStock = (productId: string, location: Location) => {
    return requests
      .filter(r => r.product_id === productId && r.from_location === location && (r.status === 'pending' || r.status === 'approved'))
      .reduce((acc, r) => acc + r.quantity, 0);
  };

  const getFormReservedStock = (productId: string, location: Location, excludeItemId?: string) => {
    return requestItems
      .filter(item => item.productId === productId && item.fromLocation === location && item.id !== excludeItemId)
      .reduce((acc, item) => acc + item.quantity, 0);
  };

  const handleBarcodeScanned = (barcode: string) => {
    const product = getProductByBarcode(barcode);
    if (product) {
      const existingItem = requestItems.find(item => item.productId === product.id);
      if (existingItem) {
        toast({
          title: 'Produk sudah ada',
          description: 'Produk ini sudah ada dalam daftar permintaan',
          variant: 'destructive',
        });
        return;
      }
      const newItem: StockRequestItem = {
        id: crypto.randomUUID(),
        productId: product.id,
        product,
        quantity: 1,
        fromLocation: useSameLocation ? masterFromLocation : 'gudang',
        toLocation: useSameLocation ? masterToLocation : 'toko',
      };
      setRequestItems([...requestItems, newItem]);
      toast({
        title: 'Produk ditambahkan',
        description: product.name,
      });
    } else {
      toast({
        title: 'Produk tidak ditemukan',
        description: 'Barcode: ' + barcode,
        variant: 'destructive',
      });
    }
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setRequestItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const updateItemFromLocation = (itemId: string, location: Location) => {
    setRequestItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, fromLocation: location } : item
      )
    );
  };

  const updateItemToLocation = (itemId: string, location: Location) => {
    setRequestItems(items =>
      items.map(item =>
        item.id === itemId ? { ...item, toLocation: location } : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setRequestItems(items => items.filter(item => item.id !== itemId));
  };

  const handleSameLocationChange = (checked: boolean) => {
    setUseSameLocation(checked);
    if (checked) {
      setRequestItems(items =>
        items.map(item => ({
          ...item,
          fromLocation: masterFromLocation,
          toLocation: masterToLocation,
        }))
      );
    }
  };

  const handleMasterFromChange = (location: Location) => {
    setMasterFromLocation(location);
    if (useSameLocation) {
      setRequestItems(items =>
        items.map(item => ({ ...item, fromLocation: location }))
      );
    }
  };

  const handleMasterToChange = (location: Location) => {
    setMasterToLocation(location);
    if (useSameLocation) {
      setRequestItems(items =>
        items.map(item => ({ ...item, toLocation: location }))
      );
    }
  };

  const handleCreateRequests = () => {
    if (requestItems.length === 0) {
      toast({
        title: 'Tidak ada item',
        description: 'Tambahkan minimal satu produk',
        variant: 'destructive',
        duration: 3000
      });
      return;
    }
    for (const item of requestItems) {
      createStockOutRequest({
        productId: item.productId,
        quantity: item.quantity,
        fromLocation: item.fromLocation,
        toLocation: item.toLocation,
      });
    }
    toast({
      title: 'Permintaan dibuat',
      description: `${requestItems.length} permintaan berhasil dibuat`,
    });
    setDialogOpen(false);
    setRequestItems([]);
  };

  const handleApproveRequest = (requestId: string) => {
    updateRequestStatus(requestId, 'approved');
    toast({
      title: 'Permintaan disetujui',
      description: 'Permintaan stok berhasil disetujui',
    });
  };

  const openRejectDialog = (requestId: string) => {
    setSelectedRejectRequestId(requestId);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectRequest = () => {
    if (!selectedRejectRequestId) return;
    if (!rejectReason.trim()) {
      toast({
        title: 'Alasan diperlukan',
        description: 'Masukkan alasan penolakan',
        variant: 'destructive',
      });
      return;
    }
    updateRequestStatus(selectedRejectRequestId, 'rejected', rejectReason);
    toast({
      title: 'Permintaan ditolak',
      description: 'Permintaan stok berhasil ditolak',
    });
    setRejectDialogOpen(false);
    setSelectedRejectRequestId(null);
    setRejectReason('');
  };

  const filteredRequests = requests.filter(r =>
    activeTab === 'all' ? true : r.status === activeTab
  );

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) setRequestItems([]);
  };

  const columns = [
    {
      header: 'ID',
      accessorKey: 'id',
      cell: (item: any) => <code className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">{item.id.slice(0, 8)}</code>
    },
    {
      header: 'Produk',
      cell: (item: any) => (
        <div className="flex items-center gap-3">
          {item.product?.image_url ? (
            <img src={item.product.image_url} alt={item.product?.name} className="w-10 h-10 rounded-lg object-cover bg-gray-50 border border-gray-100" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Package className="w-5 h-5" />
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{item.product?.name || 'Unknown'}</p>
            <p className="text-xs text-gray-500">{item.product?.barcode}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Jumlah',
      accessorKey: 'quantity',
      className: 'text-center font-bold text-gray-900'
    },
    {
      header: 'Transfer',
      cell: (item: any) => (
        <div className="flex items-center gap-2 text-sm">
          <span className="capitalize text-gray-600">{item.from_location}</span>
          <ArrowRight className="w-3 h-3 text-gray-400" />
          <span className="capitalize text-gray-600">{item.to_location}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item: any) => {
        const styles: any = {
          pending: 'bg-yellow-50 text-yellow-600 border border-yellow-100',
          approved: 'bg-green-50 text-green-600 border border-green-100',
          rejected: 'bg-red-50 text-red-600 border border-red-100',
          completed: 'bg-blue-50 text-blue-600 border border-blue-100'
        };
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${styles[item.status]}`}>
            {item.status.toUpperCase()}
          </span>
        );
      }
    },
    {
      header: 'Waktu',
      accessorKey: 'requested_at',
      cell: (item: any) => format(new Date(item.requested_at), 'dd MMM HH:mm', { locale: id })
    },
    {
      header: '',
      cell: (item: any) => canApproveRequest && item.status === 'pending' && (
        <div className="flex items-center justify-end gap-2">
          <Button size="icon" className="h-8 w-8 rounded-full bg-green-50 text-green-600 hover:bg-green-100" onClick={() => handleApproveRequest(item.id)}>
            <Check className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => openRejectDialog(item.id)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <MainLayout title="Permintaan Stok" subtitle="Kelola permintaan stok keluar">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap bg-gray-100 rounded-xl p-1">
              <TabsTrigger value="all" className="rounded-lg text-xs sm:text-sm px-2 sm:px-3">Semua</TabsTrigger>
              <TabsTrigger value="pending" className="rounded-lg text-xs sm:text-sm px-2 sm:px-3">Pending</TabsTrigger>
              <TabsTrigger value="approved" className="rounded-lg text-xs sm:text-sm px-2 sm:px-3">Setujui</TabsTrigger>
              <TabsTrigger value="completed" className="rounded-lg text-xs sm:text-sm px-2 sm:px-3">Selesai</TabsTrigger>
              <TabsTrigger value="rejected" className="rounded-lg text-xs sm:text-sm px-2 sm:px-3">Tolak</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <BeautifulTable
          data={filteredRequests}
          columns={columns}
          title="Daftar Permintaan"
          subtitle="Manage stock transfer requests"
          onAdd={canCreateRequest ? () => setDialogOpen(true) : undefined}
          addButtonLabel="Buat Permintaan"
        />

        {canCreateRequest && (
          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
              <DialogHeader>
                <DialogTitle>Buat Permintaan Stok Keluar</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">

                <div className="space-y-2">
                  <Label>Scan Produk</Label>
                  <BarcodeScanner onScan={handleBarcodeScanned} placeholder="Scan barcode..." />
                </div>

                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <Checkbox
                    id="sameLocation"
                    checked={useSameLocation}
                    onCheckedChange={(checked) => handleSameLocationChange(!!checked)}
                    className="rounded-md"
                  />
                  <Label htmlFor="sameLocation" className="cursor-pointer">
                    Gunakan lokasi yang sama untuk semua item
                  </Label>
                </div>

                {useSameLocation && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <div className="space-y-2">
                      <Label>Dari Lokasi</Label>
                      <Select value={masterFromLocation} onValueChange={(v: Location) => handleMasterFromChange(v)}>
                        <SelectTrigger className="bg-white border-gray-200 rounded-xl h-10"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="gudang" className="rounded-lg cursor-pointer my-1 text-sm">Gudang</SelectItem>
                          <SelectItem value="toko" className="rounded-lg cursor-pointer my-1 text-sm">Toko</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ke Lokasi</Label>
                      <Select value={masterToLocation} onValueChange={(v: Location) => handleMasterToChange(v)}>
                        <SelectTrigger className="bg-white border-gray-200 rounded-xl h-10"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="gudang" className="rounded-lg cursor-pointer my-1 text-sm">Gudang</SelectItem>
                          <SelectItem value="toko" className="rounded-lg cursor-pointer my-1 text-sm">Toko</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Items List Rendering */}
                {requestItems.length > 0 && (
                  <div className="space-y-3">
                    {requestItems.map(item => (
                      <div key={item.id} className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{item.product?.name}</p>
                              <p className="text-xs text-gray-500">{item.product?.barcode}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="h-8 w-8 text-red-400 hover:bg-red-50 rounded-full">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex gap-4 items-center">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(item.id, parseFloat(e.target.value))}
                            className="w-20 h-9 rounded-lg"
                          />
                          {!useSameLocation && (
                            <div className="flex items-center gap-2 flex-1">
                              <Select value={item.fromLocation} onValueChange={(v: Location) => updateItemFromLocation(item.id, v)}>
                                <SelectTrigger className="h-9 text-xs rounded-lg border-gray-200"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="gudang" className="rounded-lg text-xs">Gudang</SelectItem>
                                  <SelectItem value="toko" className="rounded-lg text-xs">Toko</SelectItem>
                                </SelectContent>
                              </Select>
                              <ArrowRight className="w-3 h-3 text-gray-400" />
                              <Select value={item.toLocation} onValueChange={(v: Location) => updateItemToLocation(item.id, v)}>
                                <SelectTrigger className="h-9 text-xs rounded-lg border-gray-200"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  <SelectItem value="gudang" className="rounded-lg text-xs">Gudang</SelectItem>
                                  <SelectItem value="toko" className="rounded-lg text-xs">Toko</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button onClick={handleCreateRequests} className="w-full rounded-xl" disabled={requestItems.length === 0}>
                  Kirim Permintaan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle>Tolak Permintaan</DialogTitle></DialogHeader>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Alasan..." className="rounded-xl" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="rounded-xl">Batal</Button>
              <Button variant="destructive" onClick={handleRejectRequest} className="rounded-xl">Tolak</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
