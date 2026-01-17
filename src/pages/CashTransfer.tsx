import { useMemo, useState } from 'react';
import { Wallet, ArrowUpFromLine, Check, X, Plus } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import { DateInput } from '@/components/common/DatePicker';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import {
  useCashTransferRequests,
  useCreateCashTransferRequest,
  useApproveCashTransferRequest,
  useRejectCashTransferRequest,
} from '@/hooks/useCashTransferRequests';
import { CashTransferRequest } from '@/types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function sameISODate(dateTime: string, isoDate: string) {
  return dateTime.slice(0, 10) === isoDate;
}

export default function CashTransfer() {
  const role = useRole();
  const { user, profile } = useAuth();
  const { sales, cashTransfers, loading } = useData();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()));
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>('');

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Hooks for cash transfer requests
  const { data: cashTransferRequests = [], isLoading } = useCashTransferRequests();
  const createRequest = useCreateCashTransferRequest();
  const approveRequest = useApproveCashTransferRequest();
  const rejectRequest = useRejectCashTransferRequest();

  // Role checks - moved BEFORE useMemo hooks
  const isMainOffice = role === 'main_office';
  const isAdmin = role === 'admin';
  const isCashier = role === 'cashier';
  const isApproverView = isMainOffice || isAdmin;
  const canCreateRequest = isCashier || isAdmin;
  const todayStr = toISODate(new Date());

  // ALL useMemo hooks MUST be before the loading return
  const myCashSales = useMemo(() => {
    if (!canCreateRequest) return [];
    return sales.filter(
      (s) =>
        s.payment_method === 'cash' &&
        sameISODate(s.created_at, selectedDate) &&
        (!!user?.id ? s.cashier_id === user.id : true),
    );
  }, [sales, selectedDate, user?.id, canCreateRequest]);

  const myApprovedTransfers = useMemo(() => {
    if (!canCreateRequest) return [];
    return cashTransfers.filter(
      (t) => t.transfer_date === selectedDate && (!!user?.id ? t.cashier_id === user.id : true),
    );
  }, [cashTransfers, selectedDate, user?.id, canCreateRequest]);

  const totalCashSales = useMemo(() => myCashSales.reduce((acc, s) => acc + s.total_amount, 0), [myCashSales]);
  const totalMyApproved = useMemo(() => myApprovedTransfers.reduce((acc, t) => acc + t.amount, 0), [myApprovedTransfers]);

  const myPendingAmount = useMemo(() => {
    if (!canCreateRequest) return 0;
    const myPendingRequests = cashTransferRequests.filter(r =>
      r.status === 'pending' && r.cashier_id === user?.id
    );
    return myPendingRequests.reduce((acc, r) => acc + r.amount, 0);
  }, [cashTransferRequests, user?.id, canCreateRequest]);

  const mainOfficeSaldoTersedia = useMemo(() => {
    if (!isMainOffice) return 0;
    const pastApprovedTransfers = cashTransfers.filter(
      (t) => t.transfer_date < todayStr
    );
    return pastApprovedTransfers.reduce((acc, t) => acc + t.amount, 0);
  }, [cashTransfers, todayStr, isMainOffice]);

  const todayApprovedAmount = useMemo(() => {
    if (!isMainOffice) return 0;
    const todayApproved = cashTransfers.filter(t => t.transfer_date === todayStr);
    return todayApproved.reduce((acc, t) => acc + t.amount, 0);
  }, [cashTransfers, todayStr, isMainOffice]);

  const pendingRequests = useMemo(() => {
    return cashTransferRequests.filter(r =>
      r.status === 'pending' && sameISODate(r.requested_at, selectedDate)
    );
  }, [cashTransferRequests, selectedDate]);

  const totalPendingAmount = useMemo(() => {
    const pending = cashTransferRequests.filter(r => r.status === 'pending');
    return pending.reduce((acc, r) => acc + r.amount, 0);
  }, [cashTransferRequests]);

  const myRequests = useMemo(() => {
    if (isApproverView) return [];
    return cashTransferRequests.filter(r =>
      sameISODate(r.requested_at, selectedDate) && r.cashier_id === user?.id
    );
  }, [cashTransferRequests, user?.id, isApproverView, selectedDate]);

  // Kasir: Saldo Tersedia = Cash Sales - (Approved + Pending)
  const kasirSaldoTersedia = Math.max(0, totalCashSales - totalMyApproved - myPendingAmount);

  // NOW we can have the loading return - AFTER all hooks


  // Define columns for request table
  type RequestType = CashTransferRequest;
  const requestColumns: Column<RequestType>[] = [
    {
      header: 'Waktu',
      accessorKey: 'requested_at',
      cell: (item: RequestType) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(item.requested_at), 'dd MMM yyyy HH:mm', { locale: localeId })}
        </span>
      )
    },
    {
      header: 'Kasir',
      accessorKey: 'cashier_name',
      cell: (item: RequestType) => <span className="font-medium">{item.cashier_name}</span>
    },
    {
      header: 'Nominal',
      accessorKey: 'amount',
      cell: (item: RequestType) => (
        <span className="font-semibold">Rp {item.amount.toLocaleString('id-ID')}</span>
      )
    },
    {
      header: 'Catatan',
      accessorKey: 'note',
      cell: (item: RequestType) => (
        <span className="text-sm text-muted-foreground">{item.note || '-'}</span>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (item: RequestType) => {
        const colors: Record<string, string> = {
          pending: 'bg-yellow-100 text-yellow-700',
          approved: 'bg-green-100 text-green-700',
          rejected: 'bg-red-100 text-red-700'
        };
        const labels: Record<string, string> = {
          pending: 'Menunggu',
          approved: 'Diterima',
          rejected: 'Ditolak'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[item.status] || ''}`}>
            {labels[item.status] || item.status}
          </span>
        );
      }
    },
    {
      header: 'Aksi',
      sortable: false,
      cell: (item: RequestType) => isApproverView && item.status === 'pending' ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleApprove(item.id)}
            disabled={approveRequest.isPending}
            className="rounded-lg"
          >
            <Check className="w-4 h-4 mr-1" />
            Terima
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive rounded-lg"
            onClick={() => openRejectDialog(item.id)}
          >
            <X className="w-4 h-4 mr-1" />
            Tolak
          </Button>
        </div>
      ) : null
    }
  ];

  const handleSubmitRequest = async () => {
    if (totalCashSales === 0) {
      toast({
        title: 'Tidak bisa membuat permintaan',
        description: 'Total cash masuk hari ini adalah 0',
        variant: 'destructive',
      });
      return;
    }

    if (amount <= 0) {
      toast({
        title: 'Nominal tidak valid',
        description: 'Masukkan nominal setoran yang valid',
        variant: 'destructive',
      });
      return;
    }

    if (amount > kasirSaldoTersedia) {
      toast({
        title: 'Nominal melebihi saldo tersedia',
        description: `Saldo tersedia: Rp ${kasirSaldoTersedia.toLocaleString('id-ID')}`,
        variant: 'destructive',
      });
      return;
    }

    await createRequest.mutateAsync({
      amount,
      note: note || null,
      cashierId: user?.id,
      cashierName: profile?.name || 'Kasir',
    });

    setAmount(0);
    setNote('');
  };

  const handleApprove = async (requestId: string) => {
    await approveRequest.mutateAsync({
      requestId,
      auditorId: user?.id,
      auditorName: profile?.name || 'Auditor',
    });
  };

  const openRejectDialog = (requestId: string) => {
    setSelectedRequestId(requestId);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedRequestId) return;
    if (!rejectReason.trim()) {
      toast({
        title: 'Alasan diperlukan',
        description: 'Masukkan alasan penolakan',
        variant: 'destructive',
      });
      return;
    }

    await rejectRequest.mutateAsync({
      requestId: selectedRequestId,
      reason: rejectReason,
      auditorId: user?.id,
      auditorName: profile?.name || 'Auditor',
    });

    setRejectDialogOpen(false);
    setSelectedRequestId(null);
    setRejectReason('');
  };
  if (loading) {
    return (
      <MainLayout title="Cash" subtitle="Kelola setoran cash">
        <PageSkeleton variant="table" />
      </MainLayout>
    );
  }
  return (
    <MainLayout
      title="Cash"
      subtitle="Kelola setoran cash"
      actions={
        canCreateRequest && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl text-xs sm:text-sm">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ajukan Setoran</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowUpFromLine className="w-5 h-5" />
                  Ajukan Setoran ke Main Office
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {totalCashSales === 0 && !isMainOffice ? (
                  <div className="p-4 rounded-lg border bg-muted/30 text-center text-muted-foreground">
                    Tidak ada cash masuk hari ini. Tidak bisa membuat permintaan setoran.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Nominal Setoran</Label>
                        <Input
                          type="number"
                          min={0}
                          value={amount}
                          onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                        />
                        {kasirSaldoTersedia > 0 && (
                          <Button type="button" variant="outline" size="sm" onClick={() => setAmount(kasirSaldoTersedia)}>
                            Isi saldo tersedia (Rp {kasirSaldoTersedia.toLocaleString('id-ID')})
                          </Button>
                        )}
                        {myPendingAmount > 0 && (
                          <p className="text-xs text-amber-600">
                            ⚠️ Rp {myPendingAmount.toLocaleString('id-ID')} sedang menunggu persetujuan
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Catatan (opsional)</Label>
                        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="contoh: setor sore hari" />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={amount <= 0 || createRequest.isPending}
                      onClick={() => {
                        handleSubmitRequest();
                        setIsCreateOpen(false);
                      }}
                    >
                      {createRequest.isPending ? 'Mengirim...' : 'Ajukan Setoran'}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )
      }
    >
      <div className="space-y-6">
        <StatsGrid columns={3}>
          {canCreateRequest && !isMainOffice && (
            <>
              <StatsCard
                title="Cash Masuk"
                value={`Rp ${totalCashSales.toLocaleString('id-ID')}`}
                icon={<Wallet className="w-5 h-5" />}
              />
              <StatsCard
                title="Pending"
                value={`Rp ${myPendingAmount.toLocaleString('id-ID')}`}
                icon={<ArrowUpFromLine className="w-5 h-5" />}
                subtitleType="warning"
              />
              <StatsCard
                title="Tersedia"
                value={`Rp ${kasirSaldoTersedia.toLocaleString('id-ID')}`}
                icon={<Check className="w-5 h-5" />}
                subtitleType="success"
              />
            </>
          )}
          {isMainOffice && (
            <>
              <StatsCard
                title="Pending"
                value={`Rp ${totalPendingAmount.toLocaleString('id-ID')}`}
                icon={<ArrowUpFromLine className="w-5 h-5" />}
                subtitleType="warning"
              />
              <StatsCard
                title="Saldo s.d. Kemarin"
                value={`Rp ${mainOfficeSaldoTersedia.toLocaleString('id-ID')}`}
                icon={<Wallet className="w-5 h-5" />}
              />
              <StatsCard
                title="Hari Ini"
                value={`+Rp ${todayApprovedAmount.toLocaleString('id-ID')}`}
                icon={<Check className="w-5 h-5" />}
                subtitleType="success"
              />
            </>
          )}
        </StatsGrid>

        <div className="space-y-6">
          {/* Date Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Label>Tanggal:</Label>
                <DateInput
                  value={selectedDate}
                  onChange={setSelectedDate}
                  disableFuture
                  placeholder="Pilih tanggal"
                />
              </div>
            </CardContent>
          </Card>

          {/* Requests Table */}
          <BeautifulTable
            data={isApproverView ? pendingRequests : myRequests}
            columns={requestColumns}
            title={isApproverView ? 'Permintaan Setoran Pending' : 'Permintaan Saya'}
            hideSelection
            hideExport
          />

          {/* Reject Dialog */}
          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tolak Permintaan Setoran</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">Masukkan alasan penolakan:</p>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Alasan penolakan..."
                  rows={4}
                />
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={rejectRequest.isPending}
                  >
                    {rejectRequest.isPending ? 'Menolak...' : 'Tolak'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </MainLayout>
  );
}
