$file = "src\pages\surat-jalan\SuratJalanCashier.tsx"
$content = Get-Content $file -Raw -Encoding UTF8

$startIdx = 11336
$endIdx = 24521

$before = $content.Substring(0, $startIdx)
$after = $content.Substring($endIdx)

$newDialog = @'
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-xl text-xs sm:text-sm">
                            <Plus className="h-4 w-4 sm:mr-2" />
                            <span className="hidden sm:inline">Buat Surat Jalan</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-0 shadow-2xl">
                        {/* Premium Header */}
                        <div className="relative p-6 text-white overflow-hidden rounded-t-2xl bg-gradient-to-r from-blue-600 to-indigo-600">
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white" />
                                <div className="absolute -bottom-12 -left-8 w-52 h-52 rounded-full bg-white" />
                            </div>
                            <div className="relative z-10 flex items-center gap-3">
                                <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                                    <Truck className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Buat Surat Jalan B2B</h2>
                                    <p className="text-white/70 text-sm mt-0.5">Pengiriman barang ke pelanggan</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 space-y-4 bg-gray-50/60 dark:bg-slate-900/60 rounded-b-2xl">
                            {/* Section 1: Pelanggan */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-blue-500 rounded-full" />
                                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Informasi Pelanggan</span>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block" />Pilih Pelanggan *
                                        </label>
                                        <SearchableSelect
                                            options={customers.map(c => ({
                                                value: c.id,
                                                label: c.name,
                                                description: c.phone || c.email || undefined
                                            }))}
                                            value={selectedCustomerId}
                                            onValueChange={handleCustomerSelect}
                                            placeholder="Cari pelanggan..."
                                            searchPlaceholder="Ketik nama pelanggan..."
                                            emptyMessage="Pelanggan tidak ditemukan"
                                        />
                                    </div>

                                    {selectedCustomerId && (
                                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-4 border border-indigo-100 dark:border-indigo-800">
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide mb-0.5">Nama</p>
                                                    <p className="font-bold text-gray-800 dark:text-gray-100">{recipientName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide mb-0.5">Telepon</p>
                                                    <p className="font-semibold text-gray-700 dark:text-gray-300">{recipientPhone || '-'}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wide mb-0.5">Alamat</p>
                                                    <p className="font-semibold text-gray-700 dark:text-gray-300">{recipientAddress || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nomor Surat Jalan</label>
                                            <Input
                                                value={customNumber}
                                                onChange={(e) => setCustomNumber(e.target.value)}
                                                placeholder="SJ-001 (kosongkan = auto)"
                                                className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700"
                                            />
                                            <p className="text-[10px] text-muted-foreground">Kosongkan untuk nomor otomatis</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                                                <Paperclip className="w-3 h-3" />Lampiran PO Pelanggan
                                            </label>
                                            <div className="relative">
                                                <Input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={(e) => setCustomerPoFile(e.target.files?.[0] || null)}
                                                    className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700 file:mr-3 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded-lg file:px-2 file:py-1"
                                                />
                                            </div>
                                            {customerPoFile && (
                                                <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                                    <Paperclip className="w-3 h-3" />{customerPoFile.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Item Pengiriman */}
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                                <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-violet-500 rounded-full" />
                                    <span className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider">Item Pengiriman</span>
                                </div>
                                <div className="p-4 space-y-4">
                                    {/* Lokasi Asal */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lokasi Asal Barang</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => { setSourceLocation('toko'); setSelectedItems([]); setSelectedProduct(''); }}
                                                className={`py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                                                    sourceLocation === 'toko'
                                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md shadow-green-200 dark:shadow-green-900/40'
                                                        : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                                                }`}
                                            >
                                                🏪 Toko
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { setSourceLocation('gudang'); setSelectedItems([]); setSelectedProduct(''); }}
                                                className={`py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                                                    sourceLocation === 'gudang'
                                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/40'
                                                        : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                                                }`}
                                            >
                                                📦 Gudang
                                            </button>
                                        </div>
                                    </div>

                                    {/* Product add row */}
                                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
                                        <div className="sm:col-span-3 space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                Produk dari {sourceLocation === 'gudang' ? 'Gudang' : 'Toko'}
                                            </label>
                                            <ProductSearchSelect
                                                products={products}
                                                value={selectedProduct}
                                                onChange={setSelectedProduct}
                                                placeholder="Cari produk..."
                                                showStock={true}
                                                stockLocation={sourceLocation}
                                                excludeIds={selectedItems.map(i => i.productId)}
                                            />
                                        </div>
                                        <div className="sm:col-span-1 space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Jumlah</label>
                                            <Input
                                                type="number"
                                                value={quantity}
                                                onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                                                min="0.001"
                                                step="any"
                                                className="h-10 rounded-xl bg-gray-50 dark:bg-slate-700 text-center font-bold"
                                            />
                                        </div>
                                        <div className="sm:col-span-1 space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Satuan</label>
                                            <UnitSelector
                                                product={products.find(p => p.id === selectedProduct)}
                                                value={unit}
                                                onChange={setUnit}
                                                className="h-10 rounded-xl"
                                                disabled={!selectedProduct}
                                            />
                                        </div>
                                        <div className="sm:col-span-1">
                                            <Button onClick={handleAddItem} type="button"
                                                className="h-10 w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-bold gap-1">
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Selected items table */}
                                    {selectedItems.length > 0 && (
                                        <div className="rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                                            <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                                                <div className="w-1.5 h-3.5 bg-emerald-500 rounded-full" />
                                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Item Dipilih</span>
                                                <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold px-1.5 py-0.5 rounded-full">{selectedItems.length}</span>
                                            </div>
                                            <div className="divide-y divide-gray-50 dark:divide-slate-700">
                                                {selectedItems.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 dark:hover:bg-slate-700/20 transition-colors">
                                                        <span className="text-xs font-bold text-gray-300 w-5 shrink-0 text-center">{idx + 1}</span>
                                                        <span className="flex-1 font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{item.productName}</span>
                                                        <span className="inline-flex items-center justify-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold px-3 py-1 rounded-lg text-sm shrink-0">
                                                            {item.quantity}
                                                        </span>
                                                        <span className="text-xs font-bold text-gray-500 uppercase w-10 shrink-0">{item.unit || 'pcs'}</span>
                                                        <button onClick={() => handleRemoveItem(idx)}
                                                            className="shrink-0 w-7 h-7 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors rounded-lg text-gray-400">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex gap-3 justify-end pt-1 pb-1">
                                <Button variant="outline" onClick={() => setDialogOpen(false)}
                                    className="rounded-xl px-6 border-gray-200 hover:bg-gray-100 font-semibold">
                                    Batal
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={selectedItems.length === 0 || !selectedCustomerId || createSuratJalan.isPending}
                                    className="rounded-xl px-8 font-bold gap-2 text-white shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                                    {createSuratJalan.isPending ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Menyimpan...</>
                                    ) : (
                                        <><CheckCircle className="w-4 h-4" /> Buat Surat Jalan</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
'@

$newContent = $before + $newDialog + $after
[System.IO.File]::WriteAllText((Resolve-Path $file).Path, $newContent, [System.Text.Encoding]::UTF8)
Write-Host "Done. SJ dialog written."
