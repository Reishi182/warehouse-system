import { useState } from 'react';
import { FileText, Check, X, ArrowRight, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
import MainLayout from '@/components/layout/MainLayout';
import PageSkeleton from '@/components/common/PageSkeleton';
import StatusBadge from '@/components/common/StatusBadge';
import LocationBadge from '@/components/common/LocationBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AppModal } from '@/components/ui/app-modal';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useDataStore } from '@/store/useDataStore';
import { useToast } from '@/hooks/use-toast';
import { SuratJalan } from '@/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import ProductImage from '@/components/common/ProductImage';

export default function Approval() {
  const suratJalans = useDataStore(s => s.suratJalans);
    const updateSuratJalanStatus = useDataStore(s => s.updateSuratJalanStatus);
    const loading = useDataStore(s => s.loading);
  const { toast } = useToast();

  // ALL HOOKS MUST BE BEFORE ANY EARLY RETURNS
  const [selectedSJ, setSelectedSJ] = useState<SuratJalan | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  if (loading) {
    return (
      <MainLayout title="Persetujuan" subtitle="Review dan setujui surat jalan">
        <PageSkeleton variant="table" />
      </MainLayout>
    );
  }

  const handleApprove = (sj: SuratJalan) => {
    updateSuratJalanStatus(sj.id, 'approved');
    toast({
      title: 'Surat Jalan disetujui',
      description: `${sj.number} berhasil disetujui dan stok telah dikurangi`,
    });
  };

  const handleReject = () => {
    if (!selectedSJ) return;

    if (!rejectReason.trim()) {
      toast({
        title: 'Alasan diperlukan',
        description: 'Masukkan alasan penolakan',
        variant: 'destructive',
      });
      return;
    }

    updateSuratJalanStatus(selectedSJ.id, 'rejected', rejectReason);
    toast({
      title: 'Surat Jalan ditolak',
      description: `${selectedSJ.number} ditolak`,
    });

    setRejectDialogOpen(false);
    setSelectedSJ(null);
    setRejectReason('');
  };

  const openRejectDialog = (sj: SuratJalan) => {
    setSelectedSJ(sj);
    setRejectDialogOpen(true);
  };

  const filteredSuratJalans = suratJalans.filter(s => s.status === activeTab);
  const pendingCount = suratJalans.filter(s => s.status === 'pending').length;

  return (
    <MainLayout title="Persetujuan" subtitle="Review dan setujui surat jalan">
      <div className="space-y-6">
        <StatsGrid columns={3}>
          <StatsCard
            title="Menunggu"
            value={pendingCount}
            icon={<Clock className="w-5 h-5" />}
            subtitleType="warning"
          />
          <StatsCard
            title="Disetujui"
            value={suratJalans.filter(s => s.status === 'approved').length}
            icon={<CheckCircle className="w-5 h-5" />}
            subtitleType="success"
          />
          <StatsCard
            title="Ditolak"
            value={suratJalans.filter(s => s.status === 'rejected').length}
            icon={<XCircle className="w-5 h-5" />}
            subtitleType="error"
          />
        </StatsGrid>

        {/* Tabs */}
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap">
              <TabsTrigger value="pending" className="relative text-xs sm:text-sm px-2 sm:px-3">
                <span className="hidden sm:inline">Menunggu</span>
                <span className="sm:hidden">Pending</span>
                {pendingCount > 0 && (
                  <span className="ml-1 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-warning text-warning-foreground text-[10px] sm:text-xs flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="text-xs sm:text-sm px-2 sm:px-3">
                <span className="hidden sm:inline">Disetujui</span>
                <span className="sm:hidden">Setuju</span>
              </TabsTrigger>
              <TabsTrigger value="rejected" className="text-xs sm:text-sm px-2 sm:px-3">
                <span className="hidden sm:inline">Ditolak</span>
                <span className="sm:hidden">Tolak</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Surat Jalan List */}
        {filteredSuratJalans.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 text-center animate-fade-in">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">
              {activeTab === 'pending' ? 'Tidak ada surat jalan menunggu' :
                activeTab === 'approved' ? 'Tidak ada surat jalan disetujui' :
                  'Tidak ada surat jalan ditolak'}
            </h3>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSuratJalans.map(sj => (
              <div key={sj.id} className="glass-card rounded-3xl overflow-hidden animate-slide-up">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{sj.number}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(sj.created_at), 'dd MMMM yyyy HH:mm', { locale: id })} • {sj.created_by || 'User'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={sj.status} />
                </div>

                <div className="p-4">
                  {/* Mobile */}
                  <div className="md:hidden space-y-3">
                    {sj.items.map((item) => (
                      <div key={item.id} className="rounded-xl border bg-muted/10 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <ProductImage
                              src={item.image_url}
                              alt={item.product_name}
                              size="thumb"
                              className="w-12 h-12 rounded-lg border flex-shrink-0"
                              placeholderClassName="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{item.product_name}</p>
                              <code className="text-xs bg-muted px-2 py-1 rounded inline-block mt-1">
                                {item.barcode}
                              </code>
                              <div className="mt-2 flex items-center gap-2">
                                <LocationBadge location={item.from_location} />
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                <LocationBadge location={item.to_location} />
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Jumlah</p>
                            <p className="text-lg font-bold text-primary">{item.quantity}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop */}
                  <table className="hidden md:table w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left pb-2">Produk</th>
                        <th className="text-left pb-2">Barcode</th>
                        <th className="text-center pb-2">Jumlah</th>
                        <th className="text-left pb-2">Transfer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sj.items.map((item) => (
                        <tr key={item.id} className="border-t border-border">
                          <td className="py-2">
                            <div className="flex items-center gap-3">
                              <ProductImage
                                src={item.image_url}
                                alt={item.product_name}
                                size="thumb"
                                className="w-10 h-10 rounded-lg border"
                                placeholderClassName="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"
                              />
                              <span className="font-medium">{item.product_name}</span>
                            </div>
                          </td>
                          <td className="py-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {item.barcode}
                            </code>
                          </td>
                          <td className="text-center font-semibold">{item.quantity}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <LocationBadge location={item.from_location} />
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              <LocationBadge location={item.to_location} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {sj.status === 'rejected' && sj.rejected_reason && (
                  <div className="px-4 py-3 bg-destructive/5 border-t border-destructive/20 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-destructive">Alasan Penolakan:</p>
                      <p className="text-sm text-muted-foreground">{sj.rejected_reason}</p>
                    </div>
                  </div>
                )}

                {sj.status === 'pending' && (
                  <div className="p-4 border-t border-border flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => openRejectDialog(sj)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Tolak
                    </Button>
                    <Button onClick={() => handleApprove(sj)}>
                      <Check className="w-4 h-4 mr-2" />
                      Setujui
                    </Button>
                  </div>
                )}

                {sj.status !== 'pending' && sj.approved_by && (
                  <div className="px-4 py-3 bg-muted/30 text-sm text-muted-foreground">
                    {sj.status === 'approved' ? 'Disetujui' : 'Ditolak'} oleh: {sj.approved_by}
                    {sj.approved_at && (
                      <span className="ml-2">
                        pada {format(new Date(sj.approved_at), 'dd MMM yyyy HH:mm', { locale: id })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reject Dialog */}
        <AppModal
          open={rejectDialogOpen}
          onClose={() => setRejectDialogOpen(false)}
          title="Tolak Surat Jalan"
          variant="danger"
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Batal</Button>
              <Button variant="destructive" onClick={handleReject}>Tolak Surat Jalan</Button>
            </>
          }
        >
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Masukkan alasan penolakan untuk {selectedSJ?.number}:
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Alasan penolakan..."
              rows={4}
            />
          </div>
        </AppModal>
      </div>
    </MainLayout>
  );
}
