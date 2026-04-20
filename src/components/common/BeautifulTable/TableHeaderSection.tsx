import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExportButton } from '../ExportButton';
import { cn } from '@/lib/utils';

interface TableHeaderSectionProps<T> {
    title?: string;
    subtitle?: string;
    totalFiltered: number;
    isPremium: boolean;
    hideExport: boolean;
    onAdd?: () => void;
    addButtonLabel: string;
    exportData: T[];
    exportColumns: { header: string; accessorKey: string; format?: (value: any, row?: T) => string }[];
    exportFilename?: string;
    exportTitle?: string;
    exportDateFilterAccessor?: string;
}

export function TableHeaderSection<T>({
    title,
    subtitle,
    totalFiltered,
    isPremium,
    hideExport,
    onAdd,
    addButtonLabel,
    exportData,
    exportColumns,
    exportFilename,
    exportTitle,
    exportDateFilterAccessor,
}: TableHeaderSectionProps<T>) {
    if (!title && hideExport && !onAdd) return null;

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 pb-4 gap-4 relative">
            <div>
                {title && (
                    <div className="flex items-center gap-3">
                        {isPremium && (
                            <div className="p-2 rounded-xl bg-primary/10">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                        )}
                        <div>
                            <h2 className={cn(
                                "font-bold text-foreground",
                                isPremium ? "text-xl" : "text-lg"
                            )}>
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
                            )}
                        </div>
                        <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold",
                            isPremium
                                ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary"
                                : "bg-primary/10 text-primary"
                        )}>
                            {totalFiltered} Total
                        </span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                {!hideExport && (
                    <ExportButton
                        data={exportData}
                        columns={exportColumns}
                        filename={exportFilename || title?.toLowerCase().replace(/\s+/g, '_') || 'export'}
                        title={exportTitle || title}
                        subtitle={`Exported on ${new Date().toLocaleDateString('id-ID')}`}
                        dateFilterAccessor={exportDateFilterAccessor}
                    />
                )}
                {onAdd && (
                    <Button
                        onClick={onAdd}
                        size="sm"
                        className={cn(
                            "h-9 px-4 font-semibold",
                            isPremium
                                ? "rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
                                : "rounded-xl"
                        )}
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        {addButtonLabel}
                    </Button>
                )}
            </div>
        </div>
    );
}
