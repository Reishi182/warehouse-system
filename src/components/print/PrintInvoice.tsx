import { forwardRef } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Invoice } from '@/types';

interface PrintInvoiceProps {
    invoice: Invoice;
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyEmail?: string;
    bankInfo?: string;
    salesPerson?: string;
}

// Helper function to convert number to Indonesian words
function numberToWords(num: number): string {
    const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

    if (num < 12) return units[num];
    if (num < 20) return units[num - 10] + ' belas';
    if (num < 100) return units[Math.floor(num / 10)] + ' puluh ' + units[num % 10];
    if (num < 200) return 'seratus ' + numberToWords(num - 100);
    if (num < 1000) return units[Math.floor(num / 100)] + ' ratus ' + numberToWords(num % 100);
    if (num < 2000) return 'seribu ' + numberToWords(num - 1000);
    if (num < 1000000) return numberToWords(Math.floor(num / 1000)) + ' ribu ' + numberToWords(num % 1000);
    if (num < 1000000000) return numberToWords(Math.floor(num / 1000000)) + ' juta ' + numberToWords(num % 1000000);
    if (num < 1000000000000) return numberToWords(Math.floor(num / 1000000000)) + ' miliar ' + numberToWords(num % 1000000000);
    return num.toString();
}

function terbilang(amount: number): string {
    if (amount === 0) return 'nol rupiah';
    const words = numberToWords(Math.floor(amount)).trim().replace(/\s+/g, ' ');
    return words.charAt(0).toUpperCase() + words.slice(1) + ' rupiah';
}

