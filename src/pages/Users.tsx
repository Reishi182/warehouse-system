import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Users as UsersIcon, 
  Search, 
  UserPlus, 
  MoreVertical, 
  Shield, 
  UserCircle,
  Mail,
  Calendar,
  Trash2,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { useUsers, UserProfile } from '@/hooks/useUsers';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function Users() {
  const { users, loading, updateUserRole, deleteUser } = useUsers();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  
  // States for Add User
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('cashier');
  const [adding, setAdding] = useState(false);

  // States for Edit Role
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [updatedRole, setUpdatedRole] = useState<UserRole>('cashier');

  // Filter users
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin': return <Badge className="bg-primary hover:bg-primary shadow-sm">Admin</Badge>;
      case 'main_office': return <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">Kantor Pusat</Badge>;
      case 'auditor': return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Auditor</Badge>;
      case 'warehouse': return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200">Gudang</Badge>;
      case 'cashier': return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">Kasir</Badge>;
      default: return <Badge variant="outline">{role}</Badge>;
    }
  };

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword) {
      toast({
        title: 'Input tidak lengkap',
        description: 'Mohon isi semua field yang diperlukan.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAdding(true);
      const { error } = await signUp(newUserEmail, newUserPassword, newUserName, newUserRole);
      
      if (error) throw error;

      toast({
        title: 'Pengguna berhasil dibuat',
        description: 'Silakan minta pengguna untuk login.',
      });
      
      setShowAddDialog(false);
      // Reset form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
    } catch (error: any) {
      toast({
        title: 'Gagal membuat pengguna',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <MainLayout title="Manajemen Pengguna" subtitle="Kelola akses dan peran pengguna sistem">
      <div className="space-y-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-2xl border shadow-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Cari nama atau email..." 
              className="pl-10 h-11 bg-muted/30 border-none rounded-xl"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            className="w-full sm:w-auto h-11 px-6 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold"
            onClick={() => setShowAddDialog(true)}
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Tambah Pengguna
          </Button>
        </div>

        {/* Users Table */}
        <Card className="rounded-2xl border shadow-md overflow-hidden bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <CardTitle className="text-lg">Daftar Pengguna</CardTitle>
            <CardDescription>Total {users.length} pengguna terdaftar</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px] font-bold">Profil</TableHead>
                  <TableHead className="font-bold text-center">Peran</TableHead>
                  <TableHead className="font-bold">Terdaftar</TableHead>
                  <TableHead className="w-[80px] text-right font-bold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center text-muted-foreground animate-pulse">
                      Memuat data pengguna...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-40 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <UsersIcon className="w-8 h-8 opacity-20" />
                        <p>Tidak ada pengguna ditemukan</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 border flex items-center justify-center text-primary font-bold overflow-hidden">
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              user.name[0].toUpperCase()
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground leading-tight">{user.name}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {getRoleBadge(user.role)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 p-1 rounded-xl shadow-xl">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1.5">Manage Access</DropdownMenuLabel>
                            <DropdownMenuItem 
                              className="rounded-lg gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary"
                              onClick={() => {
                                setEditingUser(user);
                                setUpdatedRole(user.role);
                              }}
                            >
                              <Shield className="w-4 h-4" />
                              Ubah Peran
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="rounded-lg gap-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onClick={() => {
                                if (confirm('Apakah Anda yakin ingin menghapus profil pengguna ini?')) {
                                  deleteUser(user.user_id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                              Hapus Profil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Tambah Pengguna Baru
            </DialogTitle>
            <DialogDescription>
              Buat akun pengguna baru dalam sistem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold pl-1">Nama Lengkap</label>
              <Input 
                placeholder="Ex: Budi Santoso" 
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="rounded-xl bg-muted/30 border-none h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold pl-1">Email</label>
              <Input 
                type="email" 
                placeholder="email@contoh.com" 
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className="rounded-xl bg-muted/30 border-none h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold pl-1">Password Baru</label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className="rounded-xl bg-muted/30 border-none h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold pl-1">Peran Aplikasi</label>
              <Select value={newUserRole} onValueChange={(val: UserRole) => setNewUserRole(val)}>
                <SelectTrigger className="rounded-xl bg-muted/30 border-none h-11">
                  <SelectValue placeholder="Pilih Peran" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="cashier">Kasir</SelectItem>
                  <SelectItem value="warehouse">Gudang</SelectItem>
                  <SelectItem value="auditor">Auditor</SelectItem>
                  <SelectItem value="main_office">Kantor Pusat</SelectItem>
                  <SelectItem value="admin">Admin System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-3 rounded-xl flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-[11px] text-amber-700 dark:text-amber-400">
                <strong>Penting:</strong> Menambah pengguna baru akan mendaftarkan email tersebut di database. Pastikan email belum pernah terdaftar.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)} className="rounded-xl">Batal</Button>
            <Button onClick={handleAddUser} disabled={adding} className="rounded-xl px-8 shadow-lg shadow-primary/20">
              {adding ? 'Memproses...' : 'Daftarkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Ubah Peran Pengguna
            </DialogTitle>
            <DialogDescription>
              Ubah izin akses untuk {editingUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold border-2 border-primary/20">
              {editingUser?.name[0].toUpperCase()}
            </div>
            <div className="text-center">
              <p className="font-bold">{editingUser?.name}</p>
              <p className="text-xs text-muted-foreground">{editingUser?.email}</p>
            </div>
            <div className="w-full space-y-2 mt-2">
              <label className="text-sm font-semibold">Pilih Peran Baru</label>
              <Select value={updatedRole} onValueChange={(val: UserRole) => setUpdatedRole(val)}>
                <SelectTrigger className="rounded-xl bg-muted/30 border-none h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="cashier">Kasir</SelectItem>
                  <SelectItem value="warehouse">Gudang</SelectItem>
                  <SelectItem value="auditor">Auditor</SelectItem>
                  <SelectItem value="main_office">Kantor Pusat</SelectItem>
                  <SelectItem value="admin">Admin System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingUser(null)} className="rounded-xl">Batal</Button>
            <Button 
              onClick={() => {
                if (editingUser) {
                  updateUserRole(editingUser.user_id, updatedRole);
                  setEditingUser(null);
                }
              }}
              className="rounded-xl px-8"
            >
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
