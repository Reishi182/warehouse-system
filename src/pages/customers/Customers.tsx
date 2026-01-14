
import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { Pencil, Trash2, Users as UsersIcon, Plus, Mail, Phone } from 'lucide-react';

export default function Customers() {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const queryClient = useQueryClient();

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    const { data: customers = [], isLoading } = useQuery({
        queryKey: ['customers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Customer[];
        }
    });

    const createCustomer = useMutation({
        mutationFn: async (newCustomer: typeof formData) => {
            const { error } = await supabase.from('customers').insert([newCustomer]);
            if (error) throw error;
        },
        onSuccess: () => {
            setIsAddOpen(false);
            setFormData({ name: '', email: '', phone: '', address: '' });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Pelanggan berhasil ditambahkan');
        },
        onError: (error) => {
            toast.error(`Gagal menambah pelanggan: ${error.message}`);
        }
    });

    const updateCustomer = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
            const { error } = await supabase.from('customers').update(data).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            setIsEditOpen(false);
            setSelectedCustomer(null);
            setFormData({ name: '', email: '', phone: '', address: '' });
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Pelanggan berhasil diperbarui');
        },
        onError: (error) => {
            toast.error(`Gagal memperbarui pelanggan: ${error.message}`);
        }
    });

    const deleteCustomer = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('customers').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            setIsDeleteOpen(false);
            setSelectedCustomer(null);
            queryClient.invalidateQueries({ queryKey: ['customers'] });
            toast.success('Pelanggan berhasil dihapus');
        },
        onError: (error) => {
            toast.error(`Gagal menghapus pelanggan: ${error.message}`);
        }
    });

    if (isLoading) {
        return (
            <MainLayout title="Pelanggan" subtitle="Kelola data pelanggan B2B">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    const handleSubmit = () => {
        if (!formData.name) return;
        createCustomer.mutate(formData);
    };

    const handleEdit = (customer: Customer) => {
        setSelectedCustomer(customer);
        setFormData({
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || '',
            address: customer.address || ''
        });
        setIsEditOpen(true);
    };

    const handleEditSubmit = () => {
        if (!selectedCustomer || !formData.name) return;
        updateCustomer.mutate({ id: selectedCustomer.id, data: formData });
    };

    const handleDelete = (customer: Customer) => {
        setSelectedCustomer(customer);
        setIsDeleteOpen(true);
    };

    const confirmDelete = () => {
        if (!selectedCustomer) return;
        deleteCustomer.mutate(selectedCustomer.id);
    };

    const columns: Column<Customer>[] = [
        {
            header: 'Nama Pelanggan',
            accessorKey: 'name',
            cell: (item: Customer) => (
                <span className="font-semibold text-gray-900">{item.name}</span>
            )
        },
        {
            header: 'Email',
            accessorKey: 'email',
            cell: (item: Customer) => <span className="text-gray-500">{item.email || '-'}</span>
        },
        {
            header: 'Telepon',
            accessorKey: 'phone',
            cell: (item: Customer) => <span className="font-mono text-gray-600">{item.phone || '-'}</span>
        },
        {
            header: 'Alamat',
            accessorKey: 'address',
            cell: (item: Customer) => <span className="truncate max-w-[200px] block text-gray-500" title={item.address || ''}>{item.address || '-'}</span>
        },
        {
            header: 'Bergabung Sejak',
            accessorKey: 'created_at',
            cell: (item: Customer) => (
                <span className="text-gray-500">
                    {format(new Date(item.created_at), 'dd MMM yyyy', { locale: idLocale })}
                </span>
            )
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (item: Customer) => (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                        className="h-8 w-8 text-gray-500 hover:text-primary hover:bg-primary/10"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item)}
                        className="h-8 w-8 text-gray-500 hover:text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <MainLayout
            title="Manajemen Pelanggan"
            subtitle="Kelola data pelanggan B2B dan relasi bisnis"
            actions={
                <Button onClick={() => setIsAddOpen(true)} className="rounded-xl">
                    <Plus className="mr-2 h-4 w-4" /> Tambah Pelanggan
                </Button>
            }
        >
            <div className="space-y-6">
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Total Pelanggan"
                        value={customers.length}
                        icon={<UsersIcon className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Dengan Email"
                        value={customers.filter(c => c.email).length}
                        icon={<Mail className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Dengan Telepon"
                        value={customers.filter(c => c.phone).length}
                        icon={<Phone className="w-5 h-5" />}
                    />
                </StatsGrid>

                <BeautifulTable
                    data={customers}
                    columns={columns}
                    title="Daftar Pelanggan"
                    isLoading={isLoading}
                    hideSelection
                    hideExport
                    emptyState={{
                        icon: <UsersIcon className="w-10 h-10" />,
                        title: "Belum Ada Pelanggan",
                        description: "Tambahkan pelanggan B2B untuk mulai kelola relasi bisnis Anda.",
                        actionLabel: "Tambah Pelanggan",
                        onAction: () => setIsAddOpen(true)
                    }}
                />
            </div>

            {/* Add Customer Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="rounded-2xl p-6 sm:p-8">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold">Tambah Pelanggan Baru</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label>Nama Lengkap / Perusahaan</Label>
                            <Input
                                className="rounded-xl h-11"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="PT. Contoh Abadi"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    className="rounded-xl h-11"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>No. Telepon</Label>
                                <Input
                                    className="rounded-xl h-11"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="0812..."
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Alamat</Label>
                            <Input
                                className="rounded-xl h-11"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Alamat lengkap..."
                            />
                        </div>

                        <Button
                            className="w-full mt-4 rounded-xl h-11 font-semibold"
                            onClick={handleSubmit}
                            disabled={createCustomer.isPending}
                        >
                            {createCustomer.isPending ? 'Menyimpan...' : 'Simpan Customer'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Customer Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="rounded-2xl p-6 sm:p-8">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold">Edit Pelanggan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label>Nama Lengkap / Perusahaan</Label>
                            <Input
                                className="rounded-xl h-11"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="PT. Contoh Abadi"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    className="rounded-xl h-11"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>No. Telepon</Label>
                                <Input
                                    className="rounded-xl h-11"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="0812..."
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Alamat</Label>
                            <Input
                                className="rounded-xl h-11"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Alamat lengkap..."
                            />
                        </div>

                        <Button
                            className="w-full mt-4 rounded-xl h-11 font-semibold"
                            onClick={handleEditSubmit}
                            disabled={updateCustomer.isPending}
                        >
                            {updateCustomer.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Pelanggan?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus <strong>{selectedCustomer?.name}</strong>?
                            Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="rounded-xl bg-destructive hover:bg-destructive/90"
                        >
                            Hapus
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
}
