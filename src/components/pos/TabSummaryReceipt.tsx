import { forwardRef } from 'react';
import { CustomerTab, TabTransaction } from '@/types';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface TabSummaryReceiptProps {
    tab: CustomerTab;
    storeName?: string;
    storeAddress?: string;
}

/**
 * Tab Summary Receipt - Shows all transactions in one receipt
 * Used for printing combined struk showing:
 * - Customer name and tab number
 * - List of all transactions with their subtotals
 * - Grand total
 */
const TabSummaryReceipt = forwardRef<HTMLDivElement, TabSummaryReceiptProps>(({
    tab,
    storeName = 'WAREHOUSE SYSTEM',
    storeAddress = '',
}, ref) => {
    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(amount);

    const formatDateTime = (dateStr: string) =>
        format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: idLocale });

    return (
        <div
            ref={ref}
            className="bg-white text-black font-mono text-xs p-4 w-[280px] mx-auto"
            style={{ fontFamily: 'monospace' }}
        >
            {/* Store Header */}
            <div className="text-center mb-3">
                <h2 className="font-bold text-sm">{storeName}</h2>
                {storeAddress && (
                    <p className="text-[10px] text-gray-600">{storeAddress}</p>
                )}
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Tab Info */}
            <div className="text-center mb-3">
                <p className="font-bold text-sm">REKAP TAB</p>
                <p className="text-[10px] text-gray-600">{tab.tab_number}</p>
            </div>

            <div className="space-y-1 text-[10px] mb-2">
                <div className="flex justify-between">
                    <span>Pelanggan:</span>
                    <span className="font-bold">{tab.customer_name}</span>
                </div>
                {tab.customer_phone && (
                    <div className="flex justify-between">
                        <span>Telepon:</span>
                        <span>{tab.customer_phone}</span>
                    </div>
                )}
                <div className="flex justify-between">
                    <span>Dibuat:</span>
                    <span>{format(new Date(tab.created_at), 'dd/MM/yy HH:mm')}</span>
                </div>
                <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={tab.status === 'open' ? 'text-orange-600 font-bold' : ''}>
                        {tab.status === 'open' ? 'BELUM LUNAS' : tab.status === 'settled' ? 'LUNAS' : 'BATAL'}
                    </span>
                </div>
            </div>

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Transactions List */}
            <div className="mb-2">
                <p className="font-bold text-center mb-2">DAFTAR TRANSAKSI</p>

                {tab.transactions && tab.transactions.length > 0 ? (
                    <div className="space-y-2">
                        {tab.transactions.map((tx, index) => (
                            <div key={tx.id} className="border border-gray-300 rounded p-1.5">
                                <div className="flex justify-between font-bold text-[10px]">
                                    <span>TX #{index + 1}</span>
                                    <span>{format(new Date(tx.created_at), 'dd/MM HH:mm')}</span>
                                </div>
                                <p className="text-[9px] text-gray-500 mb-1">{tx.transaction_number}</p>

                                {/* Transaction Items */}
                                <div className="space-y-0.5 text-[9px]">
                                    {tx.items?.map((item, itemIdx) => (
                                        <div key={item.id || itemIdx} className="flex justify-between">
                                            <span className="truncate max-w-[160px]">
                                                {item.product_name} x{item.quantity}
                                            </span>
                                            <span>{formatCurrency(item.subtotal)}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Transaction Subtotal */}
                                <div className="flex justify-between font-bold mt-1 pt-1 border-t border-dotted border-gray-300 text-[10px]">
                                    <span>Subtotal:</span>
                                    <span>Rp {formatCurrency(tx.subtotal)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500">Tidak ada transaksi</p>
                )}
            </div>

            <div className="border-t border-double border-gray-600 my-2 border-2" />

            {/* Summary */}
            <div className="space-y-1">
                <div className="flex justify-between">
                    <span>Total Transaksi:</span>
                    <span>{tab.transactions?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                    <span>GRAND TOTAL:</span>
                    <span>Rp {formatCurrency(tab.total_amount)}</span>
                </div>
            </div>

            {/* Settlement Info (if settled) */}
            {tab.status === 'settled' && tab.settled_at && (
                <>
                    <div className="border-t border-dashed border-gray-400 my-2" />
                    <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between">
                            <span>Dibayar:</span>
                            <span>{format(new Date(tab.settled_at), 'dd/MM/yy HH:mm')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Metode:</span>
                            <span className="font-bold">
                                {tab.payment_method === 'cash' ? 'TUNAI' : 'TRANSFER'}
                            </span>
                        </div>
                        {tab.amount_paid !== undefined && (
                            <div className="flex justify-between">
                                <span>Dibayar:</span>
                                <span>Rp {formatCurrency(tab.amount_paid)}</span>
                            </div>
                        )}
                        {tab.change_amount !== undefined && tab.change_amount > 0 && (
                            <div className="flex justify-between">
                                <span>Kembali:</span>
                                <span>Rp {formatCurrency(tab.change_amount)}</span>
                            </div>
                        )}
                    </div>
                </>
            )}

            <div className="border-t border-dashed border-gray-400 my-2" />

            {/* Footer */}
            <div className="text-center text-[9px] text-gray-500">
                <p>Dicetak: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                <p className="mt-1">Terima kasih</p>
            </div>
        </div>
    );
});

TabSummaryReceipt.displayName = 'TabSummaryReceipt';

export default TabSummaryReceipt;
