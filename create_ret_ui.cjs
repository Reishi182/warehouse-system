const fs = require('fs');

let content = fs.readFileSync('src/pages/stock-return/StockReturnCreate.tsx', 'utf-8');

const editDialog = `
// Edit Return Dialog Component
function EditReturnDialog({ request, products, onEdit, onCancel }: { request: StockReturn, products: any[], onEdit: (data: any) => void, onCancel: () => void }) {
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState(request.reason || '');
    const [items, setItems] = useState<any[]>(() => {
        return request.items?.map((i: any) => ({
            productId: i.product_id,
            name: i.product?.name,
            quantity: i.quantity,
            maxStock: i.product?.stock_toko || 0,
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
                    <DialogTitle>Edit Pengajuan Retur</DialogTitle>
                    <DialogDescription>Ubah detail retur sebelum ditarik oleh gudang.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Alasan Retur</Label>
                        <Textarea value={reason} onChange={e => setReason(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Daftar Barang</Label>
                        {items.map((item) => (
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
                    <Button variant="destructive" onClick={() => { onCancel(); setOpen(false); }}>Batalkan Retur</Button>
                    <Button onClick={handleSave} disabled={items.length === 0 || !reason}>Simpan Perubahan</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
`;

if (!content.includes('function EditReturnDialog')) {
    // We need to find a place to put this. Let's put it before ReturnDetailDialog
    // BUT ReturnDetailDialog might not exist, maybe it's called something else?
    // Let's check regex for dialog. Or simply after imports.
    const importMatch = content.match(/import.*?}[ \t]*from[ \t]*['"].*['"];[\r\n]+/g);
    if (importMatch) {
       const lastImport = importMatch[importMatch.length - 1];
       content = content.replace(lastImport, lastImport + '\n' + editDialog);
    }
}

// Ensure the hook gets editReturn and cancelReturn
content = content.replace(
    'const { returns, createReturn } = useStockReturns();',
    'const { returns, createReturn, editReturn, cancelReturn } = useStockReturns();'
);

content = content.replace(
    'const { user, profile } = useAuth();',
    'const { user, profile } = useAuth();\n    const products = useDataStore(s => s.products);'
);


// Replace the Action cell in tableColumns
const newCell = `cell: (request) => (
                <div className="flex items-center">
                    <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all"
                        onClick={() => setSelectedReturn(request)}
                    >
                        <Eye className="w-4 h-4" />
                        Detail
                    </Button>
                    {request.status === 'pending_gudang' && (
                        <EditReturnDialog
                            request={request}
                            products={products}
                            onEdit={(data) => editReturn.mutate({ returnId: request.id, ...data })}
                            onCancel={() => cancelReturn.mutate(request.id)}
                        />
                    )}
                </div>
            )`;

const regexCell = /cell:\s*\(request\)\s*=>\s*\(\s*<Button[\s\S]*?Detail\s*<\/Button>\s*\)/;
content = content.replace(regexCell, newCell);

fs.writeFileSync('src/pages/stock-return/StockReturnCreate.tsx', content);
console.log("Patched StockReturnCreate.tsx");
