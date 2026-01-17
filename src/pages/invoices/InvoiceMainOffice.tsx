
import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types';
import { BeautifulTable } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import CreateInvoiceForm from './components/CreateInvoiceForm';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { FileText, Download, Plus, Wallet } from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';

export default function InvoiceMainOffice() {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const queryClient = useQueryClient();

    // Fetch Invoices with related Customer data
    const { data: invoices = [], isLoading } = useQuery({
        queryKey: ['invoices'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('invoices')
                .select('*, customer:customers(name)')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform logic
            return data.map((inv: any) => ({
                ...inv,
                recipient_name: inv.customer?.name || inv.recipient_name
            })) as Invoice[];
        }
    });

    // Create Invoice Mutation - must be before conditional return
    const createInvoice = useMutation({
        mutationFn: async (formData: any) => {
            // 1. Create Invoice
            const { data: invoice, error: invError } = await supabase
                .from('invoices')
                .insert([{
                    invoice_number: `INV/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${Date.now().toString().slice(-4)}`,
                    recipient_name: formData.recipientName,
                    recipient_address: formData.recipientAddress,
                    customer_id: formData.customerId || null,
                    due_date: formData.dueDate,
                    total_amount: formData.totalAmount,
                    status: 'unpaid'
                }])
                .select()
                .single();

            if (invError) throw invError;
            if (!invoice) throw new Error('Failed to create invoice');

            // 2. Create Invoice Items
            const items = formData.items.map((item: any) => ({
                invoice_id: invoice.id,
                product_id: item.productId,
                product_name: item.productName,
                quantity: item.quantity,
                price: item.price,
                total: item.total
            }));

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(items);

            if (itemsError) throw itemsError;
            return invoice;
        },
        onSuccess: () => {
            setIsCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            toast.success('Invoice berhasil dibuat!');
        },
        onError: (error) => {
            toast.error(`Gagal membuat invoice: ${error.message}`);
        }
    });

    if (isLoading) {
        return (
            <MainLayout title="Invoices" subtitle="Kelola tagihan pelanggan (B2B)">
                <PageSkeleton variant="table" />
            </MainLayout>
        );
    }

    const handleCreateInvoice = (data: any) => {
        createInvoice.mutate(data);
    };

    const columns = [
        {
            header: 'Invoice',
            accessorKey: 'invoice_number' as keyof Invoice,
            className: 'pl-0',
            cell: (item: Invoice) => (
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <FileText className="w-5 h-5" />
                    </div>
                    <div>
                        <span className="font-bold text-gray-900 block">{item.invoice_number}</span>
                        <span className="text-xs text-gray-400">{item.items?.length || 0} items</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Penerima',
            accessorKey: 'recipient_name' as keyof Invoice,
            cell: (item: Invoice) => <span className="font-medium text-gray-700">{item.recipient_name}</span>
        },
        {
            header: 'Jatuh Tempo',
            accessorKey: 'due_date' as keyof Invoice,
            cell: (item: Invoice) => (
                <span className="text-gray-500 font-medium">
                    {item.due_date ? format(new Date(item.due_date), 'MMMM dd, yyyy', { locale: idLocale }) : '-'}
                </span>
            )
        },
        {
            header: 'Total',
            accessorKey: 'total_amount' as keyof Invoice,
            className: 'font-bold',
            cell: (item: Invoice) => <span className="text-gray-900 font-bold text-base">Rp {item.total_amount.toLocaleString()}</span>
        },
        {
            header: 'Status',
            accessorKey: 'status' as keyof Invoice,
            cell: (item: Invoice) => {
                const styles = {
                    paid: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                    unpaid: 'bg-yellow-50 text-yellow-600 border-yellow-100',
                    overdue: 'bg-red-50 text-red-600 border-red-100',
                    cancelled: 'bg-gray-50 text-gray-500 border-gray-100'
                };
                return (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[item.status]}`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                )
            }
        },
        {
            header: '',
            cell: () => (
                <div className="flex justify-end">
                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full">
                        <Download className="w-5 h-5" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <MainLayout
            title="Invoices"
            subtitle="Kelola tagihan pelanggan (B2B)"
            actions={
                <Button onClick={() => setIsCreateOpen(true)} className="rounded-xl text-xs sm:text-sm">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Create Invoice</span>
                </Button>
            }
        >
            <div className="space-y-6">
                <StatsGrid columns={4}>
                    <StatsCard
                        title="Total Invoice"
                        value={invoices.length}
                        icon={<FileText className="w-5 h-5" />}
                    />
                    <StatsCard
                        title="Belum Lunas"
                        value={invoices.filter(i => i.status === 'unpaid').length}
                        icon={<FileText className="w-5 h-5" />}
                        subtitleType="warning"
                    />
                    <StatsCard
                        title="Lunas"
                        value={invoices.filter(i => i.status === 'paid').length}
                        icon={<FileText className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Total Nilai"
                        value={`Rp ${invoices.reduce((a, i) => a + i.total_amount, 0).toLocaleString()}`}
                        icon={<Wallet className="w-5 h-5" />}
                    />
                </StatsGrid>

                <BeautifulTable
                    data={invoices}
                    columns={columns}
                    title="Billing History"
                    isLoading={isLoading}
                    hideSelection
                    emptyState={{
                        icon: <FileText className="w-10 h-10" />,
                        title: "Belum Ada Invoice",
                        description: "Buat invoice pertama untuk mulai menagih pelanggan B2B.",
                        actionLabel: "Create Invoice",
                        onAction: () => setIsCreateOpen(true)
                    }}
                />
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 gap-0">
                    <div className="p-6 pb-0">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold">Buat Invoice Baru</DialogTitle>
                        </DialogHeader>
                    </div>
                    <div className="p-6">
                        <CreateInvoiceForm
                            onSubmit={handleCreateInvoice}
                            onCancel={() => setIsCreateOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
