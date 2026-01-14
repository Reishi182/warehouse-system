import StatusBadge from '@/components/common/StatusBadge';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { SuratJalan } from '@/types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface SuratJalanTabProps {
    suratJalans: SuratJalan[];
}

export default function SuratJalanTab({ suratJalans }: SuratJalanTabProps) {
    const columns: Column<SuratJalan>[] = [
        {
            header: 'Nomor',
            accessorKey: 'number',
            cell: (item: SuratJalan) => <span className="font-medium">{item.number}</span>
        },
        {
            header: 'Jumlah Item',
            sortable: false,
            cell: (item: SuratJalan) => <span>{item.items.length} item</span>
        },
        {
            header: 'Status',
            accessorKey: 'status',
            cell: (item: SuratJalan) => <StatusBadge status={item.status} />
        },
        {
            header: 'Dibuat Oleh',
            accessorKey: 'created_by',
            cell: (item: SuratJalan) => <span>{item.created_by || '-'}</span>
        },
        {
            header: 'Tanggal',
            accessorKey: 'created_at',
            cell: (item: SuratJalan) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(item.created_at), 'dd MMM yyyy', { locale: id })}
                </span>
            )
        },
        {
            header: 'Diproses Oleh',
            accessorKey: 'approved_by',
            cell: (item: SuratJalan) => <span>{item.approved_by || '-'}</span>
        }
    ];

    return (
        <BeautifulTable
            data={suratJalans}
            columns={columns}
            title="Riwayat Surat Jalan"
            hideSelection
        />
    );
}
