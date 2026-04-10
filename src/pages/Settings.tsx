import { useState, useEffect, type ChangeEvent } from 'react';
import { Settings as SettingsIcon, Building2, Bell, Shield, Database, Save, User as UserIcon, Upload, Sun, Moon, Monitor, Store, Loader2, Zap, ZapOff, Plus, Trash2, Edit2, Check, X as XIcon, Layers } from 'lucide-react';
import { useTheme } from 'next-themes';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { compressImageToFile, formatFileSize } from '@/lib/imageCompression';

export default function Settings() {
  const { profile, updateProfile, loading: authLoading } = useAuth();
  const role = useRole();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState(20);

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [newName, setNewName] = useState(profile?.name || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [lowPerformanceMode, setLowPerformanceMode] = useState(() => typeof localStorage !== 'undefined' ? localStorage.getItem('low-performance-mode') === 'true' : false);


  if (authLoading || !profile) {
    return (
      <MainLayout title="Pengaturan" subtitle="Konfigurasi sistem inventaris">
        <PageSkeleton variant="form" />
      </MainLayout>
    );
  }


  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'File tidak valid', description: 'Pilih file gambar (jpg/png/webp)', variant: 'destructive' });
      return;
    }

    const maxBytes = 10 * 1024 * 1024; // Allow up to 10MB, we'll compress it
    if (file.size > maxBytes) {
      toast({ title: 'Ukuran terlalu besar', description: 'Maksimal ukuran avatar 10MB', variant: 'destructive' });
      return;
    }

    try {
      // Auto-compress avatar
      const compressedFile = await compressImageToFile(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.85,
        format: 'image/webp',
      });

      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarFile(compressedFile);
      setAvatarPreviewUrl(URL.createObjectURL(compressedFile));

      if (file.size !== compressedFile.size) {
        toast({
          title: 'Gambar dikompres',
          description: `${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)}`,
        });
      }
    } catch (error) {
      console.error('Compression failed:', error);
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarFile(file);
      setAvatarPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleOpenProfileDialog = (open: boolean) => {
    setProfileDialogOpen(open);
    if (open) {
      setNewName(profile?.name || '');
      setAvatarFile(null);
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
      setAvatarPreviewUrl(null);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);

      if (!newName.trim()) {
        toast({ title: 'Nama wajib diisi', description: 'Masukkan nama', variant: 'destructive' });
        return;
      }

      let avatarUrl: string | null | undefined = undefined;

      if (avatarFile) {
        const ext = avatarFile.name.includes('.') ? avatarFile.name.split('.').pop() : 'jpg';
        const uniqueId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const filePath = `${profile?.user_id || 'user'}/${uniqueId}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true, contentType: avatarFile.type });

        if (uploadError) {
          toast({ title: 'Gagal upload avatar', description: uploadError.message, variant: 'destructive' });
          return;
        }

        const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = publicUrl.publicUrl;
      }

      const { error } = await updateProfile({
        name: newName.trim(),
        avatar: avatarUrl,
      });

      if (error) {
        toast({ title: 'Gagal menyimpan profil', description: error.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Profil diperbarui', description: 'Nama/avatar berhasil diperbarui' });
      setProfileDialogOpen(false);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSave = () => {
    toast({
      title: 'Pengaturan disimpan',
      description: 'Perubahan berhasil disimpan',
    });
  };

  return (
    <MainLayout title="Pengaturan" subtitle="Konfigurasi sistem inventaris">
      <div className="max-w-2xl space-y-4 sm:space-y-6">
        {/* Profile Settings */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Profil</h3>
              <p className="text-sm text-muted-foreground truncate">
                {profile?.name || 'User'}
              </p>
            </div>

            <Dialog open={profileDialogOpen} onOpenChange={handleOpenProfileDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">Ubah</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ubah Profil</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Nama</Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label>Avatar</Label>
                    <Input type="file" accept="image/*" onChange={handleAvatarChange} />
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-full border bg-muted overflow-hidden flex items-center justify-center">
                        {avatarPreviewUrl ? (
                          <img src={avatarPreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : profile?.avatar ? (
                          <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-muted-foreground">
                            {(profile?.name?.charAt(0) || 'U').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Maks 3MB. Format jpg/png/webp.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={() => setProfileDialogOpen(false)} disabled={savingProfile}>
                      Batal
                    </Button>
                    <Button onClick={handleSaveProfile} disabled={savingProfile}>
                      <Upload className="w-4 h-4 mr-2" />
                      Simpan
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Separator className="my-4" />
          <div className="text-sm text-muted-foreground">
            Ubah nama dan avatar akun.
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Sun className="w-5 h-5 text-purple-500 dark:hidden" />
              <Moon className="w-5 h-5 text-purple-500 hidden dark:block" />
            </div>
            <div>
              <h3 className="font-semibold">Tampilan</h3>
              <p className="text-sm text-muted-foreground">Kustomisasi tema aplikasi</p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="space-y-4">
            <Label>Pilih Tema</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => setTheme('light')}
              >
                <Sun className="w-5 h-5" />
                <span className="text-sm">Terang</span>
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => setTheme('dark')}
              >
                <Moon className="w-5 h-5" />
                <span className="text-sm">Gelap</span>
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => setTheme('system')}
              >
                <Monitor className="w-5 h-5" />
                <span className="text-sm">Sistem</span>
              </Button>
            </div>

            {/* Low Performance Mode */}
            <Separator className="my-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {lowPerformanceMode ? (
                  <ZapOff className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Zap className="w-5 h-5 text-amber-500" />
                )}
                <div>
                  <p className="font-medium">Mode Performa Rendah</p>
                  <p className="text-sm text-muted-foreground">
                    Matikan animasi & efek blur untuk PC lambat
                  </p>
                </div>
              </div>
              <Switch
                checked={lowPerformanceMode}
                onCheckedChange={(checked) => {
                  setLowPerformanceMode(checked);
                  localStorage.setItem('low-performance-mode', String(checked));
                  if (checked) {
                    document.body.classList.add('low-performance-mode');
                    toast({
                      title: '⚡ Mode Performa Rendah Aktif',
                      description: 'Animasi dan efek berat dinonaktifkan',
                    });
                  } else {
                    document.body.classList.remove('low-performance-mode');
                    toast({
                      title: '✨ Mode Normal Aktif',
                      description: 'Semua efek visual diaktifkan kembali',
                    });
                  }
                }}
              />
            </div>
          </div>
        </div>

        {role !== 'admin' && (
          <div className="glass-card rounded-3xl p-4 text-sm text-muted-foreground animate-slide-up">
            Beberapa pengaturan sistem hanya dapat diakses oleh Admin melalui Site Builder.
          </div>
        )}
      </div>
    </MainLayout>
  );
}
