
import { useState } from 'react';
import { Shield, Edit, Trash2, Plus, Users } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { Warehouse, Store, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';

interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
}

const DEMO_USERS: DemoUser[] = [
  { id: '1', name: 'Budi Warehouse', email: 'warehouse@demo.com', role: 'warehouse', status: 'active' },
  { id: '2', name: 'Siti Kasir', email: 'cashier@demo.com', role: 'cashier', status: 'active' },
  { id: '3', name: 'Ahmad Auditor', email: 'auditor@demo.com', role: 'auditor', status: 'active' },
  { id: '4', name: 'Admin Sistem', email: 'admin@demo.com', role: 'admin', status: 'active' },
];

const roleLabels: Record<UserRole, string> = {
  warehouse: 'Gudang',
  cashier: 'Kasir',
  auditor: 'Auditor',
  admin: 'Admin',
};

const roleBadgeColors: Record<UserRole, string> = {
  warehouse: 'bg-green-100 text-green-700',
  cashier: 'bg-yellow-100 text-yellow-700',
  auditor: 'bg-blue-100 text-blue-700',
  admin: 'bg-purple-100 text-purple-700',
};

export default function Users() {
  // In a real app we'd fetch this. We'll simulate a very brief loading or just check for presence.
  const [users, setUsers] = useState<DemoUser[]>(DEMO_USERS);
  const loading = false; // Placeholder for real data fetching

  if (loading) {
    return (
      <MainLayout title="Pengguna" subtitle="Kelola pengguna dan hak akses">
        <PageSkeleton variant="table" />
      </MainLayout>
    );
  }
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'warehouse' as UserRole,
  });

  const handleAddUser = () => {
    const user: DemoUser = {
      id: `U${Date.now()}`,
      ...newUser,
      status: 'active',
    };
    setUsers([...users, user]);
    setDialogOpen(false);
    setNewUser({ name: '', email: '', role: 'warehouse' });
  };

  const columns: Column<DemoUser>[] = [
    {
      header: 'Pengguna',
      accessorKey: 'name',
      cell: (item: DemoUser) => (
        <div className="flex items-center gap-3">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold', roleBadgeColors[item.role])}>
            {item.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{item.name}</p>
            <p className="text-sm text-gray-500">{item.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Role',
      accessorKey: 'role',
      cell: (item: DemoUser) => (
        <span className={cn('px-2.5 py-1 rounded-full text-xs font-semibold flex items-center w-fit', roleBadgeColors[item.role])}>
          <Shield className="w-3 h-3 mr-1" />
          {roleLabels[item.role]}
        </span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item: DemoUser) => (
        <span className={cn(
          'px-2.5 py-1 rounded-full text-xs font-semibold',
          item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        )}>
          {item.status === 'active' ? 'Aktif' : 'Nonaktif'}
        </span>
      )
    },
    {
      header: '',
      sortable: false,
      cell: (item: DemoUser) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <MainLayout
      title="Manajemen Pengguna"
      subtitle="Kelola akun pengguna dan hak akses sistem"
      actions={
        <Button onClick={() => setDialogOpen(true)} className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" /> Tambah Pengguna
        </Button>
      }
    >
      <div className="space-y-6">
        <StatsGrid columns={4}>
          <StatsCard
            title="Total Pengguna"
            value={users.length}
            icon={<Users className="w-5 h-5" />}
          />
          <StatsCard
            title="Gudang"
            value={users.filter(u => u.role === 'warehouse').length}
            icon={<Warehouse className="w-5 h-5" />}
          />
          <StatsCard
            title="Kasir"
            value={users.filter(u => u.role === 'cashier').length}
            icon={<Store className="w-5 h-5" />}
          />
          <StatsCard
            title="Auditor"
            value={users.filter(u => u.role === 'auditor').length}
            icon={<UserCheck className="w-5 h-5" />}
          />
        </StatsGrid>

        <BeautifulTable
          data={users}
          columns={columns}
          title="Daftar Pengguna"
          hideSelection
          hideExport
          emptyState={{
            icon: <Users className="w-10 h-10" />,
            title: "Belum Ada Pengguna",
            description: "Tambahkan pengguna baru untuk mulai mengatur akses sistem.",
            actionLabel: "Tambah Pengguna",
            onAction: () => setDialogOpen(true)
          }}
        />

        {/* Add User Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nama lengkap"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@perusahaan.com"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="warehouse" className="cursor-pointer rounded-lg my-1">Gudang</SelectItem>
                    <SelectItem value="cashier" className="cursor-pointer rounded-lg my-1">Kasir</SelectItem>
                    <SelectItem value="auditor" className="cursor-pointer rounded-lg my-1">Auditor</SelectItem>
                    <SelectItem value="admin" className="cursor-pointer rounded-lg my-1">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddUser} className="w-full rounded-xl">
                Simpan Pengguna
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Role Permissions Info */}
        <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <Shield className="w-5 h-5 text-indigo-600" />
            Hak Akses per Role
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <p className="font-bold text-green-700 mb-2">Gudang</p>
              <ul className="text-sm space-y-1 text-green-600/80">
                <li>✓ Lihat stok</li>
                <li>✓ Scan barcode</li>
                <li>✓ Buat permintaan stok</li>
                <li>✓ Stok masuk</li>
              </ul>
            </div>
            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
              <p className="font-bold text-yellow-700 mb-2">Kasir</p>
              <ul className="text-sm space-y-1 text-yellow-600/80">
                <li>✓ Lihat stok</li>
                <li>✓ Lihat permintaan</li>
                <li>✓ Buat surat jalan</li>
              </ul>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="font-bold text-blue-700 mb-2">Auditor</p>
              <ul className="text-sm space-y-1 text-blue-600/80">
                <li>✓ Lihat surat jalan</li>
                <li>✓ Setuju/tolak</li>
                <li>✓ Lihat laporan</li>
              </ul>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <p className="font-bold text-purple-700 mb-2">Admin</p>
              <ul className="text-sm space-y-1 text-purple-600/80">
                <li>✓ Semua akses</li>
                <li>✓ Kelola pengguna</li>
                <li>✓ Kelola produk</li>
                <li>✓ Pengaturan</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
