import { Product } from '@/types';

/**
 * Multi-unit helper utilities for products that can be sold as box or pcs.
 * Stock is always stored in base unit (pcs). Conversion is display-only.
 */

export interface BoxPcsBreakdown {
    boxes: number;
    pcs: number;
    totalPcs: number;
}

/**
 * Convert total pcs to box + pcs breakdown
 */
export function convertFromBaseUnit(totalPcs: number, pcsPerBox: number | null | undefined): BoxPcsBreakdown {
    if (!pcsPerBox || pcsPerBox <= 0) {
        return { boxes: 0, pcs: totalPcs, totalPcs };
    }
    const boxes = Math.floor(totalPcs / pcsPerBox);
    const pcs = totalPcs % pcsPerBox;
    return { boxes, pcs, totalPcs };
}

/**
 * Convert box + pcs to total pcs
 */
export function convertToBaseUnit(boxes: number, pcs: number, pcsPerBox: number | null | undefined): number {
    if (!pcsPerBox || pcsPerBox <= 0) {
        return pcs;
    }
    return (boxes * pcsPerBox) + pcs;
}

/**
 * Format stock display for a product.
 * Returns "7 Box 13 Pcs" for multi-unit or "503" for regular products.
 */
export function formatStockDisplay(stock: number, product: Product): string {
    if (!product.has_multi_unit || !product.pcs_per_box || product.pcs_per_box <= 0) {
        const unit = product.sell_unit || 'pcs';
        return `${stock} ${unit}`;
    }
    
    const { boxes, pcs } = convertFromBaseUnit(stock, product.pcs_per_box);
    
    if (boxes === 0) return `${pcs} Pcs`;
    if (pcs === 0) return `${boxes} Box`;
    return `${boxes} Box ${pcs} Pcs`;
}

/**
 * Get the effective price for a given sell unit
 */
export function getUnitPrice(product: Product, unit: 'box' | 'pcs'): number {
    if (unit === 'box') {
        // Use explicit box_price if set, otherwise calculate from pcs price × pcs_per_box
        if (product.box_price != null && product.box_price > 0) {
            return product.box_price;
        }
        if (product.pcs_per_box && product.pcs_per_box > 0) {
            return product.price * product.pcs_per_box;
        }
        return product.price;
    }
    return product.price; // pcs price is the base price
}

/**
 * Get how many base units (pcs) are consumed when selling 1 of the given unit
 */
export function getUnitMultiplier(product: Product, unit: 'box' | 'pcs'): number {
    if (unit === 'box' && product.pcs_per_box && product.pcs_per_box > 0) {
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
