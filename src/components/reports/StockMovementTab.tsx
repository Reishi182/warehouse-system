import LocationBadge from '@/components/common/LocationBadge';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { StockLog } from '@/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface StockMovementTabProps {
    stockLogs: StockLog[];
}

export default function StockMovementTab({ stockLogs }: StockMovementTabProps) {
    const columns: Column<StockLog>[] = [
        {
            header: 'Waktu',
            accessorKey: 'timestamp',
            cell: (item: StockLog) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(item.timestamp), 'dd MMM yyyy HH:mm', { locale: id })}
                </span>
            )
        },
        {
            header: 'Produk',
            sortKey: 'product.name',
            cell: (item: StockLog) => (
                <div>
                    <p className="font-medium">{item.product?.name || 'Produk'}</p>
                    <p className="text-xs text-muted-foreground">{item.product?.barcode}</p>
                </div>
            )
        },
        {
            header: 'Tipe',
            accessorKey: 'type',
            cell: (item: StockLog) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.type === 'in'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                    {item.type === 'in' ? 'Masuk' : 'Keluar'}
                </span>
            )
        },
        {
            header: 'Jumlah',
            accessorKey: 'quantity',
            cell: (item: StockLog) => (
                <span className="font-semibold">
                    {item.type === 'in' ? '+' : '-'}{item.quantity}
                </span>
            )
        },
        {
            header: 'Lokasi',
            accessorKey: 'location',
            cell: (item: StockLog) => <LocationBadge location={item.location} />
        },
        {
            header: 'Catatan',
            accessorKey: 'note',
            cell: (item: StockLog) => (
                <span className="text-sm text-muted-foreground">{item.note || '-'}</span>
            )
        }
    ];

    return (
        <BeautifulTable
            data={stockLogs}
            columns={columns}
            title="Riwayat Pergerakan Stok"
            hideSelection
        />
    );
}
