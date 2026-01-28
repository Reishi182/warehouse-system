import { forwardRef } from 'react';
import { PaymentMethod } from '@/types';
import Barcode from 'react-barcode';

interface ReceiptItem {
    name: string;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
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
}, ref) => {
    const formatCurrency = (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`;
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
                    <h2 className="text-base font-black tracking-wider">RECEIPT</h2>
                    <p className="text-xs text-black tracking-[0.2em] font-bold">
                        ================================
                    </p>
                    <h3 className="font-black text-base mt-2">{storeName}</h3>
                    <p className="text-xs text-black font-semibold">{storeAddress}</p>
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
                                <span className="font-bold">{formatCurrency(item.subtotal)}</span>
                            </div>
                            <div className="text-black text-xs pl-2 font-medium">
                                {item.quantity} x {formatCurrency(item.price)}
                                {item.discount > 0 && (
                                    <span className="font-bold ml-1">(-{item.discount}%)</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="border-t-2 border-dashed border-black pt-3 space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {orderDiscount > 0 && (
                        <div className="flex justify-between font-bold">
                            <span>Diskon ({orderDiscount}%)</span>
                            <span>-{formatCurrency(Math.round(subtotal * orderDiscount / 100))}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-black text-base pt-1 border-t-2 border-black">
                        <span>TOTAL</span>
                        <span>{formatCurrency(total)}</span>
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
                                <span>{formatCurrency(amountPaid)}</span>
                            </div>
                            <div className="flex justify-between font-black">
                                <span>Kembalian</span>
                                <span>{formatCurrency(change)}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center pt-3 border-t-2 border-dashed border-black">
                    <p className="font-black text-base tracking-wider">TERIMA KASIH</p>
                    <p className="text-xs text-black font-semibold mt-1">Barang yang sudah dibeli</p>
                    <p className="text-xs text-black font-semibold">tidak dapat ditukar/dikembalikan</p>
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
                @media print {
                    .pos-receipt, .pos-receipt * {
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .pos-receipt {
                        font-weight: 600 !important;
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
