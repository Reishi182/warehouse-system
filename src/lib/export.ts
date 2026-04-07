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

// Lazy load ExcelJS
async function loadExcelJS() {
    const ExcelJS = await import('exceljs');
    return ExcelJS;
}

// Lazy load XLSX (legacy support only)
async function loadXLSXLibrary() {
    const XLSX = await import('xlsx');
    return XLSX;
}

// ==========================================
// SHARED EXCEL STYLING HELPERS
// ==========================================

const BRAND_BLUE = 'FF2980B9';
const DARK_BLUE = 'FF2C3E50';
const LIGHT_BG = 'FFF5F7FA';
const WHITE = 'FFFFFFFF';

function applyTitleRow(ws: any, row: any, colCount: number) {
    ws.mergeCells(row.number, 1, row.number, colCount);
    const cell = row.getCell(1);
    cell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND_BLUE } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    row.height = 36;
}

function applySubtitleRow(ws: any, row: any, colCount: number) {
    ws.mergeCells(row.number, 1, row.number, colCount);
    const cell = row.getCell(1);
    cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: WHITE } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3498DB' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    row.height = 22;
}

function applyHeaderRow(row: any, colCount: number) {
    row.height = 24;
    for (let c = 1; c <= colCount; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FF1A252F' } },
            bottom: { style: 'thin', color: { argb: 'FF1A252F' } },
            left: { style: 'thin', color: { argb: 'FF1A252F' } },
            right: { style: 'thin', color: { argb: 'FF1A252F' } },
        };
    }
}

function applyDataRow(row: any, colCount: number, isAlternate: boolean) {
    const bgColor = isAlternate ? LIGHT_BG : WHITE;
    for (let c = 1; c <= colCount; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Calibri', size: 9 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.alignment = { vertical: 'middle' };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
    }
}

