import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { DateInput } from '@/components/common/DatePicker';
import { exportToPDF, exportToExcelWithColumns, ExportColumn } from '@/lib/export';

interface ExportButtonProps<T> {
    data: T[];
    columns: ExportColumn[];
    filename: string;
    title?: string;
    subtitle?: string;
    disabled?: boolean;
    /** If provided, enables a date range filter dialog before exporting. 
     *  The accessor key should point to a date/datetime string field on data items. */
    dateFilterAccessor?: string;
}

function formatDateLabel(dateStr: string): string {
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

export function ExportButton<T extends object>({
    data,
    columns,
    filename,
    title,
    subtitle,
    disabled = false,
    dateFilterAccessor,
}: ExportButtonProps<T>) {
    const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
    const [pendingExportType, setPendingExportType] = useState<'pdf' | 'excel' | null>(null);
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const filterData = (dataToFilter: T[]): T[] => {
        if (!dateFilterAccessor || (!filterStartDate && !filterEndDate)) return dataToFilter;

        return dataToFilter.filter(item => {
            const dateValue = String((item as any)[dateFilterAccessor] ?? '');
            // Normalize to YYYY-MM-DD for comparison
            const dateOnly = dateValue.slice(0, 10);
            if (filterStartDate && dateOnly < filterStartDate) return false;
            if (filterEndDate && dateOnly > filterEndDate) return false;
            return true;
        });
    };

    const getSubtitle = (): string => {
        if (filterStartDate && filterEndDate) {
            return `Periode: ${formatDateLabel(filterStartDate)} - ${formatDateLabel(filterEndDate)}`;
        }
        if (filterStartDate) {
            return `Dari: ${formatDateLabel(filterStartDate)}`;
        }
        if (filterEndDate) {
            return `Sampai: ${formatDateLabel(filterEndDate)}`;
        }
        return subtitle || `Exported on ${new Date().toLocaleDateString('id-ID')}`;
    };

    const doExport = (type: 'pdf' | 'excel') => {
        const filteredData = filterData(data);
        const exportSubtitle = getSubtitle();
        const dateSuffix = filterStartDate && filterEndDate
            ? `_${filterStartDate}_to_${filterEndDate}`
            : '';

        if (type === 'pdf') {
            exportToPDF(filteredData, columns, `${filename}${dateSuffix}`, { title, subtitle: exportSubtitle });
        } else {
            exportToExcelWithColumns(filteredData, columns, `${filename}${dateSuffix}`);
        }
    };

    const handleExportClick = (type: 'pdf' | 'excel') => {
        if (dateFilterAccessor) {
            setPendingExportType(type);
            setIsFilterDialogOpen(true);
        } else {
            doExport(type);
        }
    };

    const handleConfirmExport = () => {
        if (pendingExportType) {
            doExport(pendingExportType);
        }
        setIsFilterDialogOpen(false);
        setPendingExportType(null);
    };

    const handleExportAll = () => {
        // Reset date filters and export all
        setFilterStartDate('');
        setFilterEndDate('');
        if (pendingExportType) {
            const exportSubtitle = subtitle || `Exported on ${new Date().toLocaleDateString('id-ID')}`;
            if (pendingExportType === 'pdf') {
                exportToPDF(data, columns, filename, { title, subtitle: exportSubtitle });
            } else {
                exportToExcelWithColumns(data, columns, filename);
            }
        }
        setIsFilterDialogOpen(false);
        setPendingExportType(null);
    };

    const filteredCount = filterData(data).length;

    return (
        <>
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
                        onClick={() => handleExportClick('pdf')}
                        className="rounded-lg cursor-pointer"
                    >
                        <FileText className="w-4 h-4 mr-2 text-red-500" />
                        Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => handleExportClick('excel')}
                        className="rounded-lg cursor-pointer"
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                        Export as Excel
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Date Range Filter Dialog */}
            <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            Filter Tanggal Export
                        </DialogTitle>
                        <DialogDescription>
                            Pilih rentang tanggal untuk data yang akan di-export. Kosongkan untuk export semua data.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Dari Tanggal</Label>
                                <DateInput
                                    value={filterStartDate}
                                    onChange={setFilterStartDate}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Sampai Tanggal</Label>
                                <DateInput
                                    value={filterEndDate}
                                    onChange={setFilterEndDate}
                                />
                            </div>
                        </div>

                        {(filterStartDate || filterEndDate) && (
                            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 text-sm">
                                <span className="text-muted-foreground">Data yang akan di-export:</span>
                                <span className="font-semibold text-primary">{filteredCount} data</span>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex gap-2 sm:gap-2">
                        <Button
                            variant="outline"
                            onClick={handleExportAll}
                            className="rounded-xl"
                        >
                            Export Semua ({data.length})
                        </Button>
                        <Button
                            onClick={handleConfirmExport}
                            className="rounded-xl"
                            disabled={filteredCount === 0 && (!!filterStartDate || !!filterEndDate)}
                        >
                            {pendingExportType === 'pdf' ? (
                                <FileText className="w-4 h-4 mr-1.5" />
                            ) : (
                                <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                            )}
                            Export {filterStartDate || filterEndDate ? `(${filteredCount})` : 'Semua'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
