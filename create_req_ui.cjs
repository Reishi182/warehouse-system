const fs = require('fs');

let content = fs.readFileSync('src/pages/stock-request/StockRequestsNew.tsx', 'utf-8');

const editDialog = `
// Edit Request Dialog Component
function EditRequestDialog({ request, products, onEdit, onCancel }: { request: NewStockRequest, products: any[], onEdit: (data: any) => void, onCancel: () => void }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState(request.reason || '');
    const [items, setItems] = useState<any[]>(() => {
        return request.items?.map((i: any) => ({
            productId: i.product_id,
            name: i.product?.name,
            quantity: i.quantity,
            maxStock: i.product?.stock_gudang || 0,
            unit: i.unit || 'pcs',
            note: i.note || ''
        })) || [];
    });

    const handleRemoveItem = (productId: string) => {
        setItems(items.filter(i => i.productId !== productId));
    };

    const handleUpdateItem = (productId: string, field: string, value: any) => {
        setItems(items.map(i => {
            if (i.productId === productId) {
                return { ...i, [field]: value };
            }
            return i;
        }));
    };

    const handleSave = () => {
        onEdit({ reason, items });
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-xl gap-2 hover:bg-blue-500/10 hover:border-blue-500/50 hover:text-blue-600 transition-all ml-2">
                    <FileText className="w-4 h-4" /> Edit
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-2xl border-2">
                <DialogHeader>
                    <DialogTitle>Edit Permintaan Stok</DialogTitle>
                    <DialogDescription>Ubah detail permintaan sebelum diproses oleh gudang.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Alasan Permintaan</Label>
                        <Textarea value={reason} onChange={e => setReason(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Daftar Barang</Label>
                        {items.map((item, idx) => (
                            <div key={item.productId} className="flex gap-2 items-end border p-3 rounded-lg bg-muted/50">
                                <div className="flex-1">
                                    <Label className="text-xs">Barang</Label>
                                    <Input value={item.name} disabled className="bg-background/50" />
                                </div>
                                <div className="w-24">
                                    <Label className="text-xs">Jumlah</Label>
                                    <Input type="number" min={0.1} step="any" value={item.quantity} onChange={e => handleUpdateItem(item.productId, 'quantity', parseFloat(e.target.value) || 0)} />
                                </div>
                                <Button size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleRemoveItem(item.productId)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-between mt-4">
                    <Button variant="destructive" onClick={() => { onCancel(); setOpen(false); }}>Batalkan Permintaan</Button>
                    <Button onClick={handleSave} disabled={items.length === 0 || !reason}>Simpan Perubahan</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Detail Dialog Component`;

if (!content.includes('function EditRequestDialog')) {
    content = content.replace('// Detail Dialog Component', editDialog);
}

// Ensure EditRequestDialog has access to editRequest
content = content.replace('const { requests, createRequest, resubmitRequest, cancelRequest } = useStockRequests();', 'const { requests, createRequest, resubmitRequest, cancelRequest, editRequest } = useStockRequests();');

// 3. Add to Action Cell
const newCell = `cell: (request) => (
                <div className="flex items-center">
                    <RequestDetailDialog
                        request={request}
                        onResubmit={() => resubmitRequest.mutate(request.id)}
                        onCancel={() => cancelRequest.mutate(request.id)}
                    />
                    {(request.status === 'pending_main_office' || request.status === 'pending_gudang') && (
                        <EditRequestDialog
                            request={request}
                            products={products}
                            onEdit={(data) => editRequest.mutate({ requestId: request.id, ...data })}
                            onCancel={() => cancelRequest.mutate(request.id)}
                        />
                    )}
                </div>
            )`;

const regex = /cell:\s*\(request\)\s*=>\s*\(\s*<RequestDetailDialog[\s\S]*?\/\>\s*\)/;
content = content.replace(regex, newCell);

fs.writeFileSync('src/pages/stock-request/StockRequestsNew.tsx', content);
console.log("Patched StockRequestsNew.tsx for Edit button");
