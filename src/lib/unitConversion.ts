/**
 * Multi-unit conversion utilities.
 * Database stock is always stored in sell_unit (pcs, kg, meter, etc.)
 */

interface MultiUnitProduct {
    has_multi_unit?: boolean;
    main_unit?: string | null;
    pcs_per_box?: number | null;
}

/**
 * Convert quantity from user-selected unit to base unit (sell_unit).
 * E.g., 2 Box → 140 Pcs (if pcs_per_box = 70)
 */
export function convertToBaseUnit(
    quantity: number,
    unit: string,
    product: MultiUnitProduct
): number {
    if (!product.has_multi_unit || !product.main_unit || !product.pcs_per_box) {
        return quantity;
    }
    if (unit.toLowerCase() === product.main_unit.toLowerCase()) {
        return quantity * product.pcs_per_box;
    }
    return quantity; // already in sell_unit
}

/**
 * Get maximum quantity allowed in the specified unit for a given base stock.
 * E.g., if stock = 140 pcs and unit = 'Box' with pcs_per_box = 70, returns 2.
 */
export function getMaxQtyInUnit(
    baseStock: number,
    unit: string,
    product: MultiUnitProduct
): number {
    if (!product.has_multi_unit || !product.main_unit || !product.pcs_per_box) {
        return baseStock;
    }
    if (unit.toLowerCase() === product.main_unit.toLowerCase()) {
        return Math.floor(baseStock / product.pcs_per_box);
    }
    return baseStock;
}
