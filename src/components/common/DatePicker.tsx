import * as React from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps {
    date: Date | undefined;
    onDateChange: (date: Date | undefined) => void;
    placeholder?: string;
    /** If true, future dates cannot be selected (only today and past) */
    disableFuture?: boolean;
    /** If true, past dates cannot be selected (only today and future) */
    disablePast?: boolean;
    /** Custom disabled days matcher */
    disabled?: (date: Date) => boolean;
    /** Display format for the selected date */
    dateFormat?: string;
    className?: string;
}

export function DatePicker({
    date,
    onDateChange,
    placeholder = "Pilih tanggal",
    disableFuture = false,
    disablePast = false,
    disabled,
    dateFormat = "dd MMMM yyyy",
    className,
}: DatePickerProps) {
    const [open, setOpen] = React.useState(false);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create disabled matcher
    const disabledMatcher = React.useMemo(() => {
        const matchers: ((date: Date) => boolean)[] = [];

        if (disableFuture) {
            matchers.push((d: Date) => {
                const checkDate = new Date(d);
                checkDate.setHours(0, 0, 0, 0);
                return checkDate > today;
            });
        }

        if (disablePast) {
            matchers.push((d: Date) => {
                const checkDate = new Date(d);
                checkDate.setHours(0, 0, 0, 0);
                return checkDate < today;
            });
        }

        if (disabled) {
            matchers.push(disabled);
        }

        return (d: Date) => matchers.some(m => m(d));
    }, [disableFuture, disablePast, disabled, today]);

    const handleSelect = (newDate: Date | undefined) => {
        onDateChange(newDate);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-between text-left font-normal group",
                        "bg-background hover:bg-accent/50",
                        "border-input hover:border-primary/50",
                        "transition-all duration-200",
                        "rounded-xl h-11",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">
                            {date ? format(date, dateFormat, { locale: id }) : placeholder}
                        </span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-2" align="start">
                <div className="p-1">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={handleSelect}
                        disabled={disabledMatcher}
                        initialFocus
                        locale={id}
                        className="rounded-xl"
                        classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                            month: "space-y-4",
                            caption: "flex justify-center pt-1 relative items-center px-8",
                            caption_label: "text-sm font-semibold",
                            nav: "space-x-1 flex items-center",
                            nav_button: cn(
                                "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100",
                                "rounded-lg hover:bg-accent transition-colors",
                                "inline-flex items-center justify-center"
                            ),
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            table: "w-full border-collapse",
                            head_row: "flex",
                            head_cell: "text-muted-foreground rounded-md w-10 font-medium text-[0.8rem] py-2",
                            row: "flex w-full mt-1",
                            cell: cn(
                                "relative h-10 w-10 text-center text-sm p-0",
                                "focus-within:relative focus-within:z-20",
                                "[&:has([aria-selected])]:bg-primary/10 [&:has([aria-selected])]:rounded-lg"
                            ),
                            day: cn(
                                "h-10 w-10 p-0 font-normal",
                                "rounded-lg transition-all duration-150",
                                "hover:bg-accent hover:text-accent-foreground",
                                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                "aria-selected:opacity-100"
                            ),
                            day_selected: cn(
                                "bg-primary text-primary-foreground",
                                "hover:bg-primary hover:text-primary-foreground",
                                "focus:bg-primary focus:text-primary-foreground",
                                "shadow-md"
                            ),
                            day_today: "bg-accent text-accent-foreground font-semibold",
                            day_outside: "text-muted-foreground opacity-30",
                            day_disabled: "text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent",
                            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                            day_hidden: "invisible",
                        }}
                    />
                </div>

                {/* Quick actions footer */}
                <div className="border-t p-2 flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs rounded-lg"
                        onClick={() => handleSelect(new Date())}
                        disabled={disableFuture && today > new Date()}
                    >
                        Hari Ini
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-xs rounded-lg"
                        onClick={() => {
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            handleSelect(yesterday);
                        }}
                    >
                        Kemarin
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs rounded-lg text-muted-foreground"
                        onClick={() => handleSelect(undefined)}
                    >
                        Hapus
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

// Simple date input version (ISO string based)
export interface DateInputProps {
    value: string; // ISO date string (YYYY-MM-DD)
    onChange: (value: string) => void;
    placeholder?: string;
    disableFuture?: boolean;
    disablePast?: boolean;
    className?: string;
}

export function DateInput({
    value,
    onChange,
    placeholder = "Pilih tanggal",
    disableFuture = false,
    disablePast = false,
    className,
}: DateInputProps) {
    const date = value ? new Date(value + "T00:00:00") : undefined;

    const handleDateChange = (newDate: Date | undefined) => {
        if (newDate) {
            const yyyy = newDate.getFullYear();
            const mm = String(newDate.getMonth() + 1).padStart(2, "0");
            const dd = String(newDate.getDate()).padStart(2, "0");
            onChange(`${yyyy}-${mm}-${dd}`);
        } else {
            onChange("");
        }
    };

    return (
        <DatePicker
            date={date}
            onDateChange={handleDateChange}
            placeholder={placeholder}
            disableFuture={disableFuture}
            disablePast={disablePast}
            className={className}
        />
    );
}
