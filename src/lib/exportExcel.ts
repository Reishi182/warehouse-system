import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  format?: 'currency' | 'date' | 'number' | 'text' | 'percent';
}

function formatValue(value: unknown, format?: ExcelColumn['format']): unknown {
  if (value === null || value === undefined) return '';
  switch (format) {
    case 'currency':
      return typeof value === 'number' ? value : Number(value) || 0;
    case 'number':
      return typeof value === 'number' ? value : Number(value) || 0;
    case 'percent':
      return typeof value === 'number' ? `${value.toFixed(1)}%` : value;
    case 'date':
      if (!value) return '';
      try {
        const d = new Date(value as string);
        return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
      } catch { return String(value); }
    default:
      return String(value);
  }
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExcelColumn[],
  filename: string,
  sheetName = 'Data',
  metadata?: { title?: string; period?: string; printedAt?: string }
) {
  const wb = XLSX.utils.book_new();

  // Build header row
  const headerRow = columns.map(c => c.header);

  // Build data rows
  const dataRows = data.map(row =>
    columns.map(col => formatValue(getNestedValue(row, col.key), col.format))
  );

  // Combine
  const sheetData: unknown[][] = [headerRow, ...dataRows];

  // If metadata exists, prepend it
  const finalData: unknown[][] = [];
  if (metadata?.title) finalData.push([metadata.title]);
  if (metadata?.period) finalData.push([`Periode: ${metadata.period}`]);
  if (metadata?.printedAt) finalData.push([`Dicetak: ${metadata.printedAt}`]);
  if (metadata?.title || metadata?.period || metadata?.printedAt) finalData.push([]);
  finalData.push(...sheetData);

  const ws = XLSX.utils.aoa_to_sheet(finalData);

  // Column widths
  const metaOffset = finalData.length - sheetData.length;
  const headerRowIdx = metaOffset;

  // Set column widths
  ws['!cols'] = columns.map(col => ({ wch: col.width || 20 }));

  // Style header row (bold)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; C++) {
    const headerCell = XLSX.utils.encode_cell({ r: headerRowIdx, c: C });
    if (ws[headerCell]) {
      ws[headerCell].s = {
        font: { bold: true, sz: 11 },
        fill: { fgColor: { rgb: '4F46E5' }, patternType: 'solid' },
        alignment: { horizontal: 'center' },
      };
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const safeFilename = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  XLSX.writeFile(wb, `${safeFilename}.xlsx`);
}

// Helper to get nested value like 'supplier.name'
function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
}

// Convenience: format Rupiah for display in cells
export function rpCell(value: number): string {
  return `Rp ${value.toLocaleString('id-ID')}`;
}

// Convenience: format date Indonesia
export function dateId(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch { return dateStr; }
}
