import { useState, useMemo } from 'react';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { DateRange, DayPicker } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DashboardDateRange {
    from: Date;
    to: Date;
    label: string;
}

interface DashboardDateRangePickerProps {
    value: DashboardDateRange;
    onChange: (range: DashboardDateRange) => void;
}

const presets = [
    { label: 'Hari Ini', getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
    { label: '7 Hari', getRange: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
    { label: '30 Hari', getRange: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
    { label: 'Minggu Ini', getRange: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
    { label: 'Bulan Ini', getRange: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }) },
];

export function getDefaultDateRange(): DashboardDateRange {
    return {
        from: startOfDay(new Date()),
        to: endOfDay(new Date()),
        label: 'Hari Ini',
    };
}

export default function DashboardDateRangePicker({ value, onChange }: DashboardDateRangePickerProps) {
    const [open, setOpen] = useState(false);
    const [customRange, setCustomRange] = useState<DateRange | undefined>(
        value ? { from: value.from, to: value.to } : undefined
    );

    const handlePreset = (preset: typeof presets[0]) => {
        const range = preset.getRange();
        onChange({ ...range, label: preset.label });
        setOpen(false);
    };

    const handleCustomSelect = (range: DateRange | undefined) => {
        setCustomRange(range);
        if (range?.from && range?.to) {
            onChange({
                from: startOfDay(range.from),
                to: endOfDay(range.to),
                label: 'Custom',
            });
        }
    };

    const displayText = useMemo(() => {
        if (value.label !== 'Custom') return value.label;
        return `${format(value.from, 'dd MMM', { locale: localeId })} - ${format(value.to, 'dd MMM', { locale: localeId })}`;
    }, [value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                        "h-9 gap-2 rounded-xl border-border/50 bg-background/80 backdrop-blur-sm",
                        "hover:bg-muted/50 transition-all duration-200",
                        "text-sm font-medium shadow-sm"
                    )}
                >
                    <CalendarIcon className="w-4 h-4 text-primary" />
                    <span>{displayText}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl shadow-xl border-border/50" align="end">
                <div className="flex flex-col sm:flex-row">
                    {/* Presets */}
                    <div className="flex flex-row sm:flex-col gap-1 p-3 border-b sm:border-b-0 sm:border-r border-border/50 overflow-x-auto sm:overflow-x-visible">
                        <p className="hidden sm:block text-xs font-semibold text-muted-foreground mb-1 px-2">Preset</p>
                        {presets.map((preset) => (
                            <Button
                                key={preset.label}
                                variant={value.label === preset.label ? 'default' : 'ghost'}
                                size="sm"
                                className={cn(
                                    "justify-start text-xs rounded-lg whitespace-nowrap",
                                    value.label === preset.label && "shadow-sm"
                                )}
                                onClick={() => handlePreset(preset)}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>

                    {/* Calendar */}
                    <div className="p-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Custom Range</p>
                        <DayPicker
                            mode="range"
                            selected={customRange}
                            onSelect={handleCustomSelect}
                            numberOfMonths={1}
                            locale={localeId}
                            showOutsideDays
                            className="text-sm"
                            classNames={{
                                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                month: "space-y-4",
                                caption: "flex justify-center pt-1 relative items-center",
                                caption_label: "text-sm font-medium",
                                nav: "space-x-1 flex items-center",
                                nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-input hover:bg-accent hover:text-accent-foreground",
                                nav_button_previous: "absolute left-1",
                                nav_button_next: "absolute right-1",
                                table: "w-full border-collapse space-y-1",
                                head_row: "flex",
                                head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                                row: "flex w-full mt-2",
                                cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground",
                                day_range_end: "day-range-end",
                                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                                day_today: "bg-accent text-accent-foreground",
                                day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                                day_disabled: "text-muted-foreground opacity-50",
                                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                day_hidden: "invisible",
                            }}
                        />
                    </div>
                </div>

                {/* Footer with active label */}
                <div className="px-3 py-2 border-t border-border/50 bg-muted/30 rounded-b-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="rounded-full text-[10px] px-2 py-0.5">
                            {displayText}
                        </Badge>
                        <span>
                            {format(value.from, 'dd/MM/yyyy')} — {format(value.to, 'dd/MM/yyyy')}
                        </span>
                    </div>
                    {value.label === 'Custom' && (
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setOpen(false)}>
                            Selesai
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
