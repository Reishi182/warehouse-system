import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  useProductCategories, useAddCategory, useUpdateCategory, useDeleteCategory, ProductCategory,
} from '@/hooks/useProductCategories';
import { Pencil, Trash2, Plus, Tag, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PRESET_COLORS = [
  '#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#f97316','#14b8a6','#64748b',
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function CategoryManager({ open, onOpenChange }: Props) {
  const { data: categories = [], isLoading } = useProductCategories();
  const addCat = useAddCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();

  const [editMode, setEditMode] = useState<'add' | 'edit' | null>(null);
  const [selected, setSelected] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState({ name: '', color: '#6366f1', icon: 'tag' });
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);

  const openAdd = () => {
    setForm({ name: '', color: '#6366f1', icon: 'tag' });
    setSelected(null);
    setEditMode('add');
  };
  const openEdit = (cat: ProductCategory) => {
    setForm({ name: cat.name, color: cat.color, icon: cat.icon });
    setSelected(cat);
    setEditMode('edit');
  };
  const closeForm = () => { setEditMode(null); setSelected(null); };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editMode === 'add') {
      addCat.mutate(form, { onSuccess: closeForm });
    } else if (editMode === 'edit' && selected) {
      updateCat.mutate({ id: selected.id, updates: form }, { onSuccess: closeForm });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Manajemen Kategori
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Add button */}
          <Button size="sm" onClick={openAdd} className="w-full rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Tambah Kategori
          </Button>

          {/* Form inline */}
          {editMode && (
            <div className="glass-card rounded-xl p-4 space-y-3 border">
              <h4 className="text-sm font-semibold">
                {editMode === 'add' ? 'Tambah Kategori' : `Edit: ${selected?.name}`}
              </h4>
              <div className="space-y-2">
                <Label className="text-xs">Nama Kategori</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Contoh: Makanan"
                  className="rounded-xl h-9"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Warna</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      title={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ background: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={form.color}
                    onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                    className="w-7 h-7 rounded-full border cursor-pointer"
                    title="Kustom warna"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={closeForm} className="rounded-xl">
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={addCat.isPending || updateCat.isPending}
                  className="rounded-xl"
                >
                  {(addCat.isPending || updateCat.isPending) && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  Simpan
                </Button>
              </div>
            </div>
          )}

          {/* List */}
          {isLoading ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Memuat...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">Belum ada kategori</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: cat.color }}
                    />
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => openEdit(cat)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(cat)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori <strong>{deleteTarget?.name}</strong> akan dihapus. Produk dalam kategori ini tidak akan terhapus, hanya kategorinya yang di-unset.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteCat.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
