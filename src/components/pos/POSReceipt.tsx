import { forwardRef } from 'react';
import { PaymentMethod } from '@/types';
import Barcode from 'react-barcode';
import { formatRupiah } from '@/lib/format';

interface ReceiptItem {
    name: string;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
}

interface TabInfo {
    tabNumber: string;
    customerName: string;
    transactionNumber: number;
    runningTotal: number;
    isPending: boolean; // Show "BELUM LUNAS" if true
}

interface POSReceiptProps {
    saleNumber: string;
    cashierName: string;
    date: Date;
    items: ReceiptItem[];
    subtotal: number;
    orderDiscount: number;
    total: number;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    change: number;
    storeName?: string;
    storeAddress?: string;
    isCopy?: boolean;
    isOffline?: boolean; // Flag for offline transactions
    tabInfo?: TabInfo; // Tab mode info
    returnRef?: string | null; // Reference to original sale for returns
}

const POSReceipt = forwardRef<HTMLDivElement, POSReceiptProps>(({
    saleNumber,
    cashierName,
    date,
    items,
    subtotal,
    orderDiscount,
    total,
    paymentMethod,
    amountPaid,
    change,
    storeName = 'WAREHOUSE SYSTEM',
    storeAddress = 'Jl. Contoh No. 123',
    isCopy = false,
    isOffline = false,
    tabInfo,
    returnRef,
}, ref) => {

    const formatDate = (d: Date) => d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const formatTime = (d: Date) => d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div
            ref={ref}
            id="pos-receipt"
            className="pos-receipt bg-white text-black font-mono text-sm w-[280px] mx-auto shadow-lg print:shadow-none"
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
            {/* Wavy top edge */}
            <div className="h-3 bg-white relative overflow-hidden">
                <svg
                    viewBox="0 0 280 12"
                    className="absolute top-0 left-0 w-full"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M0,12 Q7,0 14,12 T28,12 T42,12 T56,12 T70,12 T84,12 T98,12 T112,12 T126,12 T140,12 T154,12 T168,12 T182,12 T196,12 T210,12 T224,12 T238,12 T252,12 T266,12 T280,12 L280,0 L0,0 Z"
                        fill="#f5f5f5"
                    />
                </svg>
            </div>

            {/* Receipt content */}
            <div className="px-4 py-3 space-y-3 bg-white print:bg-white">
                {/* Header */}
                <div className="text-center border-b-2 border-dashed border-black pb-3">
                    {isOffline && (
                        <div className="bg-amber-500 text-white text-xs font-black py-1 mb-2 tracking-widest">
                            📴 OFFLINE - PENDING SYNC
                        </div>
                    )}
                    {isCopy && (
                        <div className="bg-black text-white text-xs font-black py-1 mb-2 tracking-widest">
                            *** COPY RECEIPT ***
                        </div>
                    )}
                    {tabInfo?.isPending && (
                        <div className="bg-orange-500 text-white text-xs font-black py-1 mb-2 tracking-widest">
                            📋 TAB - BELUM LUNAS
                        </div>
                    )}
                    <h2 className="text-base font-black tracking-wider">
                        {tabInfo ? 'STRUK TAB' : 'RECEIPT'}
                    </h2>
                    <p className="text-xs text-black tracking-[0.2em] font-bold">
                        ================================
                    </p>
                    <h3 className="font-black text-base mt-2">{storeName}</h3>
                    <p className="text-xs text-black font-semibold">{storeAddress}</p>
                    {tabInfo && (
                        <div className="mt-2 pt-2 border-t border-dashed border-gray-400">
                            <p className="text-xs font-bold">Pelanggan: {tabInfo.customerName}</p>
                            <p className="text-xs font-semibold">Transaksi #{tabInfo.transactionNumber} dari Tab</p>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="text-xs space-y-1 border-b-2 border-dashed border-black pb-3">
                    <div className="flex justify-between">
                        <span className="text-black font-semibold">No:</span>
                        <span className="font-bold">{saleNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-black font-semibold">Tanggal:</span>
                        <span className="font-semibold">{formatDate(date)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-black font-semibold">Waktu:</span>
                        <span className="font-semibold">{formatTime(date)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-black font-semibold">Kasir:</span>
                        <span className="font-semibold">{cashierName}</span>
                    </div>
                    {returnRef && (
                        <div className="flex justify-between mt-1 pt-1 border-t border-dashed border-gray-400">
                            <span className="text-black font-semibold">↩ Ganti dari:</span>
                            <span className="font-bold text-xs">{returnRef}</span>
                        </div>
                    )}
                </div>

                {/* Items header */}
                <div className="flex justify-between text-xs font-black border-b-2 border-black pb-1">
                    <span>ITEM</span>
                    <span>HARGA</span>
                </div>

                {/* Items */}
                <div className="space-y-2">
                    {items.map((item, idx) => (
                        <div key={idx} className="text-xs">
                            <div className="flex justify-between">
                                <span className="flex-1 truncate pr-2 font-semibold">{item.name}</span>
                                <span className="font-bold">{formatRupiah(item.subtotal)}</span>
                            </div>
                            <div className="text-black text-xs pl-2 font-medium">
                                {item.quantity} x {formatRupiah(item.price)}
                                {item.discount > 0 && (
                                    <span className="font-bold ml-1">(-{formatRupiah(item.discount)})</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="border-t-2 border-dashed border-black pt-3 space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                        <span>Subtotal</span>
                        <span>{formatRupiah(subtotal)}</span>
                    </div>
                    {orderDiscount > 0 && (
                        <div className="flex justify-between font-bold">
                            <span>Diskon</span>
                            <span>-{formatRupiah(orderDiscount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-black text-base pt-1 border-t-2 border-black">
                        <span>TOTAL</span>
                        <span>{formatRupiah(total)}</span>
                    </div>
                </div>

                {/* Payment info */}
                <div className="border-t-2 border-dashed border-black pt-3 space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                        <span>Metode</span>
                        <span className="font-bold uppercase">
                            {paymentMethod === 'cash' ? 'TUNAI' : 'TRANSFER'}
                        </span>
                    </div>
                    {paymentMethod === 'cash' && (
                        <>
                            <div className="flex justify-between font-semibold">
                                <span>Bayar</span>
                                <span>{formatRupiah(amountPaid)}</span>
                            </div>
                            <div className="flex justify-between font-black">
                                <span>Kembalian</span>
                                <span>{formatRupiah(change)}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Tab Running Total */}
                {tabInfo && tabInfo.isPending && (
                    <div className="border-t-2 border-dashed border-black pt-3 bg-orange-50 -mx-4 px-4 py-2">
                        <div className="flex justify-between text-xs font-bold">
                            <span>TOTAL TAB (Akumulasi):</span>
                            <span className="text-orange-700">{formatRupiah(tabInfo.runningTotal)}</span>
                        </div>
                        <p className="text-[10px] text-orange-600 mt-1 text-center font-semibold">
                            *Belum lunas - bayar saat tab ditutup
                        </p>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center pt-3 border-t-2 border-dashed border-black">
                    {tabInfo?.isPending ? (
                        <>
                            <p className="font-black text-base tracking-wider text-orange-600">SIMPAN STRUK INI</p>
                            <p className="text-xs text-black font-semibold mt-1">Tab #{tabInfo.tabNumber}</p>
                        </>
                    ) : (
                        <>
                            <p className="font-black text-base tracking-wider">TERIMA KASIH</p>
                            <p className="text-xs text-black font-semibold mt-1">Barang yang sudah dibeli</p>
                            <p className="text-xs text-black font-semibold">tidak dapat ditukar/dikembalikan</p>
                        </>
                    )}
                </div>

                {/* Barcode */}
                <div className="flex justify-center pt-2 pb-1">
                    <Barcode
                        value={saleNumber.replace(/[^a-zA-Z0-9]/g, '')}
                        width={1.5}
                        height={45}
                        fontSize={10}
                        margin={0}
                        displayValue={true}
                    />
                </div>
            </div>

            {/* Print-specific styles */}
            <style>{`
                /* Receipt sharp text rendering */
                .pos-receipt {
                    -webkit-font-smoothing: none;
                    -moz-osx-font-smoothing: unset;
                    text-rendering: optimizeLegibility;
                    font-feature-settings: "kern" 0;
                }
                .pos-receipt * {
                    letter-spacing: 0.03em;
                }
                @media print {
                    .pos-receipt, .pos-receipt * {
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        text-rendering: optimizeLegibility !important;
                        -webkit-font-smoothing: none !important;
                        font-smooth: never !important;
                        /* Text shadow untuk efek ketebalan ganda */
                        text-shadow: 0 0 0 #000000, 0.02em 0 0 #000000, -0.02em 0 0 #000000 !important;
                    }
                    .pos-receipt {
                        font-weight: 900 !important;
                        font-family: 'Courier New', Courier, monospace !important;
                        letter-spacing: 0.04em !important;
                    }
                    .pos-receipt .text-xs {
                        font-size: 11px !important;
                        line-height: 1.4 !important;
                    }
                    .pos-receipt .text-sm {
                        font-size: 13px !important;
                        line-height: 1.4 !important;
                    }
                    .pos-receipt .text-base {
                        font-size: 15px !important;
                        line-height: 1.4 !important;
                    }
                    .pos-receipt .font-medium {
                        font-weight: 800 !important;
                        text-shadow: 0 0 0 #000000, 0.03em 0 0 #000000, -0.03em 0 0 #000000 !important;
                    }
                    .pos-receipt .font-semibold {
                        font-weight: 900 !important;
                        text-shadow: 0 0 0 #000000, 0.03em 0 0 #000000, -0.03em 0 0 #000000 !important;
                    }
                    .pos-receipt .font-bold {
                        font-weight: 900 !important;
                        text-shadow: 0 0 0 #000000, 0.04em 0 0 #000000, -0.04em 0 0 #000000 !important;
                    }
                    .pos-receipt .font-black {
                        font-weight: 900 !important;
                        text-shadow: 0 0 0 #000000, 0.05em 0 0 #000000, -0.05em 0 0 #000000, 0 0.02em 0 #000000 !important;
                    }
                    /* Border yang lebih tebal untuk garis pemisah */
                    .pos-receipt .border-dashed {
                        border-width: 2px !important;
                        border-color: #000000 !important;
                    }
                    .pos-receipt .border-b-2 {
                        border-bottom-width: 3px !important;
                    }
                    .pos-receipt .border-t-2 {
                        border-top-width: 3px !important;
                    }
                }
            `}</style>

            {/* Wavy bottom edge */}
            <div className="h-3 bg-white relative overflow-hidden">
                <svg
                    viewBox="0 0 280 12"
                    className="absolute bottom-0 left-0 w-full"
                    preserveAspectRatio="none"
                >
                    <path
                        d="M0,0 Q7,12 14,0 T28,0 T42,0 T56,0 T70,0 T84,0 T98,0 T112,0 T126,0 T140,0 T154,0 T168,0 T182,0 T196,0 T210,0 T224,0 T238,0 T252,0 T266,0 T280,0 L280,12 L0,12 Z"
                        fill="#f5f5f5"
                    />
                </svg>
            </div>
        </div>
    );
});

POSReceipt.displayName = 'POSReceipt';

export default POSReceipt;
