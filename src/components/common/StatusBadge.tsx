import { cn } from '@/lib/utils';
import {
    Clock, CheckCircle, XCircle, Truck, Package, AlertCircle,
    PlayCircle, RotateCcw, ShoppingCart, Eye, Send
} from 'lucide-react';

// Broad status type that covers all status strings used across the app
export type AppStatus = string;

interface StatusConfig {
    label: string;
    className: string;
    icon?: React.ElementType;
}

const statusConfig: Record<string, StatusConfig> = {
    // ── Generic ──────────────────────────────────────────
    pending:            { label: 'Menunggu',          className: 'status-pending',   icon: Clock },
    approved:           { label: 'Disetujui',         className: 'status-approved',  icon: CheckCircle },
    rejected:           { label: 'Ditolak',           className: 'status-rejected',  icon: XCircle },
    completed:          { label: 'Selesai',           className: 'status-completed', icon: CheckCircle },

    // ── Surat Jalan B2B ───────────────────────────────────
    pending_review:     { label: 'Menunggu Review',   className: 'bg-yellow-100 text-yellow-800',  icon: Clock },
    processing:         { label: 'Diproses',          className: 'bg-purple-100 text-purple-800',  icon: Truck },
    cancelled:          { label: 'Dibatalkan',        className: 'bg-gray-100  text-gray-700',     icon: XCircle },

    // ── Stock Request (new system) ────────────────────────
    pending_main_office: { label: 'Menunggu Kantor',  className: 'bg-yellow-100 text-yellow-800',  icon: Clock },
    pending_gudang:      { label: 'Menunggu Gudang',  className: 'bg-blue-100   text-blue-800',    icon: Clock },
    pending_shipment:    { label: 'Dikirim',          className: 'bg-indigo-100 text-indigo-800',  icon: Send },
    pending_auditor:     { label: 'Menunggu Auditor', className: 'bg-orange-100 text-orange-800',  icon: Clock },
    pending_receipt:     { label: 'Menunggu Terima',  className: 'bg-sky-100    text-sky-800',     icon: Package },
    pending_approval:    { label: 'Menunggu Approval',className: 'bg-yellow-100 text-yellow-800',  icon: Clock },

    // ── Shipment ──────────────────────────────────────────
    needs_revision:     { label: 'Perlu Revisi',      className: 'bg-orange-100 text-orange-800',  icon: AlertCircle },

    // ── PO Claim ─────────────────────────────────────────
    in_progress:        { label: 'Diproses',          className: 'bg-blue-100   text-blue-800',    icon: PlayCircle },
    resolved:           { label: 'Selesai',           className: 'bg-green-100  text-green-800',   icon: CheckCircle },

    // ── Invoice ───────────────────────────────────────────
    unpaid:             { label: 'Belum Dibayar',     className: 'bg-red-100    text-red-800',     icon: AlertCircle },
    paid:               { label: 'Lunas',             className: 'bg-green-100  text-green-800',   icon: CheckCircle },
    overdue:            { label: 'Jatuh Tempo',       className: 'bg-red-200    text-red-900',     icon: AlertCircle },

    // ── Backorder ─────────────────────────────────────────
    partial:            { label: 'Sebagian',          className: 'bg-yellow-100 text-yellow-800',  icon: RotateCcw },
    fulfilled:          { label: 'Terpenuhi',         className: 'bg-green-100  text-green-800',   icon: CheckCircle },

    // ── Direct Order ─────────────────────────────────────
    confirmed:          { label: 'Dikonfirmasi',      className: 'bg-blue-100   text-blue-800',    icon: CheckCircle },
    shipped:            { label: 'Dikirim',           className: 'bg-indigo-100 text-indigo-800',  icon: Truck },
    delivered:          { label: 'Terkirim',          className: 'bg-green-100  text-green-800',   icon: CheckCircle },

    // ── Marketplace Order ─────────────────────────────────
    pending_arrival:         { label: 'Menunggu Tiba',    className: 'bg-yellow-100 text-yellow-800', icon: Clock },
    received_with_issue:     { label: 'Ada Masalah',      className: 'bg-orange-100 text-orange-800', icon: AlertCircle },
    return_pending:          { label: 'Retur Pending',    className: 'bg-red-100    text-red-800',    icon: RotateCcw },
    return_complete:         { label: 'Retur Selesai',    className: 'bg-gray-100   text-gray-700',   icon: CheckCircle },

    // ── Tokopedia ─────────────────────────────────────────
    order_received:     { label: 'Pesanan Masuk',     className: 'bg-blue-100   text-blue-800',    icon: ShoppingCart },
    packing:            { label: 'Dikemas',           className: 'bg-yellow-100 text-yellow-800',  icon: Package },
    ready_to_ship:      { label: 'Siap Kirim',        className: 'bg-indigo-100 text-indigo-800',  icon: Truck },

    // ── Tab (Nota Gantung) ────────────────────────────────
    open:               { label: 'Aktif',             className: 'bg-blue-100   text-blue-800',    icon: Eye },
    settled:            { label: 'Lunas',             className: 'bg-green-100  text-green-800',   icon: CheckCircle },

    // ── Stock Opname ──────────────────────────────────────
    draft:              { label: 'Draft',             className: 'bg-gray-100   text-gray-700',    icon: Eye },

    // ── Return / Marketplace Return ───────────────────────
    picked_up:          { label: 'Dijemput',          className: 'bg-indigo-100 text-indigo-800',  icon: Truck },
};

interface StatusBadgeProps {
    status: AppStatus;
    className?: string;
    showIcon?: boolean;
}

export default function StatusBadge({ status, className, showIcon = false }: StatusBadgeProps) {
    const config = statusConfig[status] ?? {
        label: status,
        className: 'bg-gray-100 text-gray-700',
    };
    const Icon = config.icon;

    return (
        <span
            className={cn(
                'status-badge inline-flex items-center gap-1',
                config.className,
                className
            )}
        >
            {showIcon && Icon && <Icon className="h-3 w-3" />}
            {config.label}
        </span>
    );
}
