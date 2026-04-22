
import { useState } from 'react';
import { useAuth, useRole } from '@/contexts/AuthContext';
import { useStockRequests } from '@/hooks/useStockRequests';
import MainLayout from '@/components/layout/MainLayout';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StatsCard, StatsGrid } from '@/components/common/StatsCard';
;
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/common/StatusBadge';
import { FileText, Printer, Eye, Calendar, User as UserIcon, Package, Target } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface StockRequest {
    id: string;
    request_number?: string;
    created_at: string;
    cashier_name: string;
    reason: string;
    status: string;
    items?: Array<{
        id: string;
        product?: { name: string };
        quantity: number;
        unit: string;
        note?: string;
    }>;
}

export default function StockApprovals() {
    const role = useRole();
    const { user, profile } = useAuth();
    const { requests } = useStockRequests();
    const [detailRequest, setDetailRequest] = useState<StockRequest | null>(null);

    const allRequests = requests;

    // Column definitions for requests table
    const historyColumns: Column<StockRequest>[] = [
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            cell: (item: StockRequest) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(item.created_at), 'dd/MM/yyyy')}
                </span>
            )
        },
        {
            header: 'Nomor Dokumen',
            accessorKey: 'request_number',
            cell: (item: StockRequest) => (
                <span className="font-mono">{item.request_number || '-'}</span>
            )
        },
        {
            header: 'Kasir',
            accessorKey: 'cashier_name',
            cell: (item: StockRequest) => <span className="font-medium">{item.cashier_name}</span>
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (item: StockRequest) => (
                <StatusBadge status={item.status} showIcon />
            )
        },
        {
            header: 'Aksi',
            sortable: false,
            cell: (item: StockRequest) => (
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8 font-medium text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400"
                        onClick={() => setDetailRequest(item)}
                    >
                        <Eye className="w-4 h-4 mr-1.5" />
                        Detail
                    </Button>
                    {item.status !== 'rejected' && item.request_number && (
                        <Button size="sm" variant="ghost" title="Print Formulir" className="h-8 w-8 p-0">
                            <Printer className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            )
        }
    ];

    if (role !== 'main_office' && role !== 'admin') {
        return <MainLayout title="Akses Ditolak" subtitle="Anda tidak memiliki akses ke halaman ini">{null}</MainLayout>;
    }

    return (
        <MainLayout
            title="Riwayat Permintaan Stok"
            subtitle="Lihat semua riwayat permintaan stok dari kasir"
        >
            <div className="space-y-6">
                <StatsGrid columns={3}>
                    <StatsCard
                        title="Selesai"
                        value={allRequests.filter((r: StockRequest) => r.status.includes('completed')).length}
                        icon={<FileText className="w-5 h-5" />}
                        subtitleType="success"
                    />
                    <StatsCard
                        title="Pending"
                        value={allRequests.filter((r: StockRequest) => r.status.includes('pending') || r.status === 'approved').length}
                        icon={<Calendar className="w-5 h-5" />}
                        subtitleType="neutral"
                    />
                    <StatsCard
                        title="Batal / Ditolak"
                        value={allRequests.filter((r: StockRequest) => r.status === 'rejected' || r.status === 'cancelled').length}
                        icon={<Target className="w-5 h-5" />}
                        subtitleType="error"
                    />
                </StatsGrid>

                {/* History Table using BeautifulTable */}
                <BeautifulTable
                    data={allRequests}
                    columns={historyColumns}
                    title="Riwayat Permintaan"
                    hideSelection
                    hideExport
                    variant="premium"
                />
            </div>

            {/* Detail Dialog */}
            <Dialog open={!!detailRequest} onOpenChange={(open) => !open && setDetailRequest(null)}>
                <DialogContent className="max-w-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-2xl p-0 overflow-hidden rounded-2xl">
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white grid gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Package className="w-32 h-32" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">Detail Pengajuan Stok</h2>
                            <p className="text-indigo-100 flex items-center gap-1.5 mt-1 text-sm font-medium">
                                <FileText className="w-4 h-4" />
                                {detailRequest?.request_number || 'Dokumen Belum Bernomor'}
                            </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 pt-2">
                            <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
                                <span className="text-xs text-indigo-200 block mb-0.5">Diajukan Oleh</span>
                                <span className="font-semibold flex items-center gap-1.5">
                                    <UserIcon className="w-4 h-4" /> {detailRequest?.cashier_name}
                                </span>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20">
                                <span className="text-xs text-indigo-200 block mb-0.5">Waktu Pengajuan</span>
                                <span className="font-semibold flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4" />
                                    {detailRequest?.created_at ? format(new Date(detailRequest.created_at), 'dd MMM yyyy, HH:mm', { locale: localeId }) : '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4 text-indigo-500" />
                                Daftar Barang yang Diminta
                            </h3>
                            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50/80 dark:bg-slate-700/50 text-gray-600 dark:text-gray-300">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold border-b border-gray-100 dark:border-gray-700">Nama Produk</th>
                                            <th className="px-4 py-3 font-semibold border-b border-gray-100 dark:border-gray-700 text-center">Jumlah</th>
                                            <th className="px-4 py-3 font-semibold border-b border-gray-100 dark:border-gray-700">Catatan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {detailRequest?.items?.map((i) => (
                                            <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                    {i.product?.name}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-bold px-2.5 py-1 rounded-lg min-w-[3rem]">
                                                        {i.quantity}
                                                    </span>
                                                    <span className="ml-1.5 text-xs text-gray-500">{i.unit}</span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 italic">
                                                    {i.note || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {detailRequest?.reason && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl p-4">
                                <h3 className="text-xs font-semibold text-amber-800 dark:text-amber-500 uppercase tracking-wider mb-1">
                                    Alasan Permintaan
                                </h3>
                                <p className="text-amber-900 dark:text-amber-400/90 text-sm">{detailRequest.reason}</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="py-4 px-6 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                        <Button variant="outline" onClick={() => setDetailRequest(null)}>Tutup Detail</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}
