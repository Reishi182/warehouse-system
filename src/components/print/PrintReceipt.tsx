import { forwardRef } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Sale } from '@/types';

interface PrintReceiptProps {
    sale: Sale;
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
}

const PrintReceipt = forwardRef<HTMLDivElement, PrintReceiptProps>(
    ({ sale, companyName = 'Vertical Building', companyAddress = '', companyPhone = '' }, ref) => {
        return (
            <div ref={ref} className="print-receipt bg-white text-black p-4 max-w-xs mx-auto font-mono text-sm">
                {/* Header */}
                <div className="text-center border-b-2 border-dashed border-black pb-3 mb-3">
                    <h1 className="text-lg font-black uppercase">{companyName}</h1>
                    {companyAddress && <p className="text-xs mt-1 font-semibold">{companyAddress}</p>}
                    {companyPhone && <p className="text-xs font-semibold">Telp: {companyPhone}</p>}
                </div>

                {/* Transaction Info */}
                <div className="text-xs mb-3 space-y-1">
                    <div className="flex justify-between">
                        <span className="font-semibold">No:</span>
                        <span className="font-bold">{sale.sale_number}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-semibold">Tanggal:</span>
                        <span className="font-semibold">{format(new Date(sale.created_at), 'dd/MM/yyyy HH:mm', { locale: id })}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-semibold">Kasir:</span>
                        <span className="font-semibold">{sale.cashier_name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-semibold">Bayar:</span>
                        <span className="font-bold">{sale.payment_method === 'cash' ? 'Tunai' : 'Transfer'}</span>
                    </div>
                </div>

                <div className="border-t-2 border-dashed border-black my-2"></div>

                {/* Items */}
                <div className="space-y-2 mb-3">
                    {sale.items?.map((item, index) => (
                        <div key={item.id} className="text-xs">
                            <p className="font-bold truncate">{item.product_name}</p>
                            <div className="flex justify-between font-semibold">
                                <span>{item.quantity} x Rp {item.price.toLocaleString('id-ID')}</span>
                                <span>Rp {item.subtotal.toLocaleString('id-ID')}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="border-t-2 border-dashed border-black my-2"></div>

                {/* Total */}
                <div className="text-right space-y-1">
                    <div className="flex justify-between text-sm font-black">
                        <span>TOTAL</span>
                        <span>Rp {sale.total_amount.toLocaleString('id-ID')}</span>
                    </div>
                </div>

                <div className="border-t-2 border-dashed border-black my-3"></div>

                {/* Footer */}
                <div className="text-center text-xs font-semibold">
                    <p>Terima kasih atas kunjungan Anda</p>
                    <p className="mt-1">Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
                </div>

                <style>{`
          @media print {
            .print-receipt {
              padding: 0;
              max-width: 100%;
              width: 80mm;
            }
            body * {
              visibility: hidden;
            }
            .print-receipt, .print-receipt * {
              visibility: visible;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-receipt {
              position: absolute;
              left: 0;
              top: 0;
              font-weight: 600 !important;
            }
          }
        `}</style>
            </div>
        );
    }
);

PrintReceipt.displayName = 'PrintReceipt';

export default PrintReceipt;
