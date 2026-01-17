import React from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToPDF, exportToExcelWithColumns, ExportColumn } from '@/lib/export';

interface ExportButtonProps<T> {
    data: T[];
    columns: ExportColumn[];
    filename: string;
    title?: string;
    subtitle?: string;
    disabled?: boolean;
}

export function ExportButton<T extends object>({
    data,
    columns,
    filename,
    title,
    subtitle,
    disabled = false,
}: ExportButtonProps<T>) {
    const handleExportPDF = () => {
        exportToPDF(data, columns, filename, { title, subtitle });
    };

    const handleExportExcel = () => {
        exportToExcelWithColumns(data, columns, filename);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl h-9 px-3 font-medium"
                    disabled={disabled || data.length === 0}
                >
                    <Download className="w-4 h-4 mr-1.5" />
                    Export
                    <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem
                    onClick={handleExportPDF}
                    className="rounded-lg cursor-pointer"
                >
                    <FileText className="w-4 h-4 mr-2 text-red-500" />
                    Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={handleExportExcel}
                    className="rounded-lg cursor-pointer"
                >
                    <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                    Export as Excel
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
