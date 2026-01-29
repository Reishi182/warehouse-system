import { forwardRef } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Sale } from '@/types';

interface PrintReceiptProps {
    sale: Sale;
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    isCopy?: boolean;
}

const PrintReceipt = forwardRef<HTMLDivElement, PrintReceiptProps>(
    ({ sale, companyName = 'Vertical Building', companyAddress = '', companyPhone = '', isCopy = false }, ref) => {
        return (
            <div ref={ref} className="print-receipt bg-white text-black p-4 max-w-xs mx-auto font-mono text-sm">
                {/* Header */}
                <div className="text-center border-b-2 border-dashed border-black pb-3 mb-3">
                    {isCopy && (
                        <div className="bg-black text-white text-xs font-black py-1 mb-2 tracking-widest">
                            *** COPY RECEIPT ***
                        </div>
                    )}
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
          /* Receipt sharp text rendering */
          .print-receipt {
            -webkit-font-smoothing: none;
            -moz-osx-font-smoothing: unset;
            text-rendering: optimizeLegibility;
            font-feature-settings: "kern" 0;
            letter-spacing: 0.03em;
          }
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
              text-rendering: optimizeLegibility !important;
              -webkit-font-smoothing: none !important;
              font-smooth: never !important;
              /* Text shadow untuk efek ketebalan ganda */
              text-shadow: 0 0 0 #000000, 0.02em 0 0 #000000, -0.02em 0 0 #000000 !important;
            }
            .print-receipt {
              position: absolute;
              left: 0;
              top: 0;
              font-weight: 900 !important;
              font-family: 'Courier New', Courier, monospace !important;
              letter-spacing: 0.04em !important;
            }
            .print-receipt .text-xs {
              font-size: 11px !important;
              line-height: 1.4 !important;
            }
            .print-receipt .text-sm {
              font-size: 13px !important;
              line-height: 1.4 !important;
            }
            .print-receipt .text-lg {
              font-size: 17px !important;
              line-height: 1.4 !important;
            }
            .print-receipt .font-semibold {
              font-weight: 900 !important;
              text-shadow: 0 0 0 #000000, 0.03em 0 0 #000000, -0.03em 0 0 #000000 !important;
            }
            .print-receipt .font-bold {
              font-weight: 900 !important;
              text-shadow: 0 0 0 #000000, 0.04em 0 0 #000000, -0.04em 0 0 #000000 !important;
            }
            .print-receipt .font-black {
              font-weight: 900 !important;
              text-shadow: 0 0 0 #000000, 0.05em 0 0 #000000, -0.05em 0 0 #000000, 0 0.02em 0 #000000 !important;
            }
            /* Border yang lebih tebal untuk garis pemisah */
            .print-receipt .border-dashed {
              border-width: 2px !important;
              border-color: #000000 !important;
            }
            .print-receipt .border-b-2 {
              border-bottom-width: 3px !important;
            }
            .print-receipt .border-t-2 {
              border-top-width: 3px !important;
            }
          }
        `}</style>
            </div>
        );
    }
);

PrintReceipt.displayName = 'PrintReceipt';

export default PrintReceipt;
