import { ShoppingCart, Wallet, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import StatCard from '@/components/common/StatCard';
import { BeautifulTable, Column } from '@/components/common/BeautifulTable';
import { DateInput } from '@/components/common/DatePicker';
import { Sale, CashTransfer } from '@/types';
import { formatCompact } from '@/lib/format';

interface FinanceTabProps {
    financeDate: string;
    onDateChange: (date: string) => void;
    salesOnDate: Sale[];
    transfersOnDate: CashTransfer[];
    totalSalesAmount: number;
    totalCashSales: number;
    totalTransferSales: number;
    totalCashTransfer: number;
    saldoBelumDisetor: number;
}

export default function FinanceTab({
    financeDate,
    onDateChange,
    salesOnDate,
    transfersOnDate,
    totalSalesAmount,
    totalCashSales,
    totalTransferSales,
    totalCashTransfer,
    saldoBelumDisetor,
}: FinanceTabProps) {

    // Column definitions for sales table
    const salesColumns: Column<Sale>[] = [
        {
            header: 'Invoice',
            accessorKey: 'sale_number',
            cell: (item: Sale) => <span className="font-medium">{item.sale_number}</span>
        },
        {
            header: 'Kasir',
            accessorKey: 'cashier_name',
        },
        {
            header: 'Metode',
            accessorKey: 'payment_method',
            cell: (item: Sale) => (
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.payment_method === 'cash'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'
                    }`}>
                    {item.payment_method === 'cash' ? 'Cash' : 'Transfer'}
                </span>
            )
        },
        {
            header: 'Total',
            accessorKey: 'total_amount',
            cell: (item: Sale) => (
                <span className="font-semibold">Rp {item.total_amount.toLocaleString('id-ID')}</span>
            )
        }
    ];

    // Column definitions for transfers table
    const transferColumns: Column<CashTransfer>[] = [
        {
            header: 'Waktu',
            accessorKey: 'created_at',
            cell: (item: CashTransfer) => (
                <span className="text-sm text-muted-foreground">
                    {new Date(item.created_at).toLocaleString('id-ID')}
                </span>
            )
        },
        {
            header: 'Kasir',
            accessorKey: 'cashier_name',
            cell: (item: CashTransfer) => <span className="font-medium">{item.cashier_name}</span>
        },
        {
            header: 'Nominal',
            accessorKey: 'amount',
            cell: (item: CashTransfer) => (
                <span className="font-semibold">Rp {item.amount.toLocaleString('id-ID')}</span>
            )
        },
        {
            header: 'Catatan',
            accessorKey: 'note',
            cell: (item: CashTransfer) => (
                <span className="text-sm text-muted-foreground">{item.note || '-'}</span>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <div className="glass-card rounded-3xl p-4 animate-slide-up">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <h3 className="font-semibold">Ringkasan Keuangan Harian</h3>
                        <p className="text-sm text-muted-foreground">
                            Total penjualan, cash, transfer, setoran, dan saldo cash belum disetor.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <DateInput
                            value={financeDate}
                            onChange={(date) => onDateChange(date)}
                            placeholder="Pilih tanggal"
                            disableFuture
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Total Penjualan"
                    value={formatCompact(totalSalesAmount)}
                    subtitle="Total pendapatan"
                    icon={ShoppingCart}
                    gradient="blue"
                    animationDelay={0}
                />
                <StatCard
                    title="Cash Masuk"
                    value={formatCompact(totalCashSales)}
                    subtitle="Pembayaran tunai"
                    icon={Wallet}
                    gradient="amber"
                    animationDelay={100}
                />
                <StatCard
                    title="Transfer"
                    value={formatCompact(totalTransferSales)}
                    subtitle="Pembayaran transfer"
                    icon={ArrowRightLeft}
                    gradient="cyan"
                    animationDelay={200}
                />
                <StatCard
                    title="Setoran Cash"
                    value={formatCompact(totalCashTransfer)}
                    subtitle="Sudah disetor"
                    icon={ArrowDownToLine}
                    gradient="green"
                    animationDelay={300}
                />
                <StatCard
                    title="Saldo Cash"
                    value={formatCompact(saldoBelumDisetor)}
                    subtitle="Belum disetor"
                    icon={ArrowUpFromLine}
                    gradient="orange"
                    animationDelay={400}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Table */}
                <BeautifulTable
                    data={salesOnDate}
                    columns={salesColumns}
                    title={`Penjualan (${financeDate})`}
                    hideSelection
                    hideExport
                    itemsPerPage={5}
                />

                {/* Cash Transfers Table */}
                <BeautifulTable
                    data={transfersOnDate}
                    columns={transferColumns}
                    title={`Setoran Cash (${financeDate})`}
                    hideSelection
                    hideExport
                    itemsPerPage={5}
                />
            </div>
        </div>
    );
}
