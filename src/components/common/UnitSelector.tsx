import React, { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Product } from '@/types';

interface UnitSelectorProps {
    product?: Partial<Product> | null;
    value: string;
    onChange: (unit: string) => void;
    className?: string;
    placeholder?: string;
    disabled?: boolean;
}

export default function UnitSelector({ product, value, onChange, className, placeholder = 'Satuan', disabled = false }: UnitSelectorProps) {

    // Extract unit data
    const hasMultiUnit = product?.has_multi_unit;
    const mainUnit = product?.main_unit || 'Box';
    const sellUnit = product?.sell_unit || 'Pcs';

    // Auto-select valid unit if current value is empty or invalid
    useEffect(() => {
        if (!product) return;
        
        let validUnits: string[] = [];
        if (hasMultiUnit) {
            validUnits = [mainUnit.toLowerCase(), sellUnit.toLowerCase()];
        } else {
            validUnits = [sellUnit.toLowerCase()];
        }

        const currentValLower = (value || '').toLowerCase();
        
        // Only enforce valid units if we actually have product data
        if (!value || !validUnits.includes(currentValLower)) {
             // Fallback to sellUnit as default if the current selection is invalid
             onChange(sellUnit);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product?.id, hasMultiUnit, mainUnit, sellUnit]);


    // If no product provided, or it's just a free-text fallback
    if (!product) {
        return (
            <Input
                type="text"
                className={className}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
            />
        );
    }

    if (hasMultiUnit) {
        return (
            <Select value={value} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger className={className}>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={mainUnit}>{mainUnit}</SelectItem>
                    <SelectItem value={sellUnit}>{sellUnit}</SelectItem>
                </SelectContent>
            </Select>
        );
    }

    // Only one unit available
    return (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value={sellUnit}>{sellUnit}</SelectItem>
            </SelectContent>
        </Select>
    );
}
