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
            className="bg-white text-black font-mono text-xs w-[280px] mx-auto shadow-lg print:shadow-none"
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
            <div className="px-4 py-3 space-y-3 bg-gradient-to-b from-gray-50 to-white">
                {/* Header */}
                <div className="text-center border-b border-dashed border-gray-300 pb-3">
                    <h2 className="text-sm font-bold tracking-wider">RECEIPT</h2>
                    <p className="text-[8px] text-gray-400 tracking-[0.3em]">
                        ********************************
                    </p>
                    <h3 className="font-bold text-sm mt-2">{storeName}</h3>
                    <p className="text-[10px] text-gray-500">{storeAddress}</p>
                </div>

                {/* Info */}
                <div className="text-[10px] space-y-1 border-b border-dashed border-gray-300 pb-3">
                    <div className="flex justify-between">
                        <span className="text-gray-500">No:</span>
                        <span className="font-medium">{saleNumber}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Tanggal:</span>
                        <span>{formatDate(date)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Waktu:</span>
                        <span>{formatTime(date)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Kasir:</span>
                        <span>{cashierName}</span>
                    </div>
                </div>

                {/* Items header */}
                <div className="flex justify-between text-[10px] font-bold border-b border-gray-200 pb-1">
                    <span>Item</span>
                    <span>Harga</span>
                </div>

                {/* Items */}
                <div className="space-y-2">
                    {items.map((item, idx) => (
                        <div key={idx} className="text-[10px]">
                            <div className="flex justify-between">
                                <span className="flex-1 truncate pr-2">{item.name}</span>
                                <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                            </div>
                            <div className="text-gray-400 text-[9px] pl-2">
                                {item.quantity} x {formatCurrency(item.price)}
                                {item.discount > 0 && (
                                    <span className="text-green-600 ml-1">(-{item.discount}%)</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="border-t border-dashed border-gray-300 pt-3 space-y-1 text-[10px]">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {orderDiscount > 0 && (
                        <div className="flex justify-between text-green-600">
                            <span>Diskon ({orderDiscount}%)</span>
                            <span>-{formatCurrency(Math.round(subtotal * orderDiscount / 100))}</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-sm pt-1 border-t border-gray-200">
                        <span>TOTAL</span>
                        <span>{formatCurrency(total)}</span>
                    </div>
                </div>

                {/* Payment info */}
                <div className="border-t border-dashed border-gray-300 pt-3 space-y-1 text-[10px]">
                    <div className="flex justify-between">
                        <span>Metode</span>
                        <span className="font-medium uppercase">
                            {paymentMethod === 'cash' ? 'TUNAI' : 'TRANSFER'}
                        </span>
                    </div>
                    {paymentMethod === 'cash' && (
                        <>
                            <div className="flex justify-between">
                                <span>Bayar</span>
                                <span>{formatCurrency(amountPaid)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Kembalian</span>
                                <span>{formatCurrency(change)}</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center pt-3 border-t border-dashed border-gray-300">
                    <p className="font-bold text-sm tracking-wider">TERIMA KASIH</p>
                    <p className="text-[9px] text-gray-400 mt-1">Barang yang sudah dibeli</p>
                    <p className="text-[9px] text-gray-400">tidak dapat ditukar/dikembalikan</p>
                </div>

                {/* Barcode */}
                <div className="flex justify-center pt-2 pb-1">
                    <Barcode
                        value={saleNumber.replace(/[^a-zA-Z0-9]/g, '')}
                        width={1.2}
                        height={40}
                        fontSize={8}
                        margin={0}
                        displayValue={true}
                    />
                </div>
            </div>

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
