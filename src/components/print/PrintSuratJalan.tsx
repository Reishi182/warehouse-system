import { forwardRef } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { SuratJalan } from '@/types';

interface PrintSuratJalanProps {
    suratJalan: SuratJalan;
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
}

const PrintSuratJalan = forwardRef<HTMLDivElement, PrintSuratJalanProps>(
    ({ suratJalan, companyName = 'Vertical Building', companyAddress = '', companyPhone = '' }, ref) => {
        const totalItems = suratJalan.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
        const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

        return (
            <div ref={ref} className="print-container bg-white text-black p-8 max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center border-b-2 border-black pb-4 mb-6">
                    <h1 className="text-2xl font-bold uppercase tracking-wide">{companyName}</h1>
                    {companyAddress && <p className="text-sm mt-1">{companyAddress}</p>}
                    {companyPhone && <p className="text-sm">Telp: {companyPhone}</p>}
                </div>

                {/* Title */}
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold uppercase underline">SURAT JALAN</h2>
                    <p className="text-lg font-semibold mt-2">{suratJalan.number}</p>
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                    <div>
                        <p><span className="font-semibold">Tanggal:</span> {format(new Date(suratJalan.created_at), 'dd MMMM yyyy', { locale: id })}</p>
                        <p><span className="font-semibold">Status:</span> {suratJalan.status === 'approved' ? 'Disetujui' : suratJalan.status === 'pending' ? 'Menunggu' : suratJalan.status}</p>
                    </div>
                    <div className="text-right">
                        <p><span className="font-semibold">Total Item:</span> {suratJalan.items?.length || 0} jenis</p>
                        <p><span className="font-semibold">Total Qty:</span> {totalItems} unit</p>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full border-collapse mb-6">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black px-3 py-2 text-left">No</th>
                            <th className="border border-black px-3 py-2 text-left">Nama Barang</th>
                            <th className="border border-black px-3 py-2 text-left">Barcode</th>
                            <th className="border border-black px-3 py-2 text-center">Qty</th>
                            <th className="border border-black px-3 py-2 text-left">Dari</th>
                            <th className="border border-black px-3 py-2 text-left">Ke</th>
                        </tr>
                    </thead>
                    <tbody>
                        {suratJalan.items?.map((item, index) => (
                            <tr key={item.id}>
                                <td className="border border-black px-3 py-2">{index + 1}</td>
                                <td className="border border-black px-3 py-2">{item.product_name}</td>
                                <td className="border border-black px-3 py-2 font-mono text-sm">{item.barcode}</td>
                                <td className="border border-black px-3 py-2 text-center font-semibold">{item.quantity}</td>
                                <td className="border border-black px-3 py-2">{capitalize(item.from_location)}</td>
                                <td className="border border-black px-3 py-2">{capitalize(item.to_location)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-4 mt-12 text-center text-sm">
                    <div>
                        <p className="font-semibold mb-16">Dibuat Oleh</p>
                        <p className="border-t border-black pt-2">(_________________)</p>
                    </div>
                    <div>
                        <p className="font-semibold mb-16">Pengirim</p>
                        <p className="border-t border-black pt-2">(_________________)</p>
                    </div>
                    <div>
                        <p className="font-semibold mb-16">Penerima</p>
                        <p className="border-t border-black pt-2">(_________________)</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-xs text-gray-500 border-t pt-4">
                    <p>Dokumen ini dicetak pada {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}</p>
                </div>

                <style>{`
          @media print {
            .print-container {
              padding: 0;
              max-width: 100%;
            }
            body * {
              visibility: hidden;
            }
            .print-container, .print-container * {
              visibility: visible;
            }
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          }
        `}</style>
            </div>
        );
    }
);

PrintSuratJalan.displayName = 'PrintSuratJalan';

export default PrintSuratJalan;
