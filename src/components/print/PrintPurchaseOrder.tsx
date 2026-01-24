import { forwardRef } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { PurchaseOrder } from '@/types';

interface PrintPurchaseOrderProps {
    purchaseOrder: PurchaseOrder;
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
}

const PrintPurchaseOrder = forwardRef<HTMLDivElement, PrintPurchaseOrderProps>(
    ({
        purchaseOrder,
        companyName = 'VERTICAL MATERIAL CV',
        companyAddress = 'Ruko Four Seasons Blok H no.1\nTaman Duta Mas - Batam',
        companyPhone = '0811 778 1801',
        companyEmail = 'verticalmaterial@gmail.com'
    }, ref) => {
        // Calculate totals
        const totalQuantity = purchaseOrder.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
        const subtotal = purchaseOrder.items?.reduce((acc, item) => acc + item.total_price, 0) || 0;
        const discount = 0; // Could be added to PO model if needed
        const ppn = 0; // Could be added to PO model if needed
        const grandTotal = subtotal - discount + ppn;

        // Format date
        const createdDate = new Date(purchaseOrder.created_at);
        const formattedDate = format(createdDate, 'MMMM dd, yyyy', { locale: id });
        const footerDate = format(createdDate, "'Batam,' dd MMMM yyyy", { locale: id });

        // Default unit for items (PurchaseOrderItem doesn't have unit field)
        const defaultUnit = 'pcs';

        return (
            <div
                ref={ref}
                className="print-po-container bg-white text-black p-8 max-w-[210mm] mx-auto"
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}
            >
                {/* Company Header */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold tracking-wide" style={{ letterSpacing: '2px' }}>
                        {companyName}
                    </h1>
                    <p className="text-sm mt-1 whitespace-pre-line">{companyAddress}</p>
                    <p className="text-sm">Telepon ({companyPhone})</p>
                </div>

                {/* Contact Info Row */}
                <div className="flex justify-between text-xs mb-4 border-t border-black pt-2">
                    <div>
                        <p>Phone: 0778-469010</p>
                        <p>Fax:</p>
                    </div>
                    <div className="text-right">
                        <p>E-mail: {companyEmail}</p>
                    </div>
                </div>

                {/* Main Content - Two Column Layout */}
                <div className="flex justify-between mb-6">
                    {/* Left Side - Recipient Info */}
                    <div className="flex-1 border border-black p-3">
                        <table className="text-sm">
                            <tbody>
                                <tr>
                                    <td className="font-semibold pr-2 align-top">To</td>
                                    <td className="pr-2 align-top">:</td>
                                    <td className="font-semibold">{purchaseOrder.supplier?.name || '-'}</td>
                                </tr>
                                <tr>
                                    <td colSpan={3} className="pl-8 text-sm">
                                        {purchaseOrder.supplier?.address || ''}
                                    </td>
                                </tr>
                                <tr><td colSpan={3} className="h-3"></td></tr>
                                <tr>
                                    <td className="pr-2">Attn</td>
                                    <td className="pr-2">:</td>
                                    <td>{purchaseOrder.supplier?.contact_person || ''}</td>
                                </tr>
                                <tr>
                                    <td className="pr-2">Phone</td>
                                    <td className="pr-2">:</td>
                                    <td>{purchaseOrder.supplier?.phone || ''}</td>
                                </tr>
                                <tr>
                                    <td className="pr-2">Fax</td>
                                    <td className="pr-2">:</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Right Side - PO Info */}
                    <div className="ml-4 text-right">
                        <p className="text-xs mb-1">Page 1 of 1</p>
                        <h2
                            className="text-xl font-bold italic mb-2"
                            style={{
                                color: '#8B0000',
                                textDecoration: 'underline',
                                textDecorationColor: '#8B0000'
                            }}
                        >
                            PURCHASE ORDER
                        </h2>
                        <table className="text-sm ml-auto">
                            <tbody>
                                <tr>
                                    <td className="font-semibold pr-2">No</td>
                                    <td className="pr-2">:</td>
                                    <td className="font-semibold">{purchaseOrder.po_number}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold pr-2">Date</td>
                                    <td className="pr-2">:</td>
                                    <td className="font-semibold">{formattedDate}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse mb-4 text-sm">
                    <thead>
                        <tr className="border-t-2 border-b-2 border-black">
                            <th className="py-2 px-2 text-left font-bold" style={{ width: '40px' }}>NO</th>
                            <th className="py-2 px-2 text-left font-bold">DESCRIPTION</th>
                            <th className="py-2 px-2 text-center font-bold" style={{ width: '100px' }}>QUANTITY</th>
                            <th className="py-2 px-2 text-right font-bold" style={{ width: '100px' }}>@</th>
                            <th className="py-2 px-2 text-center font-bold" style={{ width: '60px' }}>DISC</th>
                            <th className="py-2 px-2 text-right font-bold" style={{ width: '120px' }}>AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchaseOrder.items?.map((item, idx) => (
                            <tr key={item.id}>
                                <td className="py-2 px-2">{idx + 1}.</td>
                                <td className="py-2 px-2">{item.product_name}</td>
                                <td className="py-2 px-2 text-center">
                                    {item.quantity} {defaultUnit}
                                </td>
                                <td className="py-2 px-2 text-right">
                                    {item.unit_price.toLocaleString('id-ID')}
                                </td>
                                <td className="py-2 px-2 text-center">-</td>
                                <td className="py-2 px-2 text-right">
                                    {item.total_price.toLocaleString('id-ID')}
                                </td>
                            </tr>
                        ))}
                        {/* Empty rows for spacing */}
                        {Array.from({ length: Math.max(0, 10 - (purchaseOrder.items?.length || 0)) }).map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="py-2 px-2">&nbsp;</td>
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2"></td>
                                <td className="py-2 px-2"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Summary Section */}
                <div className="flex justify-between items-start border-t-2 border-black pt-4 mb-8">
                    {/* Left - empty or NB */}
                    <div className="flex-1">
                        {purchaseOrder.notes && (
                            <div className="text-sm">
                                <p className="font-semibold text-blue-600">NB :</p>
                                <p className="italic">{purchaseOrder.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Right - Totals */}
                    <div className="text-right">
                        <table className="text-sm ml-auto">
                            <tbody>
                                <tr>
                                    <td className="py-1 px-4 text-right">{totalQuantity} {defaultUnit}</td>
                                    <td className="py-1 px-2 font-semibold">DISC</td>
                                    <td className="py-1 px-2">:</td>
                                    <td className="py-1 px-2">IDR</td>
                                    <td className="py-1 px-4 text-right">{discount > 0 ? discount.toLocaleString('id-ID') : '-'}</td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td className="py-1 px-2 font-semibold">PPN</td>
                                    <td className="py-1 px-2">:</td>
                                    <td className="py-1 px-2">IDR</td>
                                    <td className="py-1 px-4 text-right">{ppn.toLocaleString('id-ID')}</td>
                                </tr>
                                <tr className="font-bold">
                                    <td></td>
                                    <td className="py-1 px-2">TOTAL</td>
                                    <td className="py-1 px-2">:</td>
                                    <td className="py-1 px-2">IDR</td>
                                    <td className="py-1 px-4 text-right">{grandTotal.toLocaleString('id-ID')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer - Signature Section */}
                <div className="flex justify-between items-start mt-8">
                    <div className="text-blue-600 text-sm italic">
                        NB :
                    </div>
                    <div className="text-center" style={{ minWidth: '200px' }}>
                        <p className="text-sm mb-16">{footerDate}</p>
                        <p className="text-sm mb-12">Best Regards,</p>
                        <div className="border-t border-black mt-8 pt-1">
                            <p className="text-sm font-semibold" style={{ color: '#8B0000' }}>
                                Authorized Signature
                            </p>
                        </div>
                    </div>
                </div>

                {/* Print Styles */}
                <style>{`
                    @media print {
                        .print-po-container {
                            padding: 10mm;
                            max-width: 100%;
                            margin: 0;
                        }
                        body * {
                            visibility: hidden;
                        }
                        .print-po-container, .print-po-container * {
                            visibility: visible;
                        }
                        .print-po-container {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        @page {
                            size: A4;
                            margin: 10mm;
                        }
                    }
                `}</style>
            </div>
        );
    }
);

PrintPurchaseOrder.displayName = 'PrintPurchaseOrder';

export default PrintPurchaseOrder;
