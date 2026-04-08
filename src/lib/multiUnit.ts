import { Product } from '@/types';

/**
 * Multi-unit helper utilities for products that can be sold in two different units.
 * 
 * Terminology:
 *  - sub_unit  = the smaller / base unit (e.g. pcs, kg, meter)  → stored in product.sell_unit
 *  - main_unit = the larger / packaging unit (e.g. box, sak, roll) → stored in product.main_unit
 * 
 * Stock is always stored in base unit (sub_unit). Conversion is display-only.
 */

export interface UnitBreakdown {
    mainUnits: number;   // e.g. 7 SAK
    subUnits: number;    // e.g. 13 KG
    totalSubUnits: number;
}

/**
 * Convert total sub-units to main_unit + sub_unit breakdown
 */
export function convertFromBaseUnit(totalSubUnits: number, qtyPerMainUnit: number | null | undefined): UnitBreakdown {
    if (!qtyPerMainUnit || qtyPerMainUnit <= 0) {
        return { mainUnits: 0, subUnits: totalSubUnits, totalSubUnits };
    }
    const mainUnits = Math.floor(totalSubUnits / qtyPerMainUnit);
    const subUnits = totalSubUnits % qtyPerMainUnit;
    return { mainUnits, subUnits, totalSubUnits };
}

/**
 * Convert main_unit + sub_unit to total sub-units
 */
export function convertToBaseUnit(mainUnits: number, subUnits: number, qtyPerMainUnit: number | null | undefined): number {
    if (!qtyPerMainUnit || qtyPerMainUnit <= 0) {
        return subUnits;
    }
    return (mainUnits * qtyPerMainUnit) + subUnits;
}

/**
 * Format stock display for a product.
 * Returns "7 SAK 13 KG" for multi-unit or "503 pcs" for regular products.
 */
export function formatStockDisplay(stock: number, product: Product): string {
    if (!product.has_multi_unit || !product.pcs_per_box || product.pcs_per_box <= 0) {
        const unit = product.sell_unit || 'pcs';
        return `${stock} ${unit}`;
    }
    
    const mainLabel = (product.main_unit || 'box').toUpperCase();
    const subLabel = (product.sell_unit || 'pcs').toUpperCase();
    const { mainUnits, subUnits } = convertFromBaseUnit(stock, product.pcs_per_box);
    
    if (mainUnits === 0) return `${subUnits} ${subLabel}`;
    if (subUnits === 0) return `${mainUnits} ${mainLabel}`;
    return `${mainUnits} ${mainLabel} ${subUnits} ${subLabel}`;
}

/**
 * Get the effective price for a given sell unit type.
 * @param unitType 'main' for the larger unit, 'sub' for the smaller/base unit
 */
export function getUnitPrice(product: Product, unitType: 'main' | 'sub'): number {
    if (unitType === 'main') {
        // Use explicit box_price if set, otherwise calculate from sub price × qty_per_main
        if (product.box_price != null && product.box_price > 0) {
            return product.box_price;
        }
        if (product.pcs_per_box && product.pcs_per_box > 0) {
            return product.price * product.pcs_per_box;
        }
        return product.price;
    }
    return product.price; // sub-unit price is the base price
}

/**
 * Get how many base units (sub-unit) are consumed when selling 1 of the given unit type
 */
export function getUnitMultiplier(product: Product, unitType: 'main' | 'sub'): number {
    if (unitType === 'main' && product.pcs_per_box && product.pcs_per_box > 0) {
        return product.pcs_per_box;
    }
    return 1;
}

/**
 * Check if a product supports multi-unit selling
 */
export function isMultiUnit(product: Product): boolean {
    return !!product.has_multi_unit;
}

/**
 * Get display label for a unit type
 */
export function getUnitLabel(product: Product, unitType: 'main' | 'sub'): string {
    if (unitType === 'main') {
        return (product.main_unit || 'box').toUpperCase();
    }
    return (product.sell_unit || 'pcs').toUpperCase();
}

/**
 * Format currency in Rupiah
 */
export function formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}