async function downloadExcelWorkbook(wb: any, filename: string) {
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==========================================
// GENERIC PDF EXPORT - PREMIUM DESIGN
// ==========================================

export async function exportToPDF<T extends object>(
    data: T[],
    columns: ExportColumn[],
    filename: string,
    config?: { title?: string; subtitle?: string }
) {
    const { jsPDF, autoTable } = await loadPDFLibraries();
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.width;
    const now = new Date();

    // === HEADER BANNER ===
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setFillColor(30, 100, 160);
    doc.rect(0, 26, pageWidth, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(config?.title || filename.toUpperCase(), 14, 14);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(
        config?.subtitle || `Tanggal cetak: ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
        14, 22
    );

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const totalText = `${data.length} Data`;
    const tw = doc.getTextWidth(totalText) + 12;
    doc.setFillColor(255, 255, 255, 0.25);
    doc.roundedRect(pageWidth - tw - 14, 7, tw, 14, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(totalText, pageWidth - tw - 8, 17);

    // === DATA TABLE ===
    const headers = columns.map(col => col.header);
    const rows = data.map(item =>
        columns.map(col => {
            const value = (item as any)[col.accessorKey];
            if (col.format) return col.format(value, item);
            return value != null ? String(value) : '-';
        })
    );

    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 34,
        styles: { fontSize: 8, cellPadding: 3, lineWidth: 0.1, lineColor: [220, 220, 220] },
        headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
        bodyStyles: { textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 14, right: 14 },
    });

    // === FOOTER ===
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageH = doc.internal.pageSize.height;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(14, pageH - 14, pageWidth - 14, pageH - 14);
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        doc.setFont('helvetica', 'italic');
        doc.text(`Dicetak: ${now.toLocaleString('id-ID')}`, 14, pageH - 8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, pageH - 8, { align: 'right' });
    }

    doc.save(`${filename}.pdf`);
}

// ==========================================
// GENERIC EXCEL EXPORT - PREMIUM DESIGN (ExcelJS)
// ==========================================

export async function exportToExcelWithColumns<T extends object>(
    data: T[],
    columns: ExportColumn[],
    filename: string,
    sheetName = 'Data'
) {
    const ExcelJS = await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheetName);
    const now = new Date();
    const colCount = columns.length;

    // Title row
    const titleText = filename.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).toUpperCase();
    const titleRow = ws.addRow([titleText]);
    applyTitleRow(ws, titleRow, colCount);

    // Subtitle row
    const subText = `Tanggal: ${now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}  |  Total: ${data.length} data`;
    const subRow = ws.addRow([subText]);
    applySubtitleRow(ws, subRow, colCount);

    // Empty spacer
    ws.addRow([]);

    // Column headers
    const headers = columns.map(col => col.header);
    const headerRow = ws.addRow(headers);
    applyHeaderRow(headerRow, colCount);

    // Data rows
    data.forEach((item, idx) => {
        const rowData = columns.map(col => {
            const value = (item as any)[col.accessorKey];
            return col.format ? col.format(value, item) : (value ?? '-');
        });
        const row = ws.addRow(rowData);
        applyDataRow(row, colCount, idx % 2 === 1);
    });

    // Auto-fit column widths
    const maxWidths: number[] = headers.map(h => h.length);
    data.forEach(item => {
        columns.forEach((col, i) => {
            const value = (item as any)[col.accessorKey];
            const formatted = col.format ? col.format(value, item) : String(value ?? '-');
            maxWidths[i] = Math.max(maxWidths[i], formatted.length);
        });
    });
    ws.columns.forEach((col, i) => {
        if (i < maxWidths.length) {
            col.width = Math.min(maxWidths[i] + 4, 50);
        }
    });

    await downloadExcelWorkbook(wb, filename);
}

// ==========================================
// LEGACY EXCEL EXPORT (basic, for old functions)
// ==========================================

export async function exportToExcel<T extends object>(
    data: T[],
    filename: string,
    sheetName = 'Data'
) {
    const XLSX = await loadXLSXLibrary();

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

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

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==========================================
// LEGACY EXPORT FUNCTIONS (unchanged)
// ==========================================

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

export async function exportSuratJalan(suratJalans: any[]) {
    const data = suratJalans.map(s => ({
        'Nomor': s.number,
        'Tanggal': formatDateTime(s.created_at),
        'Jumlah Item': s.items?.length || 0,
        'Status': statusLabel(s.status),
    }));
    await exportToExcel(data, `surat_jalan_${formatDate(new Date())}`, 'Surat Jalan');
}

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
        case 'Aman': return [39, 174, 96];
        case 'Rendah': return [243, 156, 18];
        case 'Habis': return [231, 76, 60];
        default: return [100, 100, 100];
    }
}

function getStatusARGB(status: string): string {
    switch (status) {
        case 'Aman': return 'FF27AE60';
        case 'Rendah': return 'FFF39C12';
        case 'Habis': return 'FFE74C3C';
        default: return 'FF646464';
    }
}

/**
 * Premium PDF Export for Product Stock
 */
export async function exportProductStockPDF(products: any[], asOfDate?: string) {
    const { jsPDF, autoTable } = await loadPDFLibraries();
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.width;
    const now = new Date();

    // Format the historical date for display
    const isHistorical = !!asOfDate;
    const displayDate = isHistorical
        ? new Date(asOfDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // === HEADER BANNER ===
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setFillColor(30, 100, 160);
    doc.rect(0, 30, pageWidth, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(isHistorical ? 'LAPORAN STOK PRODUK (HISTORIS)' : 'LAPORAN STOK PRODUK', 14, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
        isHistorical
            ? `Stok per tanggal: ${displayDate}  |  Dicetak: ${now.toLocaleDateString('id-ID')}`
            : `Tanggal cetak: ${displayDate}`,
        14, 25
    );

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const totalText = `${products.length} Produk`;
    const tw2 = doc.getTextWidth(totalText) + 12;
    doc.setFillColor(255, 255, 255, 0.3);
    doc.roundedRect(pageWidth - tw2 - 14, 9, tw2, 14, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(totalText, pageWidth - tw2 - 8, 19);

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
        doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
        doc.roundedRect(x, boxY, boxW, boxH, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(stat.value, x + boxW / 2, boxY + 9, { align: 'center' });
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
            (i + 1).toString(), p.name || '-', p.barcode || '-',
            (p.price ?? 0).toLocaleString('id-ID'),
            gudang.toString(), toko.toString(), (gudang + toko).toString(),
            getStockStatus(gudang, toko),
        ];
    });

    autoTable(doc, {
        head: [headers],
        body: rows,
        startY: boxY + boxH + 8,
        styles: { fontSize: 8, cellPadding: 3, lineWidth: 0.1, lineColor: [220, 220, 220] },
        headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8, halign: 'center' },
        bodyStyles: { textColor: [50, 50, 50] },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            2: { cellWidth: 35, halign: 'center' },
            3: { halign: 'right', cellWidth: 28 },
            4: { halign: 'center', cellWidth: 24 },
            5: { halign: 'center', cellWidth: 22 },
            6: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
            7: { halign: 'center', cellWidth: 22 },
        },
        didParseCell: function (data: any) {
            if (data.section === 'body' && data.column.index === 7) {
                const status = data.cell.raw as string;
                const color = getStatusColor(status);
                data.cell.styles.textColor = [255, 255, 255];
                data.cell.styles.fillColor = color;
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 7;
            }
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
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        doc.line(14, pageH - 14, pageWidth - 14, pageH - 14);
        doc.setFontSize(7);
        doc.setTextColor(130, 130, 130);
        doc.setFont('helvetica', 'italic');
        doc.text(`Dicetak: ${now.toLocaleString('id-ID')}`, 14, pageH - 8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, pageH - 8, { align: 'right' });
    }

    doc.save(`laporan_stok_produk_${isHistorical ? asOfDate : formatDate(now)}.pdf`);
}

/**
 * Premium Excel Export for Product Stock - STYLED WITH EXCELJS
 */
export async function exportProductStockExcel(products: any[], asOfDate?: string) {
    const ExcelJS = await loadExcelJS();
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Stok Produk');
    const now = new Date();
    const colCount = 8;

    const isHistorical = !!asOfDate;
    const displayDate = isHistorical
        ? new Date(asOfDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const totalGudang = products.reduce((acc: number, p: any) => acc + (p.stock?.gudang ?? 0), 0);
    const totalToko = products.reduce((acc: number, p: any) => acc + (p.stock?.toko ?? 0), 0);

    // Row 1: Title
    const titleRow = ws.addRow([isHistorical ? 'LAPORAN STOK PRODUK (HISTORIS)' : 'LAPORAN STOK PRODUK']);
    applyTitleRow(ws, titleRow, colCount);

    // Row 2: Date
    const subText = isHistorical
        ? `Stok per tanggal: ${displayDate}  |  Dicetak: ${now.toLocaleDateString('id-ID')}`
        : `Tanggal: ${displayDate}`;
    const subRow = ws.addRow([subText]);
    applySubtitleRow(ws, subRow, colCount);

    // Row 3: Empty
    ws.addRow([]);

    // Row 4: Summary stats
    const summaryRow = ws.addRow([
        `Total Produk: ${products.length}`, '', '',
        `Stok Gudang: ${totalGudang.toLocaleString('id-ID')}`, '',
        `Stok Toko: ${totalToko.toLocaleString('id-ID')}`, '',
        `Total: ${(totalGudang + totalToko).toLocaleString('id-ID')}`,
    ]);
    for (let c = 1; c <= colCount; c++) {
        const cell = summaryRow.getCell(c);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF2C3E50' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAF2F8' } };
        cell.border = {
            top: { style: 'thin', color: { argb: 'FFB0C4DE' } },
            bottom: { style: 'thin', color: { argb: 'FFB0C4DE' } },
            left: { style: 'thin', color: { argb: 'FFB0C4DE' } },
            right: { style: 'thin', color: { argb: 'FFB0C4DE' } },
        };
    }
    summaryRow.height = 22;

    // Row 5: Empty
    ws.addRow([]);

    // Row 6: Column headers
    const headers = ['No', 'Nama Produk', 'Barcode', 'Harga (Rp)', 'Stok Gudang', 'Stok Toko', 'Total Stok', 'Status'];
    const headerRow = ws.addRow(headers);
    applyHeaderRow(headerRow, colCount);

    // Data rows
    products.forEach((p: any, idx: number) => {
        const gudang = p.stock?.gudang ?? 0;
        const toko = p.stock?.toko ?? 0;
        const status = getStockStatus(gudang, toko);
        const row = ws.addRow([
            idx + 1, p.name || '-', p.barcode || '-', p.price ?? 0,
            gudang, toko, gudang + toko, status,
        ]);
        applyDataRow(row, colCount, idx % 2 === 1);

        // Color-code status cell
        const statusCell = row.getCell(8);
        statusCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: WHITE } };
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: getStatusARGB(status) } };
        statusCell.alignment = { horizontal: 'center', vertical: 'middle' };

        // Highlight zero stock
        if (gudang <= 0) {
            row.getCell(5).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFE74C3C' } };
        }
        if (toko <= 0) {
            row.getCell(6).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFE74C3C' } };
        }
    });

    // Total row
    ws.addRow([]);
    const totalRow = ws.addRow(['', 'TOTAL', '', '', totalGudang, totalToko, totalGudang + totalToko, '']);
    for (let c = 1; c <= colCount; c++) {
        const cell = totalRow.getCell(c);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BLUE } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
            top: { style: 'medium', color: { argb: 'FF1A252F' } },
            bottom: { style: 'medium', color: { argb: 'FF1A252F' } },
            left: { style: 'thin', color: { argb: 'FF1A252F' } },
            right: { style: 'thin', color: { argb: 'FF1A252F' } },
        };
    }
    totalRow.height = 24;

    // Column widths
    ws.columns = [
        { width: 6 },   // No
        { width: 38 },  // Nama
        { width: 20 },  // Barcode
        { width: 16 },  // Harga
        { width: 14 },  // Gudang
        { width: 13 },  // Toko
        { width: 13 },  // Total
        { width: 12 },  // Status
    ];

    await downloadExcelWorkbook(wb, `laporan_stok_produk_${isHistorical ? asOfDate : formatDate(now)}`);
}
