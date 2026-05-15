import { CheckCircle2, Printer, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppModal } from '@/components/ui/app-modal';
import POSReceipt from '@/components/pos/POSReceipt';
import { LastSaleData } from '@/hooks/usePOSCheckout';

interface POSReceiptDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    lastSale: LastSaleData | null;
    cashierName: string;
    storeName?: string;
    storeAddress?: string;
    receiptRef: React.RefObject<HTMLDivElement>;
    onPrint: () => void;
}

export function POSReceiptDialog({
    open,
    onOpenChange,
    lastSale,
    cashierName,
    storeName,
    storeAddress,
    receiptRef,
    onPrint,
}: POSReceiptDialogProps) {
    return (
        <AppModal
            open={open}
            onClose={() => onOpenChange(false)}
            title={
                lastSale?.isOffline ? (
                    <span className="flex items-center gap-2">
                        <CloudOff className="w-5 h-5 text-amber-500" />
                        Transaksi Disimpan (Offline)
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Transaksi Berhasil!
                    </span>
                )
            }
            description={lastSale?.isOffline ? 'Transaksi akan otomatis sync saat kembali online' : undefined}
            size="xs"
            noPadding
            scrollable={false}
            footer={
                <div className="flex gap-2 w-full">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">
                        Tutup
                    </Button>
                    <Button onClick={onPrint} className="flex-1 rounded-xl">
                        <Printer className="w-4 h-4 mr-2" />
                        Cetak Struk
                    </Button>
                </div>
            }
        >
            {/* Receipt Preview */}
            <div className="p-4 max-h-[60vh] overflow-y-auto bg-gray-100">
                {lastSale && (
                    <POSReceipt
                        ref={receiptRef}
                        saleNumber={lastSale.saleNumber}
                        cashierName={cashierName}
                        date={lastSale.date}
                        items={lastSale.items}
                        subtotal={lastSale.subtotal}
                        orderDiscount={lastSale.orderDiscount}
                        total={lastSale.total}
                        paymentMethod={lastSale.method}
                        amountPaid={lastSale.amountPaid}
                        change={lastSale.change}
                        amountCash={lastSale.amountCash}
                        amountTransfer={lastSale.amountTransfer}
                        storeName={storeName}
                        storeAddress={storeAddress}
                        isOffline={lastSale.isOffline}
                        returnRef={lastSale.returnRef}
                    />
                )}
            </div>
        </AppModal>
    );
}
