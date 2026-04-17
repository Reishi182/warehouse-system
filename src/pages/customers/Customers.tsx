import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { exportToExcel } from '@/lib/exportExcel';
import {
  Users, Mail, Phone, Plus, Pencil, Trash2, Search,
  History, ShoppingBag, CreditCard, FileText, Download,
  TrendingUp, AlertCircle,
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Customer } from '@/types';
import { Label } from '@/components/ui/label';

const formatRp = (v: number) => `Rp ${v.toLocaleString('id-ID')}`;
const formatRpShort = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(v) >= 1_000) return `Rp ${(v / 1_000).toFixed(0)}rb`;
  return `Rp ${v.toLocaleString('id-ID')}`;
};

interface CustomerWithStats extends Customer {
  totalOmzet: number;
  totalPiutang: number;
  totalTransaksi: number;
  lastTransaction: string | null;
}

function CustomerHistoryDialog({ customer, open, onClose }: { customer: Customer | null; open: boolean; onClose: () => void }) {
  const { data: suratJalans = [] } = useQuery({
    queryKey: ['customer-history-sj', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data } = await supabase
        .from('surat_jalan')
        .select('*, items:surat_jalan_items(*)')
        .eq('recipient_name', customer.name)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!customer && open,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['customer-history-inv', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!customer && open,
  });

  const { data: credits = [] } = useQuery({
    queryKey: ['customer-history-credit', customer?.id],
    queryFn: async () => {
      if (!customer) return [];
      const { data } = await supabase
        .from('sales')
        .select('id, sale_number, total_amount, created_at, is_credit, credit_settled_at, credit_customer_name')
        .eq('is_credit', true)
        .ilike('credit_customer_name', `%${customer.name}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!customer && open,
  });

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {customer.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold">{customer.name}</p>
              {customer.phone && <p className="text-xs text-muted-foreground font-normal">{customer.phone}</p>}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="sj">
          <TabsList className="w-full">
            <TabsTrigger value="sj" className="flex-1">Surat Jalan ({suratJalans.length})</TabsTrigger>
            <TabsTrigger value="invoice" className="flex-1">Invoice ({invoices.length})</TabsTrigger>
            <TabsTrigger value="credit" className="flex-1">Kredit ({credits.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="sj" className="mt-4 max-h-72 overflow-y-auto space-y-2">
            {suratJalans.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Tidak ada surat jalan</p>
            ) : suratJalans.map((sj: any) => (
              <div key={sj.id} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/50">
                <div>
                  <p className="font-mono text-sm font-semibold">{sj.number}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(sj.created_at), 'dd MMM yyyy', { locale: localeId })}</p>
                </div>
                <Badge variant={sj.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                  {sj.status}
                </Badge>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="invoice" className="mt-4 max-h-72 overflow-y-auto space-y-2">
            {invoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Tidak ada invoice</p>
            ) : invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/50">
                <div>
                  <p className="font-mono text-sm font-semibold">{inv.invoice_number}</p>
                  <p className="text-sm font-medium">{formatRp(inv.total_amount)}</p>
                  <p className="text-xs text-muted-foreground">{inv.issued_date ? format(new Date(inv.issued_date), 'dd MMM yyyy', { locale: localeId }) : '-'}</p>
                </div>
                <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'overdue' ? 'destructive' : 'secondary'} className="text-xs capitalize">
                  {inv.status}
                </Badge>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="credit" className="mt-4 max-h-72 overflow-y-auto space-y-2">
            {credits.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 text-sm">Tidak ada kredit</p>
            ) : credits.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/50">
                <div>
                  <p className="font-mono text-sm font-semibold">{c.sale_number}</p>
                  <p className="text-sm font-medium">{formatRp(c.total_amount)}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(c.created_at), 'dd MMM yyyy', { locale: localeId })}</p>
                </div>
                <Badge variant={c.credit_settled_at ? 'default' : 'destructive'} className="text-xs">
                  {c.credit_settled_at ? 'Lunas' : 'Belum Lunas'}
                </Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default function Customers() {
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const qc = useQueryClient();

  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });

  const { data: customers = [], isLoading } = useQuery<CustomerWithStats[]>({
    queryKey: ['customers-with-stats'],
    queryFn: async () => {
      const [custRes, salesRes, invoiceRes] = await Promise.all([
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('sales').select('id, credit_customer_name, total_amount, is_credit, credit_settled_at, is_cancelled, created_at').or('is_cancelled.is.null,is_cancelled.eq.false'),
        supabase.from('invoices').select('id, customer_id, total_amount, status'),
      ]);

      const sales = salesRes.data || [];
      const invoices = invoiceRes.data || [];

      return (custRes.data || []).map(c => {
        const cInvoices = invoices.filter((i: any) => i.customer_id === c.id);
        const totalInvoice = cInvoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0);
        const unpaidInvoice = cInvoices.filter((i: any) => i.status !== 'paid').reduce((s: number, i: any) => s + (i.total_amount || 0), 0);

        const cCredits = sales.filter((s: any) => s.is_credit && s.credit_customer_name?.toLowerCase().includes(c.name.toLowerCase()));
        const unsettledCredit = cCredits.filter((s: any) => !s.credit_settled_at).reduce((s: number, r: any) => s + r.total_amount, 0);

        return {
          ...c,
          totalOmzet: totalInvoice,
          totalPiutang: unpaidInvoice + unsettledCredit,
          totalTransaksi: cInvoices.length,
          lastTransaction: cInvoices.length > 0 ? cInvoices[0]?.updated_at || null : null,
        } as CustomerWithStats;
      });
    },
  });

  const createCustomer = useMutation({
    mutationFn: async (d: typeof formData) => { const { error } = await supabase.from('customers').insert([d]); if (error) throw error; },
    onSuccess: () => { setIsAddOpen(false); setFormData({ name: '', email: '', phone: '', address: '' }); qc.invalidateQueries({ queryKey: ['customers-with-stats'] }); toast.success('Pelanggan ditambahkan'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateCustomer = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => { const { error } = await supabase.from('customers').update(data).eq('id', id); if (error) throw error; },
    onSuccess: () => { setIsEditOpen(false); qc.invalidateQueries({ queryKey: ['customers-with-stats'] }); toast.success('Pelanggan diperbarui'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('customers').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { setIsDeleteOpen(false); qc.invalidateQueries({ queryKey: ['customers-with-stats'] }); toast.success('Pelanggan dihapus'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalOmzet = customers.reduce((s, c) => s + c.totalOmzet, 0);
  const totalPiutang = customers.reduce((s, c) => s + c.totalPiutang, 0);

  const handleExport = () => exportToExcel(
    filtered.map(c => ({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '', totalOmzet: c.totalOmzet, totalPiutang: c.totalPiutang, since: c.created_at })),
    [
      { header: 'Nama', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Telepon', key: 'phone', width: 18 },
      { header: 'Alamat', key: 'address', width: 36 },
      { header: 'Total Invoice', key: 'totalOmzet', format: 'number', width: 18 },
      { header: 'Total Piutang', key: 'totalPiutang', format: 'number', width: 18 },
      { header: 'Bergabung Sejak', key: 'since', format: 'date', width: 18 },
    ],
    'Daftar-Pelanggan',
    'Pelanggan'
  );

  const columns: Column<CustomerWithStats>[] = [
    {
      header: 'Pelanggan', accessorKey: 'name',
      cell: c => (
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
              {c.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{c.name}</p>
            {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
          </div>
        </div>
      ),
    },
    {
      header: 'Kontak', accessorKey: 'email',
      cell: c => (
        <div className="space-y-0.5">
          {c.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</p>}
          {!c.email && <p className="text-xs text-muted-foreground">—</p>}
        </div>
      ),
    },
    {
      header: 'Total Invoice', accessorKey: 'totalOmzet',
      cell: c => <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{c.totalOmzet > 0 ? formatRpShort(c.totalOmzet) : '—'}</span>,
    },
    {
      header: 'Piutang', accessorKey: 'totalPiutang',
      cell: c => c.totalPiutang > 0
        ? <span className="flex items-center gap-1 text-sm font-semibold text-red-600 dark:text-red-400"><AlertCircle className="w-3.5 h-3.5" />{formatRpShort(c.totalPiutang)}</span>
        : <span className="text-emerald-600 dark:text-emerald-400 text-sm">Lunas</span>,
    },
    {
      header: 'Bergabung', accessorKey: 'created_at',
      cell: c => <span className="text-xs text-muted-foreground">{format(new Date(c.created_at), 'dd MMM yyyy', { locale: localeId })}</span>,
    },
    {
      header: 'Aksi', sortable: false,
      cell: c => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setHistoryCustomer(c)} title="Riwayat">
            <History className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => { setSelectedCustomer(c); setFormData({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '' }); setIsEditOpen(true); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => { setSelectedCustomer(c); setIsDeleteOpen(true); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <MainLayout title="Pelanggan" subtitle="Kelola data pelanggan B2B"><PageSkeleton variant="table" /></MainLayout>;

  const CustomerForm = ({ onSubmit, isPending }: { onSubmit: () => void; isPending: boolean }) => (
    <div className="space-y-4 mt-2">
      <div className="space-y-2"><Label>Nama / Perusahaan</Label><Input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} placeholder="PT Contoh Abadi" className="rounded-xl" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Email</Label><Input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" className="rounded-xl" /></div>
        <div className="space-y-2"><Label>Telepon</Label><Input value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} placeholder="0812..." className="rounded-xl" /></div>
      </div>
      <div className="space-y-2"><Label>Alamat</Label><Input value={formData.address} onChange={e => setFormData(f => ({ ...f, address: e.target.value }))} placeholder="Alamat lengkap" className="rounded-xl" /></div>
      <Button className="w-full rounded-xl" onClick={onSubmit} disabled={isPending || !formData.name}>{isPending ? 'Menyimpan...' : 'Simpan'}</Button>
    </div>
  );

  return (
    <MainLayout
      title="Manajemen Pelanggan"
      subtitle="Kelola data pelanggan B2B dan relasi bisnis"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Excel</Button>
          <Button onClick={() => { setFormData({ name: '', email: '', phone: '', address: '' }); setIsAddOpen(true); }} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Tambah
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <StatsGrid columns={4}>
          <StatsCard title="Total Pelanggan" value={customers.length} icon={<Users className="w-5 h-5" />} gradient="blue" />
          <StatsCard title="Total Invoice" value={formatRpShort(totalOmzet)} subtitle="Semua invoice B2B" icon={<FileText className="w-5 h-5" />} gradient="purple" />
          <StatsCard title="Piutang Outstanding" value={formatRpShort(totalPiutang)} subtitle={`${customers.filter(c => c.totalPiutang > 0).length} pelanggan`} subtitleType={totalPiutang > 0 ? 'danger' : 'normal'} icon={<CreditCard className="w-5 h-5" />} gradient="orange" />
          <StatsCard title="Dengan Kontak" value={customers.filter(c => c.phone || c.email).length} subtitle="Data lengkap" icon={<Phone className="w-5 h-5" />} gradient="emerald" />
        </StatsGrid>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari nama, telepon, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-xl" />
          </div>
        </div>

        <BeautifulTable data={filtered} columns={columns} title="Daftar Pelanggan" hideSelection hideExport
          emptyState={{ icon: <Users className="w-10 h-10" />, title: 'Belum Ada Pelanggan', description: 'Tambahkan pelanggan B2B pertama Anda.', actionLabel: 'Tambah Pelanggan', onAction: () => setIsAddOpen(true) }}
        />
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Tambah Pelanggan</DialogTitle></DialogHeader><CustomerForm onSubmit={() => createCustomer.mutate(formData)} isPending={createCustomer.isPending} /></DialogContent></Dialog>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}><DialogContent className="rounded-2xl"><DialogHeader><DialogTitle>Edit Pelanggan</DialogTitle></DialogHeader><CustomerForm onSubmit={() => selectedCustomer && updateCustomer.mutate({ id: selectedCustomer.id, data: formData })} isPending={updateCustomer.isPending} /></DialogContent></Dialog>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader><AlertDialogTitle>Hapus Pelanggan?</AlertDialogTitle><AlertDialogDescription>Yakin ingin menghapus <strong>{selectedCustomer?.name}</strong>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive hover:bg-destructive/90" onClick={() => selectedCustomer && deleteCustomer.mutate(selectedCustomer.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomerHistoryDialog customer={historyCustomer} open={!!historyCustomer} onClose={() => setHistoryCustomer(null)} />
    </MainLayout>
  );
}
