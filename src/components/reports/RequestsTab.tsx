import StatusBadge from '@/components/common/StatusBadge';
import LocationBadge from '@/components/common/LocationBadge';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StockOutRequest } from '@/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface RequestsTabProps {
    requests: StockOutRequest[];
}

export default function RequestsTab({ requests }: RequestsTabProps) {
    const columns: Column<StockOutRequest>[] = [
        {
            header: 'ID',
            accessorKey: 'id',
            cell: (item: StockOutRequest) => (
                <code className="text-xs bg-muted px-2 py-1 rounded">
                    {item.id.slice(0, 8)}
                </code>
            )
        },
        {
            header: 'Produk',
            sortKey: 'product.name',
            cell: (item: StockOutRequest) => (
                <span className="font-medium">{item.product?.name || 'Produk'}</span>
            )
        },
        {
            header: 'Jumlah',
            accessorKey: 'quantity',
            cell: (item: StockOutRequest) => (
                <span className="font-semibold">{item.quantity}</span>
            )
        },
        {
            header: 'Transfer',
            sortable: false,
            cell: (item: StockOutRequest) => (
                <div className="flex items-center gap-2">
                    <LocationBadge location={item.from_location} />
                    <span>→</span>
                    <LocationBadge location={item.to_location} />
                </div>
            )
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (item: StockOutRequest) => <StatusBadge status={item.status} />
        },
        {
            header: 'Tanggal',
            accessorKey: 'requested_at',
            cell: (item: StockOutRequest) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(item.requested_at), 'dd MMM yyyy', { locale: id })}
                </span>
            )
        }
    ];

    return (
        <BeautifulTable
            data={requests}
            columns={columns}
            title="Riwayat Permintaan"
            hideSelection
        />
    );
}
