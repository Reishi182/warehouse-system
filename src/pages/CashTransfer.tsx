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
        !s.is_cancelled &&
        !s.is_exchanged &&
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

  // Total all cash sales (for reference in deposit dialog) - exclude cancelled/exchanged
  const totalAllCashSales = useMemo(() => {
    if (!canCreateRequest) return 0;
    return sales
      .filter(s =>
        s.payment_method === 'cash' &&
        !s.is_cancelled &&
        !s.is_exchanged &&
        (!!user?.id ? s.cashier_id === user.id : true)
      )
      .reduce((acc, s) => acc + s.total_amount, 0);
  }, [sales, user?.id, canCreateRequest]);

  // Total deposits from requests (both pending and approved) - using requests as source of truth
  const myApprovedFromRequests = useMemo(() => {
    if (!canCreateRequest) return 0;
    const approved = cashTransferRequests.filter(r =>
      r.status === 'approved' && r.cashier_id === user?.id
    );
    return approved.reduce((acc, r) => acc + r.amount, 0);
  }, [cashTransferRequests, user?.id, canCreateRequest]);

  // Available balance = Total Sales - Approved Deposits - Pending Deposits
  const availableBalance = useMemo(() => {
    return Math.max(0, totalAllCashSales - myApprovedFromRequests - myPendingAmount);
  }, [totalAllCashSales, myApprovedFromRequests, myPendingAmount]);

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
    if (amount <= 0) {
      toast({
        title: 'Nominal tidak valid',
        description: 'Masukkan nominal setoran yang valid',
        variant: 'destructive',
      });
      return;
    }

    // Check if amount exceeds available balance
    if (amount > availableBalance) {
      toast({
        title: 'Nominal melebihi saldo',
        description: `Saldo tersedia hanya Rp ${availableBalance.toLocaleString('id-ID')}`,
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
    setIsCreateOpen(false);
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
                  Ajukan Setoran Cash
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Available Balance Info */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-100 dark:border-green-800">
                  <p className="text-sm text-muted-foreground">Saldo Tersedia untuk Disetor</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    Rp {availableBalance.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total penjualan cash - setoran yang sudah diproses
                  </p>
                </div>

                {availableBalance === 0 ? (
                  <div className="p-4 rounded-lg border bg-muted/30 text-center text-muted-foreground">
                    Tidak ada saldo yang tersedia untuk disetor.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Nominal Setoran</Label>
                        <Input
                          type="number"
                          value={amount || ''}
                          onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                          placeholder="Masukkan nominal"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAmount(availableBalance)}
                          >
                            Setor Semua
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAmount(Math.floor(availableBalance / 2))}
                          >
                            Setor 50%
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Catatan (opsional)</Label>
                        <Textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Contoh: setor sore hari, hasil penjualan hari ini, dll"
                          rows={2}
                        />
                      </div>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      disabled={amount <= 0 || amount > availableBalance || createRequest.isPending}
                      onClick={handleSubmitRequest}
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
                title="Total Penjualan Cash"
                value={`Rp ${totalAllCashSales.toLocaleString('id-ID')}`}
                icon={<Wallet className="w-5 h-5" />}
              />
              <StatsCard
                title="Pending Setoran"
                value={`Rp ${myPendingAmount.toLocaleString('id-ID')}`}
                icon={<ArrowUpFromLine className="w-5 h-5" />}
                subtitleType="warning"
              />
              <StatsCard
                title="Saldo Tersedia"
                value={`Rp ${availableBalance.toLocaleString('id-ID')}`}
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
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <Label className="text-sm">Tanggal:</Label>
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
