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
        'Total Stok': (p.stock?.gudang || 0) + (p.stock?.toko || 0),
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

// ==================================================
// PREMIUM PRODUCT STOCK EXPORT (PDF & Excel)
// ==================================================

const STOCK_LOW_THRESHOLD_GUDANG = 10;
const STOCK_LOW_THRESHOLD_TOKO = 5;

function getStockStatus(gudang: number, toko: number): string {
    if (gudang <= 0 && toko <= 0) return 'Habis';
    if (gudang < STOCK_LOW_THRESHOLD_GUDANG || toko < STOCK_LOW_THRESHOLD_TOKO) return 'Rendah';
    return 'Aman';
}

function getStatusColor(status: string): [number, number, number] {
    switch (status) {
        case 'Aman': return [39, 174, 96];    // green
        case 'Rendah': return [243, 156, 18];  // orange
        case 'Habis': return [231, 76, 60];    // red
        default: return [100, 100, 100];
    }
}

/**
 * Premium PDF Export for Product Stock
 * Features: Styled header, summary stats, color-coded status, professional table
 */
export async function exportProductStockPDF(products: any[]) {
    const { jsPDF, autoTable } = await loadPDFLibraries();
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.width;
    const now = new Date();

    // === HEADER BANNER ===
    // Blue gradient header background
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 32, 'F');
    // Darker accent stripe
    doc.setFillColor(30, 100, 160);
    doc.rect(0, 30, pageWidth, 3, 'F');

    // Title text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN STOK PRODUK', 14, 16);

    // Subtitle with date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tanggal cetak: ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 25);

    // Total products badge (right side)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const totalText = `${products.length} Produk`;
    const tw = doc.getTextWidth(totalText) + 12;
    doc.setFillColor(255, 255, 255, 0.3);
    doc.roundedRect(pageWidth - tw - 14, 9, tw, 14, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(totalText, pageWidth - tw - 8, 19);

    // === SUMMARY STATS BOXES ===
    const totalGudang = products.reduce((acc: number, p: any) => acc + (p.stock?.gudang ?? 0), 0);
    const totalToko = products.reduce((acc: number, p: any) => acc + (p.stock?.toko ?? 0), 0);
    const lowCount = products.filter((p: any) => getStockStatus(p.stock?.gudang ?? 0, p.stock?.toko ?? 0) === 'Rendah').length;
    const emptyCount = products.filter((p: any) => getStockStatus(p.stock?.gudang ?? 0, p.stock?.toko ?? 0) === 'Habis').length;

    const boxY = 38;
    const boxH = 18;
    const boxGap = 6;
    const boxCount = 4;
    const totalBoxWidth = pageWidth - 28;
    const boxW = (totalBoxWidth - (boxCount - 1) * boxGap) / boxCount;

    const statsData = [
        { label: 'Total Produk', value: products.length.toString(), color: [41, 128, 185] as [number, number, number] },
        { label: 'Total Stok Gudang', value: totalGudang.toLocaleString('id-ID'), color: [52, 152, 219] as [number, number, number] },
        { label: 'Total Stok Toko', value: totalToko.toLocaleString('id-ID'), color: [46, 204, 113] as [number, number, number] },
        { label: `Stok Rendah / Habis`, value: `${lowCount} / ${emptyCount}`, color: [231, 76, 60] as [number, number, number] },
    ];

    statsData.forEach((stat, i) => {
        const x = 14 + i * (boxW + boxGap);
        // Box background
        doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
        doc.roundedRect(x, boxY, boxW, boxH, 2, 2, 'F');
        // Value
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(stat.value, x + boxW / 2, boxY + 9, { align: 'center' });
        // Label
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(stat.label, x + boxW / 2, boxY + 15, { align: 'center' });
    });

    // === DATA TABLE ===
    const headers = ['No', 'Nama Produk', 'Barcode', 'Harga (Rp)', 'Stok Gudang', 'Stok Toko', 'Total Stok', 'Status'];
    const rows = products.map((p: any, i: number) => {
        const gudang = p.stock?.gudang ?? 0;
        const toko = p.stock?.toko ?? 0;
        return [
            (i + 1).toString(),
            p.name || '-',
            p.barcode || '-',
            (p.price ?? 0).toLocaleString('id-ID'),
            gudang.toString(),
            toko.toString(),
            (gudang + toko).toString(),
            getStockStatus(gudang, toko),
        ];
    });

    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: boxY + boxH + 8,
        styles: {
            fontSize: 8,
            cellPadding: 3,
            lineWidth: 0.1,
            lineColor: [220, 220, 220],
        },
        headStyles: {
            fillColor: [44, 62, 80],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'center',
        },
        bodyStyles: {
            textColor: [50, 50, 50],
        },
        alternateRowStyles: {
            fillColor: [245, 247, 250],
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },  // No
            1: { cellWidth: 'auto' },                  // Nama
            2: { cellWidth: 35, halign: 'center' },    // Barcode
            3: { halign: 'right', cellWidth: 28 },     // Harga
            4: { halign: 'center', cellWidth: 24 },    // Gudang
            5: { halign: 'center', cellWidth: 22 },    // Toko
            6: { halign: 'center', cellWidth: 22, fontStyle: 'bold' }, // Total
            7: { halign: 'center', cellWidth: 22 },    // Status
        },
        didParseCell: function (data: any) {
            // Color code the status column
            if (data.section === 'body' && data.column.index === 7) {
                const status = data.cell.raw as string;
                const color = getStatusColor(status);
                data.cell.styles.textColor = [255, 255, 255];
                data.cell.styles.fillColor = color;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 7;
            }
            // Highlight zero stock in red
            if (data.section === 'body' && (data.column.index === 4 || data.column.index === 5)) {
                const val = parseInt(data.cell.raw as string);
                if (val <= 0) {
                    data.cell.styles.textColor = [231, 76, 60];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        },
        margin: { left: 14, right: 14 },
    });

    // === FOOTER ===
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageH = doc.internal.pageSize.height;

        // Footer line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(14, pageH - 14, pageWidth - 14, pageH - 14);

        // Footer text
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        doc.setFont('helvetica', 'italic');
        doc.text(
            `Dicetak: ${now.toLocaleString('id-ID')}`,
            14,
            pageH - 8
        );
        doc.setFont('helvetica', 'normal');
        doc.text(
            `Halaman ${i} dari ${pageCount}`,
            pageWidth - 14,
            pageH - 8,
            { align: 'right' }
        );
    }

    doc.save(`laporan_stok_produk_${formatDate(now)}.pdf`);
}

