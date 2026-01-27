import { forwardRef } from 'react';
import { CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-sm p-0 overflow-hidden bg-gray-100">
                <div className="p-4 bg-white border-b">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            Transaksi Berhasil!
                        </DialogTitle>
                    </DialogHeader>
                </div>

                {/* Receipt Preview */}
                <div className="p-4 max-h-[60vh] overflow-y-auto">
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
                            storeName={storeName}
                            storeAddress={storeAddress}
                        />
                    )}
                </div>

                <div className="p-4 bg-white border-t flex gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">
                        Tutup
                    </Button>
                    <Button onClick={onPrint} className="flex-1 rounded-xl">
                        <Printer className="w-4 h-4 mr-2" />
                        Cetak Struk
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
