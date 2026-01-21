import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { SuratJalan } from '@/types';

interface SuratJalanPrintProps {
  suratJalan: SuratJalan;
}

export default function SuratJalanPrint({ suratJalan }: SuratJalanPrintProps) {
  const getLocationName = (loc: string) => {
    switch (loc) {
      case 'gudang': return 'Gudang';
      case 'toko': return 'Toko';
      default: return loc;
    }
  };

  return (
    <div className="print-content p-8 bg-white text-black min-h-[297mm] w-[210mm]">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold mb-1">VERTICAL BUILDING</h1>
        <p className="text-sm text-gray-600">Inventory System</p>
        <h2 className="text-xl font-bold mt-4">SURAT JALAN</h2>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="py-1 pr-4 font-medium">Nomor</td>
                <td className="py-1">: {suratJalan.number}</td>
              </tr>
              <tr>
                <td className="py-1 pr-4 font-medium">Tanggal</td>
                <td className="py-1">: {format(new Date(suratJalan.created_at), 'dd MMMM yyyy', { locale: id })}</td>
              </tr>
              <tr>
                <td className="py-1 pr-4 font-medium">Waktu</td>
                <td className="py-1">: {format(new Date(suratJalan.created_at), 'HH:mm', { locale: id })} WIB</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <table className="text-sm">
            <tbody>
              <tr>
                <td className="py-1 pr-4 font-medium">Dibuat Oleh</td>
                <td className="py-1">: {suratJalan.created_by || '-'}</td>
              </tr>
              {suratJalan.approved_by && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Disetujui Oleh</td>
                  <td className="py-1">: {suratJalan.approved_by}</td>
                </tr>
              )}
              {suratJalan.approved_at && (
                <tr>
                  <td className="py-1 pr-4 font-medium">Tanggal Persetujuan</td>
                  <td className="py-1">: {format(new Date(suratJalan.approved_at), 'dd MMMM yyyy HH:mm', { locale: id })}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">No</th>
            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Nama Produk</th>
            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Barcode</th>
            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold">Jumlah</th>
            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Dari</th>
            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Ke</th>
          </tr>
        </thead>
        <tbody>
          {suratJalan.items.map((item, idx) => (
            <tr key={idx}>
              <td className="border border-gray-300 px-3 py-2 text-sm">{idx + 1}</td>
              <td className="border border-gray-300 px-3 py-2 text-sm font-medium">{item.product_name}</td>
              <td className="border border-gray-300 px-3 py-2 text-sm font-mono">{item.barcode}</td>
              <td className="border border-gray-300 px-3 py-2 text-sm text-center font-semibold">{item.quantity}</td>
              <td className="border border-gray-300 px-3 py-2 text-sm">{getLocationName(item.from_location)}</td>
              <td className="border border-gray-300 px-3 py-2 text-sm">{getLocationName(item.to_location)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-50">
            <td colSpan={3} className="border border-gray-300 px-3 py-2 text-sm font-semibold text-right">Total Item:</td>
            <td className="border border-gray-300 px-3 py-2 text-sm text-center font-bold">
              {suratJalan.items.reduce((sum, item) => sum + item.quantity, 0)}
            </td>
            <td colSpan={2} className="border border-gray-300"></td>
          </tr>
        </tfoot>
      </table>

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-8 mt-16">
        <div className="text-center">
          <p className="text-sm font-medium mb-16">Dibuat Oleh,</p>
          <div className="border-t border-gray-400 pt-2">
            <p className="text-sm font-medium">{suratJalan.created_by || '________________'}</p>
            <p className="text-xs text-gray-500">Kasir</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium mb-16">Disetujui Oleh,</p>
          <div className="border-t border-gray-400 pt-2">
            <p className="text-sm font-medium">{suratJalan.approved_by || '________________'}</p>
            <p className="text-xs text-gray-500">Auditor</p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium mb-16">Diterima Oleh,</p>
          <div className="border-t border-gray-400 pt-2">
            <p className="text-sm font-medium">________________</p>
            <p className="text-xs text-gray-500">Penerima</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
        <p>Dokumen ini dicetak pada {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })} WIB</p>
        <p>Vertical Building Inventory System</p>
      </div>
    </div>
  );
}