/**
 * Premium Excel Export for Product Stock
 * Features: Styled header, summary row, conditional status colors, auto-fit columns
 */
export async function exportProductStockExcel(products: any[]) {
    const XLSX = await loadXLSXLibrary();
    const now = new Date();

    const totalGudang = products.reduce((acc: number, p: any) => acc + (p.stock?.gudang ?? 0), 0);
    const totalToko = products.reduce((acc: number, p: any) => acc + (p.stock?.toko ?? 0), 0);

    // Build rows
    const wsData: any[][] = [];

    // Row 0: Title
    wsData.push(['LAPORAN STOK PRODUK']);
    // Row 1: Date
    wsData.push([`Tanggal: ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`]);
    // Row 2: Empty spacer
    wsData.push([]);
    // Row 3: Summary
    wsData.push([
        `Total Produk: ${products.length}`,
        '',
        `Total Stok Gudang: ${totalGudang.toLocaleString('id-ID')}`,
        '',
        `Total Stok Toko: ${totalToko.toLocaleString('id-ID')}`,
        '',
        `Total Seluruh Stok: ${(totalGudang + totalToko).toLocaleString('id-ID')}`,
    ]);
    // Row 4: Empty spacer
    wsData.push([]);
    // Row 5: Column headers
    wsData.push(['No', 'Nama Produk', 'Barcode', 'Harga (Rp)', 'Stok Gudang', 'Stok Toko', 'Total Stok', 'Status']);

    // Data rows
    products.forEach((p: any, i: number) => {
        const gudang = p.stock?.gudang ?? 0;
        const toko = p.stock?.toko ?? 0;
        wsData.push([
            i + 1,
            p.name || '-',
            p.barcode || '-',
            p.price ?? 0,
            gudang,
            toko,
            gudang + toko,
            getStockStatus(gudang, toko),
        ]);
    });

    // Summary footer
    wsData.push([]);
    wsData.push([
        '',
        'TOTAL',
        '',
        '',
        totalGudang,
        totalToko,
        totalGudang + totalToko,
        '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge title cell
    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Date
    ];

    // Column widths
    ws['!cols'] = [
        { wch: 5 },   // No
        { wch: 35 },  // Nama
        { wch: 18 },  // Barcode
        { wch: 15 },  // Harga
        { wch: 14 },  // Gudang
        { wch: 12 },  // Toko
        { wch: 12 },  // Total
        { wch: 10 },  // Status
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Produk');

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan_stok_produk_${formatDate(now)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
