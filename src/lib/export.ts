// Export column interface for generic exports
export interface ExportColumn {
    header: string;
    accessorKey: string;
    format?: (value: any, row?: any) => string;
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

// Lazy load jsPDF and autoTable
async function loadPDFLibraries() {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
    ]);
    return { jsPDF, autoTable };
}

// Lazy load XLSX
async function loadXLSXLibrary() {
    const XLSX = await import('xlsx');
    return XLSX;
}

// Generic PDF export function (now async)
export async function exportToPDF<T extends object>(
    data: T[],
    columns: ExportColumn[],
    filename: string,
    config?: { title?: string; subtitle?: string }
) {
    const { jsPDF, autoTable } = await loadPDFLibraries();
    const doc = new jsPDF();

    // Add title if provided
    let yPosition = 15;
    if (config?.title) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(config.title, 14, yPosition);
        yPosition += 8;
    }

    if (config?.subtitle) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text(config.subtitle, 14, yPosition);
        yPosition += 5;
    }

    // Reset text color
    doc.setTextColor(0);

    // Prepare table data
    const headers = columns.map(col => col.header);
    const rows = data.map(item =>
        columns.map(col => {
            const value = (item as any)[col.accessorKey];
            if (col.format) {
                return col.format(value, item);
            }
            return value != null ? String(value) : '-';
        })
    );

    // Generate table
    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: yPosition + 5,
        styles: {
            fontSize: 9,
            cellPadding: 3,
        },
        headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold',
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
        margin: { left: 14, right: 14 },
    });

    // Add footer with date
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Generated: ${new Date().toLocaleString('id-ID')} - Page ${i} of ${pageCount}`,
            14,
            doc.internal.pageSize.height - 10
        );
    }

    // Save the PDF
    doc.save(`${filename}.pdf`);
}

// Generic Excel export function with column definitions (now async)
export async function exportToExcelWithColumns<T extends object>(
    data: T[],
    columns: ExportColumn[],
    filename: string,
    sheetName = 'Data'
) {
    const formattedData = data.map(item => {
        const row: Record<string, any> = {};
        columns.forEach(col => {
            const value = (item as any)[col.accessorKey];
            row[col.header] = col.format ? col.format(value, item) : (value ?? '-');
        });
        return row;
    });
    await exportToExcel(formattedData, filename, sheetName);
}

// Generic export function (legacy support - now async)
export async function exportToExcel<T extends object>(
    data: T[],
    filename: string,
    sheetName = 'Data'
) {
    const XLSX = await loadXLSXLibrary();

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

    // Use native download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Export products (now async)
export async function exportProducts(products: any[]) {
    const data = products.map(p => ({
        'Nama Produk': p.name,
        'Barcode': p.barcode,
        'Harga': p.price,
        'Stok Gudang': p.stock?.gudang || 0,
        'Stok Toko': p.stock?.toko || 0,
        'Stok Lainnya': p.stock?.lainnya || 0,
        'Total Stok': (p.stock?.gudang || 0) + (p.stock?.toko || 0) + (p.stock?.lainnya || 0),
    }));
    await exportToExcel(data, `produk_${formatDate(new Date())}`, 'Produk');
}

// Export stock logs (now async)
export async function exportStockLogs(logs: any[]) {
    const data = logs.map(l => ({
        'Tanggal': formatDateTime(l.timestamp),
        'Produk': l.product?.name || '-',
        'Tipe': l.type === 'in' ? 'Masuk' : l.type === 'out' ? 'Keluar' : 'Penyesuaian',
        'Jumlah': l.quantity,
        'Lokasi': capitalize(l.location),
        'Catatan': l.note || '-',
    }));
    await exportToExcel(data, `stok_log_${formatDate(new Date())}`, 'Stock Logs');
}

// Export sales (now async)
export async function exportSales(sales: any[]) {
    const data = sales.map(s => ({
        'No. Transaksi': s.sale_number,
        'Tanggal': formatDateTime(s.created_at),
        'Kasir': s.cashier_name,
        'Metode Bayar': s.payment_method === 'cash' ? 'Tunai' : 'Transfer',
        'Total': s.total_amount,
    }));
    await exportToExcel(data, `penjualan_${formatDate(new Date())}`, 'Penjualan');
}

// Export requests (now async)
export async function exportRequests(requests: any[]) {
    const data = requests.map(r => ({
        'ID': r.id.slice(0, 8),
        'Tanggal': formatDateTime(r.requested_at),
        'Produk': r.product?.name || '-',
        'Jumlah': r.quantity,
        'Dari': capitalize(r.from_location),
        'Ke': capitalize(r.to_location),
        'Status': statusLabel(r.status),
    }));
    await exportToExcel(data, `permintaan_stok_${formatDate(new Date())}`, 'Permintaan');
}

// Export surat jalan (now async)
export async function exportSuratJalan(suratJalans: any[]) {
    const data = suratJalans.map(s => ({
        'Nomor': s.number,
        'Tanggal': formatDateTime(s.created_at),
        'Jumlah Item': s.items?.length || 0,
        'Status': statusLabel(s.status),
    }));
    await exportToExcel(data, `surat_jalan_${formatDate(new Date())}`, 'Surat Jalan');
}

// Export cash transfers (now async)
export async function exportCashTransfers(transfers: any[]) {
    const data = transfers.map(t => ({
        'Tanggal': formatDateTime(t.created_at),
        'Kasir': t.cashier_name,
        'Jumlah': t.amount,
        'Catatan': t.note || '-',
    }));
    await exportToExcel(data, `setoran_${formatDate(new Date())}`, 'Setoran');
}
