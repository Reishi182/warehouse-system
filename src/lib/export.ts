import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Generic export function
export function exportToExcel<T extends object>(
    data: T[],
    filename: string,
    sheetName = 'Data'
) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Auto-fit columns
    const maxWidths: number[] = [];
    data.forEach(row => {
        Object.values(row).forEach((val, i) => {
            const len = String(val).length;
            maxWidths[i] = Math.max(maxWidths[i] || 10, len);
        });
    });
    worksheet['!cols'] = maxWidths.map(w => ({ wch: Math.min(w + 2, 50) }));

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Use native download since file-saver might not be installed
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Export products
export function exportProducts(products: any[]) {
    const data = products.map(p => ({
        'Nama Produk': p.name,
        'Barcode': p.barcode,
        'Harga': p.price,
        'Stok Gudang': p.stock?.gudang || 0,
        'Stok Toko': p.stock?.toko || 0,
        'Stok Lainnya': p.stock?.lainnya || 0,
        'Total Stok': (p.stock?.gudang || 0) + (p.stock?.toko || 0) + (p.stock?.lainnya || 0),
    }));
    exportToExcel(data, `produk_${formatDate(new Date())}`, 'Produk');
}

// Export stock logs
export function exportStockLogs(logs: any[]) {
    const data = logs.map(l => ({
        'Tanggal': formatDateTime(l.timestamp),
        'Produk': l.product?.name || '-',
        'Tipe': l.type === 'in' ? 'Masuk' : l.type === 'out' ? 'Keluar' : 'Penyesuaian',
        'Jumlah': l.quantity,
        'Lokasi': capitalize(l.location),
        'Catatan': l.note || '-',
    }));
    exportToExcel(data, `stok_log_${formatDate(new Date())}`, 'Stock Logs');
}

// Export sales
export function exportSales(sales: any[]) {
    const data = sales.map(s => ({
        'No. Transaksi': s.sale_number,
        'Tanggal': formatDateTime(s.created_at),
        'Kasir': s.cashier_name,
        'Metode Bayar': s.payment_method === 'cash' ? 'Tunai' : 'Transfer',
        'Total': s.total_amount,
    }));
    exportToExcel(data, `penjualan_${formatDate(new Date())}`, 'Penjualan');
}

// Export requests
export function exportRequests(requests: any[]) {
    const data = requests.map(r => ({
        'ID': r.id.slice(0, 8),
        'Tanggal': formatDateTime(r.requested_at),
        'Produk': r.product?.name || '-',
        'Jumlah': r.quantity,
        'Dari': capitalize(r.from_location),
        'Ke': capitalize(r.to_location),
        'Status': statusLabel(r.status),
    }));
    exportToExcel(data, `permintaan_stok_${formatDate(new Date())}`, 'Permintaan');
}

// Export surat jalan
export function exportSuratJalan(suratJalans: any[]) {
    const data = suratJalans.map(s => ({
        'Nomor': s.number,
        'Tanggal': formatDateTime(s.created_at),
        'Jumlah Item': s.items?.length || 0,
        'Status': statusLabel(s.status),
    }));
    exportToExcel(data, `surat_jalan_${formatDate(new Date())}`, 'Surat Jalan');
}

// Export cash transfers
export function exportCashTransfers(transfers: any[]) {
    const data = transfers.map(t => ({
        'Tanggal': formatDateTime(t.created_at),
        'Kasir': t.cashier_name,
        'Jumlah': t.amount,
        'Catatan': t.note || '-',
    }));
    exportToExcel(data, `setoran_${formatDate(new Date())}`, 'Setoran');
}

// Helper functions
function formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID');
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function statusLabel(status: string): string {
    switch (status) {
        case 'pending': return 'Menunggu';
        case 'approved': return 'Disetujui';
        case 'completed': return 'Selesai';
        case 'rejected': return 'Ditolak';
        default: return status;
    }
}
