"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export interface SearchableSelectOption {
    value: string;
    label: string;
    description?: string;
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value?: string;
    onValueChange: (value: string, option?: SearchableSelectOption) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    className?: string;
}

/** Generate a consistent hue from a string */
function stringToHue(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
}

export function SearchableSelect({
    options,
    value,
    onValueChange,
    placeholder = "Pilih...",
    searchPlaceholder = "Cari...",
    emptyMessage = "Tidak ditemukan.",
    disabled = false,
    className,
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Auto-focus search when opened
    React.useEffect(() => {
        if (open && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 80);
        }
        if (!open) setSearch("");
    }, [open]);

    // Sort & filter options
    const filteredOptions = React.useMemo(() => {
        const sorted = [...options].sort((a, b) =>
            a.label.localeCompare(b.label, "id")
        );
        const q = search.toLowerCase().trim();
        if (!q) return sorted;
        return sorted.filter(
            (o) =>
                o.label.toLowerCase().includes(q) ||
                (o.description || "").toLowerCase().includes(q)
        );
    }, [options, search]);

    const selectedOption = options.find((opt) => opt.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between font-normal h-10 px-3",
                        "border border-input bg-background",
                        "hover:bg-accent/50 hover:border-primary/40",
                        "transition-all duration-200",
                        open && "border-primary/60 ring-2 ring-primary/10",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {selectedOption ? (
                            <>
                                <span
                                    className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white shrink-0"
                                    style={{
                                        background: `hsl(${stringToHue(selectedOption.label)}, 65%, 50%)`,
                                    }}
                                >
                                    {selectedOption.label[0].toUpperCase()}
                                </span>
                                <span className="truncate text-sm font-medium text-foreground">
                                    {selectedOption.label}
                                </span>
                            </>
                        ) : (
                            <span className="text-sm">{placeholder}</span>
                        )}
                    </div>
                    <ChevronsUpDown
                        className={cn(
                            "ml-2 h-4 w-4 shrink-0 transition-transform duration-200",
                            open ? "rotate-180 text-primary" : "opacity-40"
                        )}
                    />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className={cn(
                    "w-[--radix-popover-trigger-width]",
                    "p-0 shadow-xl border border-border/60 rounded-xl overflow-hidden z-[100]"
                )}
                align="start"
                sideOffset={6}
            >
                {/* ── Search bar ── */}
                <div className="relative flex items-center border-b border-border/50 bg-muted/30 px-3 py-2.5 gap-2">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                        ref={inputRef}
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border-0 bg-transparent focus-visible:ring-0 p-0 h-7 text-sm placeholder:text-muted-foreground/60"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors bg-muted rounded px-1.5 py-0.5 shrink-0"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* ── Options list ── */}
                <div
                    className="overflow-y-auto"
                    style={{ maxHeight: 300 }}
                    onWheel={(e) => e.stopPropagation()}
                >
                    {filteredOptions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-1.5">
                            <p className="text-sm font-medium">{emptyMessage}</p>
                            {search && (
                                <p className="text-xs opacity-60">Coba kata kunci lain</p>
                            )}
                        </div>
                    ) : (
                        <div className="p-1.5 space-y-0.5">
                            {filteredOptions.map((option) => {
                                const isSelected = value === option.value;
                                const hue = stringToHue(option.label);

                                return (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            onValueChange(option.value, option);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            "group flex items-center w-full px-2.5 py-2 rounded-lg text-left",
                                            "transition-all duration-150 outline-none",
                                            isSelected
                                                ? "bg-primary/10 ring-1 ring-primary/30"
                                                : "hover:bg-accent/60"
                                        )}
                                    >
                                        {/* Color avatar */}
                                        <span
                                            className={cn(
                                                "inline-flex items-center justify-center w-7 h-7 rounded-lg",
                                                "text-xs font-bold text-white shrink-0 mr-2.5",
                                                "transition-transform duration-150",
                                                isSelected && "scale-95"
                                            )}
                                            style={{ background: `hsl(${hue}, 60%, 48%)` }}
                                        >
                                            {option.label[0].toUpperCase()}
                                        </span>

                                        {/* Label + description */}
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className={cn(
                                                    "text-sm font-medium truncate leading-tight",
                                                    isSelected
                                                        ? "text-primary"
                                                        : "text-foreground"
                                                )}
                                            >
                                                {option.label}
                                            </p>
                                            {option.description && (
                                                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                    {option.description}
                                                </p>
                                            )}
                                        </div>

                                        <Check
                                            className={cn(
                                                "ml-2 h-4 w-4 shrink-0 text-primary transition-opacity duration-150",
                                                isSelected ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">
                        {search
                            ? `${filteredOptions.length} hasil untuk "${search}"`
                            : `${filteredOptions.length} pilihan`}
                    </span>
                    {value && (
                        <button
                            onClick={() => { onValueChange(""); setOpen(false); }}
                            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                        >
                            Hapus pilihan
                        </button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export default SearchableSelect;
