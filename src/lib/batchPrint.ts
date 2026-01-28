/**
 * Batch Print Utility
 * Utility functions for printing multiple documents at once
 */

interface PrintableDocument {
    id: string;
    type: 'receipt' | 'surat_jalan' | 'invoice' | 'report';
    title: string;
    content: HTMLElement | string;
}

interface BatchPrintOptions {
    pageBreak?: boolean;
    orientation?: 'portrait' | 'landscape';
    paperSize?: 'a4' | 'letter' | 'thermal';
    margin?: string;
}

/**
 * Print multiple documents in batch
 */
export function batchPrint(
    documents: PrintableDocument[],
    options: BatchPrintOptions = {}
): void {
    const {
        pageBreak = true,
        orientation = 'portrait',
        paperSize = 'a4',
        margin = '10mm',
    } = options;

    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Pop-up blocked. Please allow pop-ups for this site.');
        return;
    }

    // Get paper size CSS
    const getPaperSize = () => {
        switch (paperSize) {
            case 'thermal':
                return 'width: 80mm;';
            case 'letter':
                return '@page { size: letter; }';
            default:
                return '@page { size: A4; }';
        }
    };

    // Build HTML content
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print - ${documents.length} dokumen</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        ${getPaperSize()}
        
        @page {
          margin: ${margin};
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 12pt;
          line-height: 1.4;
        }
        
        .document {
          ${pageBreak ? 'page-break-after: always;' : ''}
        }
        
        .document:last-child {
          page-break-after: auto;
        }
        
        .document-header {
          text-align: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ddd;
        }
        
        .document-title {
          font-size: 14pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .document-id {
          font-size: 10pt;
          color: #666;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0;
        }
        
        th, td {
          padding: 6px 8px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        
        th {
          background: #f5f5f5;
          font-weight: 600;
        }
        
        .text-right {
          text-align: right;
        }
        
        .text-center {
          text-align: center;
        }
        
        .total-row {
          font-weight: bold;
          border-top: 2px solid #333;
        }
        
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      ${documents.map((doc, index) => `
        <div class="document" data-document-id="${doc.id}">
          <div class="document-header">
            <div class="document-title">${doc.title}</div>
            <div class="document-id">${doc.type.toUpperCase()} #${index + 1}</div>
          </div>
          <div class="document-content">
            ${typeof doc.content === 'string' ? doc.content : doc.content.outerHTML}
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 100);
    };
}

/**
 * Print single element by ID
 */
export function printElement(elementId: string, title?: string): void {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with ID "${elementId}" not found`);
        return;
    }

    batchPrint([{
        id: elementId,
        type: 'report',
        title: title || 'Print',
        content: element.cloneNode(true) as HTMLElement,
    }]);
}

/**
 * Print HTML string
 */
export function printHTML(htmlContent: string, title: string = 'Print'): void {
    batchPrint([{
        id: 'print-content',
        type: 'report',
        title,
        content: htmlContent,
    }]);
}

/**
 * Generate receipt HTML for printing
 */
export function generateReceiptHTML(data: {
    storeNme?: string;
    storAddress?: string;
    receiptNumber: string;
    date: string;
    cashier: string;
    items: Array<{
        name: string;
        qty: number;
        price: number;
        discount?: number;
        total: number;
    }>;
    subtotal: number;
    discount?: number;
    total: number;
    paid: number;
    change: number;
    paymentMethod: string;
}): string {
    return `
    <div style="font-family: monospace; font-size: 11pt; max-width: 80mm;">
      <div style="text-align: center; margin-bottom: 10px;">
        <div style="font-weight: bold; font-size: 14pt;">${data.storeNme || 'VMB Store'}</div>
        <div style="font-size: 9pt;">${data.storAddress || ''}</div>
      </div>
      
      <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
      
      <div style="margin-bottom: 10px;">
        <div>No: ${data.receiptNumber}</div>
        <div>Tanggal: ${data.date}</div>
        <div>Kasir: ${data.cashier}</div>
      </div>
      
      <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 10pt;">
        ${data.items.map(item => `
          <tr>
            <td colspan="3">${item.name}</td>
          </tr>
          <tr>
            <td>${item.qty} x ${item.price.toLocaleString('id-ID')}</td>
            <td>${item.discount ? `-${item.discount.toLocaleString('id-ID')}` : ''}</td>
            <td style="text-align: right;">${item.total.toLocaleString('id-ID')}</td>
          </tr>
        `).join('')}
      </table>
      
      <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
      
      <table style="width: 100%; font-size: 10pt;">
        <tr>
          <td>Subtotal</td>
          <td style="text-align: right;">${data.subtotal.toLocaleString('id-ID')}</td>
        </tr>
        ${data.discount ? `
          <tr>
            <td>Diskon</td>
            <td style="text-align: right;">-${data.discount.toLocaleString('id-ID')}</td>
          </tr>
        ` : ''}
        <tr style="font-weight: bold;">
          <td>TOTAL</td>
          <td style="text-align: right;">${data.total.toLocaleString('id-ID')}</td>
        </tr>
        <tr>
          <td>Bayar (${data.paymentMethod})</td>
          <td style="text-align: right;">${data.paid.toLocaleString('id-ID')}</td>
        </tr>
        <tr>
          <td>Kembali</td>
          <td style="text-align: right;">${data.change.toLocaleString('id-ID')}</td>
        </tr>
      </table>
      
      <div style="text-align: center; margin-top: 15px; font-size: 9pt;">
        <div>Terima kasih atas kunjungan Anda</div>
        <div>Barang yang sudah dibeli tidak dapat ditukar</div>
      </div>
    </div>
  `;
}

export default batchPrint;
