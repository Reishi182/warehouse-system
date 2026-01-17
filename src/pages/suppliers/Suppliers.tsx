import { useState } from 'react';
import { Plus, Pencil, Trash2, Building2, Phone, Mail, User } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    useSuppliers,
    useCreateSupplier,
    useUpdateSupplier,
    useDeleteSupplier,
} from '@/hooks/useSuppliers';
import { Supplier } from '@/types';

const initialFormData = {
    name: '',
    address: '',
    phone: '',
    email: '',
    contact_person: '',
};

export default function Suppliers() {
    const { data: suppliers = [], isLoading } = useSuppliers();
    const createSupplier = useCreateSupplier();
    const updateSupplier = useUpdateSupplier();
    const deleteSupplier = useDeleteSupplier();

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState(initialFormData);

    const handleAdd = async () => {
        if (!formData.name.trim()) return;
        await createSupplier.mutateAsync({
            name: formData.name,
            address: formData.address || null,
            phone: formData.phone || null,
            email: formData.email || null,
            contact_person: formData.contact_person || null,
        });
        setFormData(initialFormData);
        setIsAddOpen(false);
    };

    const handleEdit = async () => {
        if (!selectedSupplier || !formData.name.trim()) return;
        await updateSupplier.mutateAsync({
            id: selectedSupplier.id,
            name: formData.name,
            address: formData.address || null,
            phone: formData.phone || null,
            email: formData.email || null,
            contact_person: formData.contact_person || null,
        });
        setFormData(initialFormData);
        setSelectedSupplier(null);
        setIsEditOpen(false);
    };

    const handleDelete = async () => {
        if (!selectedSupplier) return;
        await deleteSupplier.mutateAsync(selectedSupplier.id);
        setSelectedSupplier(null);
        setIsDeleteOpen(false);
    };

    const openEditDialog = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setFormData({
            name: supplier.name,
            address: supplier.address || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            contact_person: supplier.contact_person || '',
        });
        setIsEditOpen(true);
    };

    const openDeleteDialog = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsDeleteOpen(true);
    };

    const columns: Column<Supplier>[] = [
        {
            header: 'Nama Supplier',
            accessorKey: 'name',
            cell: (item) => (
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{item.name}</span>
                </div>
            ),
        },
        {
            header: 'Contact Person',
            accessorKey: 'contact_person',
            cell: (item) => item.contact_person ? (
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{item.contact_person}</span>
                </div>
            ) : <span className="text-muted-foreground">-</span>,
        },
        {
            header: 'Telepon',
            accessorKey: 'phone',
            cell: (item) => item.phone ? (
                <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{item.phone}</span>
                </div>
            ) : <span className="text-muted-foreground">-</span>,
        },
        {
            header: 'Email',
            accessorKey: 'email',
            cell: (item) => item.email ? (
                <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{item.email}</span>
                </div>
            ) : <span className="text-muted-foreground">-</span>,
        },
        {
            header: 'Alamat',
            accessorKey: 'address',
            cell: (item) => (
                <span className="text-sm text-muted-foreground line-clamp-2">
                    {item.address || '-'}
                </span>
            ),
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (item) => (
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => openDeleteDialog(item)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    if (isLoading) {
        return (
            <MainLayout title="Supplier" subtitle="Kelola data supplier">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title="Manajemen Supplier"
            subtitle="Kelola vendor dan pemasok barang Anda"
            actions={
                <Button onClick={() => setIsAddOpen(true)} className="rounded-xl text-xs sm:text-sm">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Tambah Supplier</span>
                </Button>
            }
        >
            <div className="space-y-6">
                {/* Stats Cards */}
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Total Supplier"
                        value={suppliers.length}
                        icon={<Building2 className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Dengan Email"
                        value={suppliers.filter(s => s.email).length}
                        icon={<Mail className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Dengan Contact"
                        value={suppliers.filter(s => s.contact_person).length}
                        icon={<User className="w-5 h-5" />}
                    />
                </StatsGrid>

                {/* Table */}
                <BeautifulTable
                    data={suppliers}
                    columns={columns}
                    title="Daftar Supplier"
                    hideSelection
                    emptyState={{
                        icon: <Building2 className="w-10 h-10" />,
                        title: "Belum Ada Supplier",
                        description: "Tambahkan supplier untuk mulai kelola vendor dan pemasok Anda.",
                        actionLabel: "Tambah Supplier",
                        onAction: () => setIsAddOpen(true)
                    }}
                />

                {/* Add Dialog */}
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Tambah Supplier Baru</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Nama Supplier *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="PT. Contoh Supplier"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Contact Person</Label>
                                <Input
                                    value={formData.contact_person}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="Nama kontak"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Telepon</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="08123456789"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="supplier@example.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Alamat</Label>
                                <Textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Alamat lengkap supplier"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                                    Batal
                                </Button>
                                <Button onClick={handleAdd} disabled={createSupplier.isPending || !formData.name.trim()}>
                                    {createSupplier.isPending ? 'Menyimpan...' : 'Simpan'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Edit Supplier</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Nama Supplier *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="PT. Contoh Supplier"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Contact Person</Label>
                                <Input
                                    value={formData.contact_person}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="Nama kontak"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Telepon</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="08123456789"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="supplier@example.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Alamat</Label>
                                <Textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    placeholder="Alamat lengkap supplier"
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 justify-end pt-4">
                                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                                    Batal
                                </Button>
                                <Button onClick={handleEdit} disabled={updateSupplier.isPending || !formData.name.trim()}>
                                    {updateSupplier.isPending ? 'Menyimpan...' : 'Simpan'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Delete Dialog */}
                <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Supplier?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Apakah Anda yakin ingin menghapus supplier "{selectedSupplier?.name}"?
                                Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {deleteSupplier.isPending ? 'Menghapus...' : 'Hapus'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </MainLayout>
    );
}