const PrintInvoice = forwardRef<HTMLDivElement, PrintInvoiceProps>(
    ({
        invoice,
        companyName = 'VERTICAL MATERIAL CV',
        companyAddress = 'Ruko Four Seasons Blok H no.1\nTaman Duta Mas - Batam',
        companyPhone = '0811 778 1801',
        companyEmail = 'verticalmaterial@gmail.com',
        bankInfo = 'BCA a.n CV. VERTICAL MATERIAL 821-045-6636',
        salesPerson = 'Office'
    }, ref) => {
        // Calculate totals
        const subtotal = invoice.items?.reduce((acc, item) => acc + item.total, 0) || invoice.total_amount;
        const discount = 0; // Could be added to Invoice model
        const ppn = 0; // Could be added to Invoice model
        const grandTotal = subtotal - discount + ppn;

        // Format dates
        const invoiceDate = new Date(invoice.created_at);
        const formattedDate = format(invoiceDate, 'dd MMMM yyyy', { locale: id });

        // Calculate due date (default 30 days credit term)
        const dueDate = invoice.due_date ? new Date(invoice.due_date) : new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        const formattedDueDate = format(dueDate, 'dd MMMM', { locale: id });

        // Credit term calculation
        const creditDays = invoice.due_date
            ? Math.round((new Date(invoice.due_date).getTime() - invoiceDate.getTime()) / (24 * 60 * 60 * 1000))
            : 30;

        // Printed timestamp
        const printedAt = format(new Date(), "HH:mm, EEEE, dd MMMM yyyy", { locale: id });

        return (
            <div
                ref={ref}
                className="print-invoice-container bg-white text-black p-6 max-w-[210mm] mx-auto"
                style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}
            >
                {/* Header Section */}
                <div className="flex justify-between mb-4">
                    {/* Left - Company Info */}
                    <div>
                        <h1 className="text-xl font-bold">{companyName}</h1>
                        <p className="text-sm whitespace-pre-line">{companyAddress}</p>
                        <p className="text-sm">Telepon ({companyPhone})</p>
                    </div>

                    {/* Center - INVOICE Title */}
                    <div className="text-center">
                        <h2
                            className="text-xl font-bold underline"
                            style={{ textDecorationThickness: '2px' }}
                        >
                            INVOICE
                        </h2>
                    </div>

                    {/* Right - Recipient Info */}
                    <div className="text-right">
                        <table className="text-sm ml-auto">
                            <tbody>
                                <tr>
                                    <td className="pr-2 font-semibold">Kepada</td>
                                    <td className="pr-2">:</td>
                                    <td className="font-semibold">{invoice.recipient_name}</td>
                                </tr>
                                <tr>
                                    <td className="pr-2">Telepon</td>
                                    <td className="pr-2">:</td>
                                    <td>{invoice.customer?.phone || ''}</td>
                                </tr>
                                <tr>
                                    <td className="pr-2">Sales</td>
                                    <td className="pr-2">:</td>
                                    <td>{salesPerson}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Invoice Info */}
                <div className="flex justify-between mb-4 text-sm">
                    <div>
                        <table>
                            <tbody>
                                <tr>
                                    <td className="font-semibold pr-2">INVOICE NO</td>
                                    <td className="pr-2">:</td>
                                    <td className="font-semibold">{invoice.invoice_number}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold pr-2">TANGGAL</td>
                                    <td className="pr-2">:</td>
                                    <td className="font-semibold">{formattedDate}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse mb-2 text-sm">
                    <thead>
                        <tr className="border-t-2 border-b border-black">
                            <th className="py-2 px-1 text-left font-bold" style={{ width: '30px' }}>NO</th>
                            <th className="py-2 px-1 text-left font-bold">NAMA BARANG</th>
                            <th className="py-2 px-1 text-center font-bold" style={{ width: '70px' }}>JUMLAH</th>
                            <th className="py-2 px-1 text-center font-bold" style={{ width: '50px' }}>BONUS</th>
                            <th className="py-2 px-1 text-right font-bold" style={{ width: '80px' }}>@HARGA</th>
                            <th className="py-2 px-1 text-right font-bold" style={{ width: '90px' }}>HARGA</th>
                            <th className="py-2 px-1 text-center font-bold" style={{ width: '70px' }}>DISKON</th>
                            <th className="py-2 px-1 text-right font-bold" style={{ width: '90px' }}>TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items?.map((item, idx) => (
                            <tr key={item.id}>
                                <td className="py-1 px-1">{idx + 1}.</td>
                                <td className="py-1 px-1">{item.product_name}</td>
                                <td className="py-1 px-1 text-center">{item.quantity} Pack</td>
                                <td className="py-1 px-1 text-center">-</td>
                                <td className="py-1 px-1 text-right">{item.price.toLocaleString('id-ID')}</td>
                                <td className="py-1 px-1 text-right">{item.total.toLocaleString('id-ID')}</td>
                                <td className="py-1 px-1 text-center">- 0,0 %</td>
                                <td className="py-1 px-1 text-right">{item.total.toLocaleString('id-ID')}</td>
                            </tr>
                        ))}
                        {/* Empty rows to fill space */}
                        {Array.from({ length: Math.max(0, 5 - (invoice.items?.length || 0)) }).map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="py-1 px-1">&nbsp;</td>
                                <td className="py-1 px-1"></td>
                                <td className="py-1 px-1"></td>
                                <td className="py-1 px-1"></td>
                                <td className="py-1 px-1"></td>
                                <td className="py-1 px-1"></td>
                                <td className="py-1 px-1"></td>
                                <td className="py-1 px-1"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Bottom Section - Credit Terms & Totals */}
                <div className="flex justify-between border-t border-black pt-2 mb-4">
                    {/* Left - Credit & Notes */}
                    <div className="text-sm flex-1">
                        <table>
                            <tbody>
                                <tr>
                                    <td className="font-semibold pr-2">CREDIT TERM</td>
                                    <td className="pr-2">:</td>
                                    <td>{creditDays} hari</td>
                                    <td className="pl-4 font-semibold pr-2">JATUH TEMPO</td>
                                    <td className="pr-2">:</td>
                                    <td>{formattedDueDate}</td>
                                </tr>
                                <tr>
                                    <td className="font-semibold pr-2">Catatan</td>
                                    <td className="pr-2">:</td>
                                    <td colSpan={4}></td>
                                </tr>
                                <tr>
                                    <td colSpan={6} className="pl-8 pt-1">{bankInfo}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="mt-2">
                            <table>
                                <tbody>
                                    <tr>
                                        <td className="font-semibold pr-2">Terbilang</td>
                                        <td className="pr-2">:</td>
                                        <td className="italic">{terbilang(grandTotal)}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-semibold pr-2">Printed By</td>
                                        <td className="pr-2">:</td>
                                        <td>{printedAt}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right - Totals */}
                    <div className="text-sm">
                        <table className="ml-auto">
                            <tbody>
                                <tr>
                                    <td className="py-1 px-2 font-semibold text-right">TOTAL</td>
                                    <td className="py-1 px-2">:</td>
                                    <td className="py-1 px-2">IDR</td>
                                    <td className="py-1 px-4 text-right">{subtotal.toLocaleString('id-ID')}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 px-2 font-semibold text-right">DISCOUNT</td>
                                    <td className="py-1 px-2">:</td>
                                    <td className="py-1 px-2">IDR</td>
                                    <td className="py-1 px-4 text-right">{discount > 0 ? discount.toLocaleString('id-ID') : '-'}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 px-2 font-semibold text-right">PPN</td>
                                    <td className="py-1 px-2">:</td>
                                    <td className="py-1 px-2">IDR</td>
                                    <td className="py-1 px-4 text-right">{ppn > 0 ? ppn.toLocaleString('id-ID') : '-'}</td>
                                </tr>
                                <tr className="font-bold border-t border-black">
                                    <td className="py-1 px-2 text-right">GRAND TOTAL</td>
                                    <td className="py-1 px-2">:</td>
                                    <td className="py-1 px-2">IDR</td>
                                    <td className="py-1 px-4 text-right">{grandTotal.toLocaleString('id-ID')}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Signature Section */}
                <div className="grid grid-cols-4 gap-4 mt-12 text-sm text-center">
                    <div>
                        <p className="font-semibold mb-16">Yang Menerima,</p>
                        <p className="border-t border-black pt-1">(_________________)</p>
                    </div>
                    <div>
                        <p className="font-semibold mb-16">Kepala Gudang,</p>
                        <p className="border-t border-black pt-1">(_________________)</p>
                    </div>
                    <div>
                        <p className="font-semibold mb-16">Supir / Helper,</p>
                        <p className="border-t border-black pt-1">(_________________)</p>
                    </div>
                    <div>
                        <p className="font-semibold mb-16" style={{ color: '#8B0000' }}>Hormat Kami,</p>
                        <p className="border-t border-black pt-1">(_________________)</p>
                    </div>
                </div>

                {/* Print Styles */}
                <style>{`
                    @media print {
                        .print-invoice-container {
                            padding: 10mm;
                            max-width: 100%;
                            margin: 0;
                        }
                        body * {
                            visibility: hidden;
                        }
                        .print-invoice-container, .print-invoice-container * {
                            visibility: visible;
                        }
                        .print-invoice-container {
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

PrintInvoice.displayName = 'PrintInvoice';

export default PrintInvoice;
