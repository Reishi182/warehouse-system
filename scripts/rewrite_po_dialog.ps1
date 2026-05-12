$file = "src\pages\purchase-orders\PurchaseOrderMainOffice.tsx"
$content = Get-Content $file -Raw -Encoding UTF8

$oldBlock = @'
                {/* Create/Edit PO Dialog */}
                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    if (!open) setEditPOId(null);
                    setIsCreateOpen(open);
                }}>
'@

$newBlock = @'
                {/* Create/Edit PO Dialog */}
                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    if (!open) setEditPOId(null);
                    setIsCreateOpen(open);
                }}>
'@

# We'll replace DialogContent and everything inside until </Dialog>
$startMarker = '                {/* Create/Edit PO Dialog */}'
$endMarker = '                {/* View PO Dialog */}'

$startIdx = $content.IndexOf($startMarker)
$endIdx = $content.IndexOf($endMarker)

$before = $content.Substring(0, $startIdx)
$after = $content.Substring($endIdx)

$newDialog = @'
                {/* Create/Edit PO Dialog */}
                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    if (!open) setEditPOId(null);
                    setIsCreateOpen(open);
                }}>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-0 shadow-2xl">
                        {/* Premium Gradient Header */}
                        <div className={`relative p-6 text-white overflow-hidden rounded-t-2xl ${editPOId ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-indigo-600 to-violet-600'}`}>
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white" />
                                <div className="absolute -bottom-12 -left-8 w-52 h-52 rounded-full bg-white" />
                            </div>
                            <div className="relative z-10 flex items-center gap-3">
                                <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{editPOId ? 'Edit Purchase Order' : 'Buat Purchase Order Baru'}</h2>
                                    <p className="text-white/70 text-sm mt-0.5">{editPOId ? 'Perbarui detail pesanan pembelian' : 'Buat pesanan pembelian ke supplier'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 space-y-4 bg-gray-50/60 dark:bg-slate-900/60 rounded-b-2xl">
                            {/* Section 1: Info Pemesanan */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Informasi Pemesanan</span>
                                </div>
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block" />Supplier *
                                        </label>
                                        <SearchableSelect
                                            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                                            value={supplierId}
                                            onValueChange={setSupplierId}
                                            placeholder="Pilih supplier..."
                                            searchPlaceholder="Cari supplier..."
                                            emptyMessage="Supplier tidak ditemukan."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block" />Tujuan Pengiriman *
                                        </label>
                                        <Select value={destination} onValueChange={(v) => setDestination(v as PODestination)}>
                                            <SelectTrigger className="h-11 rounded-xl bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 font-medium">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="gudang">📦 Gudang</SelectItem>
                                                <SelectItem value="toko">🏪 Toko</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="sm:col-span-2 space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3" />Tanggal PO *
                                        </label>
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <DateInput value={poDate} onChange={setPODate} className="max-w-xs" />
                                            <p className="text-xs text-muted-foreground">Format nomor: <span className="font-mono bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">PO-DDMMYYYY-XXXX</span></p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Tambah Item */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-violet-500 rounded-full" />
                                        <span className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">Tambah Item</span>
                                    </div>
                                    <button
                                        id="new-product-toggle"
                                        type="button"
                                        onClick={() => setIsNewProductMode(!isNewProductMode)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${isNewProductMode
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 ring-1 ring-amber-300'
                                            : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400 hover:bg-gray-200'
                                        }`}
                                    >
                                        <span className={`w-3 h-3 rounded-full transition-colors ${isNewProductMode ? 'bg-amber-500' : 'bg-gray-300'}`} />
                                        {isNewProductMode ? '✨ Produk Baru (aktif)' : 'Produk Baru?'}
                                    </button>
                                </div>
                                <div className="p-4 space-y-4">
                                    {isNewProductMode ? (
                                        <>
                                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                                                <span className="text-amber-700 dark:text-amber-400 text-xs font-semibold">💡 Produk baru akan dibuat otomatis saat PO diterima gudang</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nama Produk *</label>
                                                    <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)}
                                                        placeholder="Nama produk baru..." className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Barcode / SKU</label>
                                                    <Input value={newProductBarcode} onChange={(e) => setNewProductBarcode(e.target.value)}
                                                        placeholder="Opsional..." className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                                                <div className="sm:col-span-2 space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit</label>
                                                    <UnitSelector value={newProductUnit} onChange={setNewProductUnit} className="h-10 rounded-xl" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</label>
                                                    <Input type="number" min={0} step="any" value={itemQty}
                                                        onChange={(e) => setItemQty(parseFloat(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700 text-center font-bold" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-green-600 uppercase tracking-wide">Qty Bonus</label>
                                                    <Input type="number" min={0} step="any" value={itemBonusQty}
                                                        onChange={(e) => setItemBonusQty(parseFloat(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-center text-green-700 font-bold" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Harga Total (Rp)</label>
                                                    <Input isCurrency type="number" min={0} value={itemTotalPrice}
                                                        onChange={(e) => setItemTotalPrice(parseInt(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700 font-semibold" />
                                                </div>
                                            </div>
                                            <Button onClick={handleAddItem}
                                                disabled={!newProductName.trim() || (itemQty === 0 && itemBonusQty === 0)}
                                                className="w-full h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold gap-2">
                                                <Plus className="w-4 h-4" /> Tambah ke Daftar
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cari Produk</label>
                                                <ProductSearchSelect
                                                    products={products}
                                                    value={selectedProductId}
                                                    onChange={setSelectedProductId}
                                                    placeholder="Ketik nama produk..."
                                                    excludeIds={items.map(i => i.productId || '')}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
                                                <div className="sm:col-span-2 space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit</label>
                                                    <UnitSelector
                                                        product={products.find(p => p.id === selectedProductId)}
                                                        value={selectedUnit}
                                                        onChange={handleUnitChange}
                                                        disabled={!selectedProductId}
                                                        className="h-10 rounded-xl"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty</label>
                                                    <Input type="number" min={0} step="any" value={itemQty}
                                                        onChange={(e) => setItemQty(parseFloat(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700 text-center font-bold" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-green-600 uppercase tracking-wide">Qty Bonus</label>
                                                    <Input type="number" min={0} step="any" value={itemBonusQty}
                                                        onChange={(e) => setItemBonusQty(parseFloat(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-center text-green-700 font-bold" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Harga Total (Rp)</label>
                                                    <Input isCurrency type="number" min={0} value={itemTotalPrice}
                                                        onChange={(e) => setItemTotalPrice(parseInt(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700 font-semibold" />
                                                </div>
                                            </div>
                                            <Button onClick={handleAddItem}
                                                disabled={!selectedProductId || (itemQty === 0 && itemBonusQty === 0)}
                                                className="w-full h-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold gap-2">
                                                <Plus className="w-4 h-4" /> Tambah ke Daftar
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Section 3: Items List */}
                            {items.length > 0 && (
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Daftar Item PO</span>
                                            <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full">{items.length}</span>
                                        </div>
                                        {editPOId && <span className="text-xs text-muted-foreground italic">edit qty/harga langsung</span>}
                                    </div>
                                    <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                        {items.map((item, idx) => (
                                            <div key={item.id} className={`flex items-center gap-2 px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-slate-700/20 transition-colors ${item.isBonus ? 'bg-green-50/40 dark:bg-green-900/5' : ''}`}>
                                                <span className="text-xs font-bold text-gray-300 w-5 shrink-0 text-center">{idx + 1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <p className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{item.productName}</p>
                                                        {item.isNewProduct && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold shrink-0">BARU</span>}
                                                        {item.isBonus && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full font-bold shrink-0">🎁 BONUS</span>}
                                                        {!item.isBonus && item.unitPrice === 0 && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-bold shrink-0">GRATIS</span>}
                                                    </div>
                                                    {item.barcode && <p className="text-[10px] text-muted-foreground font-mono">{item.barcode}</p>}
                                                </div>
                                                <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded shrink-0">{item.unit || 'pcs'}</span>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <span className="text-[10px] text-gray-400 font-medium">QTY</span>
                                                    <Input type="number" min={0.001} step="any" value={item.quantity}
                                                        onChange={(e) => {
                                                            const qty = parseFloat(e.target.value) || 0.001;
                                                            setItems(prev => prev.map(it => it.id === item.id ? { ...it, quantity: qty } : it));
                                                        }}
                                                        className="w-16 h-8 text-center text-sm px-1 rounded-lg font-bold bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300" />
                                                </div>
                                                {item.isBonus ? (
                                                    <span className="w-28 h-8 flex items-center justify-center text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 rounded-lg shrink-0">🎁 Gratis</span>
                                                ) : (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <span className="text-[10px] text-gray-400 font-medium">Rp</span>
                                                        <Input isCurrency type="number" min={0}
                                                            value={item.quantity * item.unitPrice}
                                                            onChange={(e) => {
                                                                const total = parseFloat(e.target.value) || 0;
                                                                const newUnitPrice = Math.round(total / (item.quantity || 1));
                                                                setItems(prev => prev.map(it => it.id === item.id ? { ...it, unitPrice: newUnitPrice } : it));
                                                            }}
                                                            className="w-28 h-8 text-sm px-2 rounded-lg font-semibold bg-gray-50 dark:bg-slate-700" />
                                                    </div>
                                                )}
                                                {!item.isBonus && item.unitPrice > 0 && (
                                                    <span className="text-[10px] text-gray-400 shrink-0 hidden sm:block">@Rp {item.unitPrice.toLocaleString('id-ID')}</span>
                                                )}
                                                <Button size="sm" variant="ghost" onClick={() => handleRemoveItem(item.id)}
                                                    className="shrink-0 h-7 w-7 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors rounded-lg ml-1">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 border-t border-gray-100 dark:border-slate-700 space-y-1">
                                        {items.some(i => i.isBonus) && (
                                            <div className="flex justify-between text-xs text-green-600 dark:text-green-400 font-medium">
                                                <span>🎁 Bonus — {items.filter(i => i.isBonus).reduce((a, i) => a + i.quantity, 0)} item (tidak dihitung)</span>
                                                <span>Gratis</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-gray-700 dark:text-gray-200">Total Pembelian</span>
                                            <span className="font-black text-xl text-indigo-700 dark:text-indigo-400">Rp {totalAmount.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section 4: Notes */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-gray-300 rounded-full" />
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Catatan (opsional)</span>
                                </div>
                                <div className="p-4">
                                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Tambahkan catatan untuk supplier atau tim gudang..."
                                        rows={3} className="rounded-xl bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600 resize-none" />
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex gap-3 justify-end pt-1 pb-1">
                                <Button variant="outline" onClick={() => { setIsCreateOpen(false); setEditPOId(null); }}
                                    className="rounded-xl px-6 border-gray-200 hover:bg-gray-100 font-semibold">
                                    Batal
                                </Button>
                                <Button onClick={handleCreatePO}
                                    disabled={!supplierId || items.length === 0 || createPO.isPending || updatePO.isPending}
                                    className={`rounded-xl px-8 font-bold gap-2 text-white shadow-lg ${editPOId ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600' : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'}`}>
                                    {createPO.isPending || updatePO.isPending ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Menyimpan...</>
                                    ) : editPOId ? (
                                        <><Check className="w-4 h-4" /> Simpan Perubahan</>
                                    ) : (
                                        <><Plus className="w-4 h-4" /> Buat Purchase Order</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

'@

$newContent = $before + $newDialog + $after
[System.IO.File]::WriteAllText((Resolve-Path $file).Path, $newContent, [System.Text.Encoding]::UTF8)
Write-Host "Done. File written."
