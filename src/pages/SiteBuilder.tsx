import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Zap, 
  Palette, 
  Layout, 
  Database, 
  Settings2, 
  Monitor, 
  Save, 
  RefreshCw,
  Image as ImageIcon,
  Check,
  Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStoreSettings, useUpdateStoreSettings } from '@/hooks/useStoreSettings';
import { useAllProductUnits, useAddProductUnit, useUpdateProductUnit, useDeleteProductUnit } from '@/hooks/useProductUnits';
import { Loader2, Plus, Trash2, Edit2, Layers, X as XIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function SiteBuilder() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  
  // Fake state for visual demonstration
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [glassmorphism, setGlassmorphism] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  // Store settings (Real data)
  const { data: storeSettings, isLoading: storeLoading } = useStoreSettings();
  const updateStoreSettings = useUpdateStoreSettings();
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');

  // Unit management (Real data)
  const { data: allUnits, isLoading: unitsLoading } = useAllProductUnits();
  const addUnitMutation = useAddProductUnit();
  const updateUnitMutation = useUpdateProductUnit();
  const deleteUnitMutation = useDeleteProductUnit();

  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitLabel, setNewUnitLabel] = useState('');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [editUnitCode, setEditUnitCode] = useState('');
  const [editUnitLabel, setEditUnitLabel] = useState('');

  // Sync store settings
  useState(() => {
    if (storeSettings) {
      setStoreName(storeSettings.store_name);
      setStoreAddress(storeSettings.store_address);
      setStorePhone(storeSettings.store_phone);
      setStoreEmail(storeSettings.store_email);
    }
  });

  // Effect to sync store settings when data arrives
  const syncStore = () => {
    if (storeSettings) {
      setStoreName(storeSettings.store_name);
      setStoreAddress(storeSettings.store_address);
      setStorePhone(storeSettings.store_phone);
      setStoreEmail(storeSettings.store_email);
    }
  };

  // Run sync once
  useState(() => { syncStore(); });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: 'Pengaturan Disimpan',
        description: 'Perubahan visual sistem telah berhasil diterapkan.',
      });
    }, 1000);
  };

  return (
    <MainLayout 
      title="Site Builder" 
      subtitle="Kustomisasi visual dan kebutuhan sistem secara langsung"
    >
      <div className="space-y-6 max-w-5xl mx-auto">
        
        <Tabs defaultValue="visual" className="w-full">
          <TabsList className="bg-muted/50 p-1 rounded-2xl mb-6">
            <TabsTrigger value="visual" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Palette className="w-4 h-4 mr-2" />
              Visual & UI
            </TabsTrigger>
            <TabsTrigger value="config" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Globe className="w-4 h-4 mr-2" />
              Branding & Info
            </TabsTrigger>
            <TabsTrigger value="system" className="rounded-xl px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Database className="w-4 h-4 mr-2" />
              Sistem & Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Theme Settings */}
              <Card className="rounded-2xl border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    Tema Sistem
                  </CardTitle>
                  <CardDescription>Atur warna dan gaya visual aplikasi.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Warna Utama (Primary)</Label>
                    <div className="flex gap-3">
                      <Input 
                        type="color" 
                        value={primaryColor} 
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-12 h-10 p-1 rounded-lg border-none"
                      />
                      <Input 
                        value={primaryColor} 
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="rounded-xl bg-muted/30 border-none px-4"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-dashed">
                    <div className="space-y-0.5">
                      <Label className="text-base">Glassmorphism Effect</Label>
                      <p className="text-xs text-muted-foreground">Aktifkan efek transparan pada panel & sidebar.</p>
                    </div>
                    <Switch checked={glassmorphism} onCheckedChange={setGlassmorphism} />
                  </div>
                </CardContent>
              </Card>

              {/* Layout Settings */}
              <Card className="rounded-2xl border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layout className="w-5 h-5 text-primary" />
                    Layout Navigasi
                  </CardTitle>
                  <CardDescription>Konfigurasi perilaku sidebar dan header.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Default Sidebar Mobile</Label>
                      <p className="text-xs text-muted-foreground">Sidebar selalu terbuka saat di mode Desktop.</p>
                    </div>
                    <Switch checked={sidebarExpanded} onCheckedChange={setSidebarExpanded} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Footer Text</Label>
                    <Input placeholder="VMB Warehouse © 2026" className="rounded-xl bg-muted/30 border-none" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Live Preview Placeholder */}
            <Card className="rounded-2xl border bg-gradient-to-br from-primary/5 to-accent/5 p-8 flex flex-col items-center justify-center text-center border-dashed">
              <Monitor className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-bold mb-2">Live Preview Enginge</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Visual preview Anda akan muncul di sini saat Anda mengubah pengaturan tema secara real-time.
              </p>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="space-y-6">
            <Card className="rounded-2xl border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Konfigurasi Branding & Toko</CardTitle>
                <CardDescription>Ubah identitas sistem dan informasi toko yang muncul di struk.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Nama Toko / Aplikasi</Label>
                    <Input 
                      value={storeName} 
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Ex: VMB Warehouse"
                      className="rounded-xl bg-muted/30 border-none h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instansi / Perusahaan</Label>
                    <Input 
                      placeholder="VMB Cargo & Logistics" 
                      className="rounded-xl bg-muted/30 border-none h-11" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Alamat Lengkap</Label>
                    <Input 
                      value={storeAddress} 
                      onChange={(e) => setStoreAddress(e.target.value)}
                      placeholder="Alamat toko..."
                      className="rounded-xl bg-muted/30 border-none h-11"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Telepon</Label>
                      <Input 
                        value={storePhone} 
                        onChange={(e) => setStorePhone(e.target.value)}
                        placeholder="021-xxxx"
                        className="rounded-xl bg-muted/30 border-none h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        value={storeEmail} 
                        onChange={(e) => setStoreEmail(e.target.value)}
                        placeholder="toko@email.com"
                        className="rounded-xl bg-muted/30 border-none h-11"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={() => updateStoreSettings.mutate({
                      store_name: storeName,
                      store_address: storeAddress,
                      store_phone: storePhone,
                      store_email: storeEmail,
                    })}
                    disabled={updateStoreSettings.isPending}
                    className="rounded-xl px-8"
                  >
                    {updateStoreSettings.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" />Simpan Data Toko</>
                    )}
                  </Button>
                </div>

                <Separator className="my-2" />

                <div className="space-y-3 pt-2">
                  <Label>Logo Sistem (SVG/PNG)</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-2xl bg-muted border-2 border-dashed flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-8 h-8 opacity-20" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" className="rounded-xl h-10 border-dashed">Ganti Logo</Button>
                      <p className="text-[10px] text-muted-foreground italic">Rekomendasi ukuran: 512x512px, Max 2MB.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="rounded-2xl border shadow-sm bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Backup Data
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs">Ekspor seluruh tabel database dalam format JSON/CSV.</p>
                  <Button className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                    Mulai Ekspor
                  </Button>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border shadow-sm md:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Layers className="w-5 h-5 text-primary" />
                      Manajemen Satuan Produk
                    </CardTitle>
                    <CardDescription>Tambah atau ubah jenis satuan (misal: RIM, PACK, PCS)</CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setIsAddingUnit(!isAddingUnit)}
                    className="rounded-xl border-primary text-primary hover:bg-primary/10"
                  >
                    {isAddingUnit ? <XIcon className="w-4 h-4" /> : <Plus className="w-4 h-4 mr-1" />}
                    {isAddingUnit ? 'Batal' : 'Tambah'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isAddingUnit && (
                    <div className="bg-primary/5 p-4 rounded-2xl mb-4 space-y-3 animate-fade-in border border-primary/10">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">Tambah Satuan Baru</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Kode (pcs, rim, etc)</Label>
                          <Input 
                            value={newUnitCode} 
                            onChange={(e) => setNewUnitCode(e.target.value)}
                            placeholder="pcs"
                            className="rounded-xl bg-background border-none h-10 text-sm lowercase"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Label Tampilan</Label>
                          <Input 
                            value={newUnitLabel} 
                            onChange={(e) => setNewUnitLabel(e.target.value)}
                            placeholder="PCS"
                            className="rounded-xl bg-background border-none h-10 text-sm uppercase"
                          />
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full h-10 rounded-xl"
                        disabled={!newUnitCode || !newUnitLabel || addUnitMutation.isPending}
                        onClick={() => {
                          addUnitMutation.mutate({ code: newUnitCode, label: newUnitLabel }, {
                            onSuccess: () => {
                              setNewUnitCode('');
                              setNewUnitLabel('');
                              setIsAddingUnit(false);
                            }
                          });
                        }}
                      >
                        {addUnitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        Simpan Satuan
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {unitsLoading ? (
                      <div className="col-span-2 flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/30" />
                      </div>
                    ) : allUnits?.length === 0 ? (
                      <p className="col-span-2 text-center py-8 text-sm text-muted-foreground italic">Belum ada satuan ditambahkan.</p>
                    ) : (
                      allUnits?.map((unit) => (
                        <div 
                          key={unit.id} 
                          className="flex items-center justify-between p-3 rounded-2xl border bg-card/50 hover:bg-card transition-colors group"
                        >
                          {editingUnitId === unit.id ? (
                            <div className="flex-1 flex gap-2 animate-fade-in">
                              <Input 
                                value={editUnitCode} 
                                onChange={(e) => setEditUnitCode(e.target.value)}
                                className="h-8 text-xs lowercase"
                              />
                              <Input 
                                value={editUnitLabel} 
                                onChange={(e) => setEditUnitLabel(e.target.value)}
                                className="h-8 text-xs uppercase"
                              />
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-emerald-600"
                                onClick={() => {
                                  updateUnitMutation.mutate({ 
                                    id: unit.id, 
                                    updates: { code: editUnitCode, label: editUnitLabel } 
                                  }, {
                                    onSuccess: () => setEditingUnitId(null)
                                  });
                                }}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-8 w-8 text-muted-foreground"
                                onClick={() => setEditingUnitId(null)}
                              >
                                <XIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                  {unit.code.toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-bold">{unit.label}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">kode: {unit.code}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                                  onClick={() => {
                                    setEditingUnitId(unit.id);
                                    setEditUnitCode(unit.code);
                                    setEditUnitLabel(unit.label);
                                  }}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => {
                                    if (confirm(`Hapus satuan ${unit.label}? Data produk mungkin terpengaruh.`)) {
                                      deleteUnitMutation.mutate(unit.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border shadow-sm bg-destructive/5 text-destructive">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Danger Zone
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs">Soft reset cache aplikasi dan sinkronisasi auth.</p>
                  <Button variant="ghost" className="w-full rounded-xl hover:bg-destructive/10">
                    Purge Cache
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Floating Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            size="lg"
            className="rounded-2xl px-12 h-14 font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-all text-base"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
            ) : (
              <Save className="w-5 h-5 mr-3" />
            )}
            {isSaving ? 'Menyimpan...' : 'Terapkan Semua Perubahan'}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
