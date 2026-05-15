-- ============================================================================
-- MIGRATION: Fix Multi-Unit Stock Discrepancy
-- ============================================================================
-- PROBLEM: stock_request_items and stock_return_items stored quantities in 
-- user-selected units (e.g. "2 Box") but all RPC calls (reserve_stock, 
-- commit_stock_issue, atomic_transfer_stock) processed them as base units.
-- This means when someone requested "2 Box" (1 Box = 70 Pcs), only 2 units
-- were moved instead of 140.
--
-- This migration:
-- 1. Identifies all affected items (where unit = main_unit on multi-unit products)
-- 2. Corrects stock_gudang / stock_toko for completed requests & returns
-- 3. Corrects stock_reserved for still-pending requests
-- ============================================================================

-- =============================================
-- STEP 0: DIAGNOSTIC — View affected items BEFORE fixing
-- Run this SELECT first to see the damage scope.
-- =============================================

-- 0a. Affected COMPLETED stock requests (gudang → toko transfers)
-- These transferred too few units: gudang lost too little, toko gained too little
SELECT 
    'STOCK_REQUEST' AS type,
    sr.request_number,
    sr.status,
    sri.product_id,
    p.name AS product_name,
    sri.quantity AS stored_qty,
    sri.unit AS stored_unit,
    p.main_unit,
    p.pcs_per_box,
    (sri.quantity * p.pcs_per_box) AS correct_base_qty,
    (sri.quantity * p.pcs_per_box - sri.quantity) AS stock_difference,
    p.stock_gudang AS current_gudang,
    p.stock_toko AS current_toko
FROM stock_request_items sri
JOIN stock_requests sr ON sr.id = sri.stock_request_id
JOIN products p ON p.id = sri.product_id
WHERE p.has_multi_unit = true
  AND p.main_unit IS NOT NULL
  AND p.pcs_per_box IS NOT NULL
  AND p.pcs_per_box > 1
  AND LOWER(sri.unit) = LOWER(p.main_unit)
  AND sr.status = 'completed'
ORDER BY sr.created_at DESC;

-- 0b. Affected COMPLETED stock returns (toko → gudang transfers)
SELECT 
    'STOCK_RETURN' AS type,
    srt.return_number,
    srt.status,
    srti.product_id,
    p.name AS product_name,
    srti.quantity AS stored_qty,
    srti.unit AS stored_unit,
    p.main_unit,
    p.pcs_per_box,
    (srti.quantity * p.pcs_per_box) AS correct_base_qty,
    (srti.quantity * p.pcs_per_box - srti.quantity) AS stock_difference,
    p.stock_gudang AS current_gudang,
    p.stock_toko AS current_toko
FROM stock_return_items srti
JOIN stock_returns srt ON srt.id = srti.stock_return_id
JOIN products p ON p.id = srti.product_id
WHERE p.has_multi_unit = true
  AND p.main_unit IS NOT NULL
  AND p.pcs_per_box IS NOT NULL
  AND p.pcs_per_box > 1
  AND LOWER(srti.unit) = LOWER(p.main_unit)
  AND srt.status IN ('completed', 'approved')
ORDER BY srt.created_at DESC;

-- 0c. Affected PENDING stock requests (wrong reservation amount)
SELECT 
    'PENDING_REQUEST' AS type,
    sr.request_number,
    sr.status,
    sri.product_id,
    p.name AS product_name,
    sri.quantity AS stored_qty,
    sri.unit AS stored_unit,
    p.pcs_per_box,
    (sri.quantity * p.pcs_per_box - sri.quantity) AS reservation_difference,
    p.stock_reserved AS current_reserved
FROM stock_request_items sri
JOIN stock_requests sr ON sr.id = sri.stock_request_id
JOIN products p ON p.id = sri.product_id
WHERE p.has_multi_unit = true
  AND p.main_unit IS NOT NULL
  AND p.pcs_per_box IS NOT NULL
  AND p.pcs_per_box > 1
  AND LOWER(sri.unit) = LOWER(p.main_unit)
  AND sr.status IN ('pending_gudang', 'pending_main_office')
ORDER BY sr.created_at DESC;


-- =============================================
-- STEP 1: Fix COMPLETED stock requests
-- Gudang was decreased by too little → decrease more
-- Toko was increased by too little → increase more
-- =============================================

-- Aggregate the total difference per product from completed requests
WITH request_diffs AS (
    SELECT 
        sri.product_id,
        SUM(sri.quantity * p.pcs_per_box - sri.quantity) AS total_diff
    FROM stock_request_items sri
    JOIN stock_requests sr ON sr.id = sri.stock_request_id
    JOIN products p ON p.id = sri.product_id
    WHERE p.has_multi_unit = true
      AND p.main_unit IS NOT NULL
      AND p.pcs_per_box IS NOT NULL
      AND p.pcs_per_box > 1
      AND LOWER(sri.unit) = LOWER(p.main_unit)
      AND sr.status = 'completed'
    GROUP BY sri.product_id
    HAVING SUM(sri.quantity * p.pcs_per_box - sri.quantity) > 0
)
UPDATE products p
SET 
    stock_gudang = p.stock_gudang - rd.total_diff,
    stock_toko = p.stock_toko + rd.total_diff
FROM request_diffs rd
WHERE p.id = rd.product_id;


-- =============================================
-- STEP 2: Fix COMPLETED stock returns
-- Toko was decreased by too little → decrease more
-- Gudang was increased by too little → increase more
-- =============================================

WITH return_diffs AS (
    SELECT 
        srti.product_id,
        SUM(srti.quantity * p.pcs_per_box - srti.quantity) AS total_diff
    FROM stock_return_items srti
    JOIN stock_returns srt ON srt.id = srti.stock_return_id
    JOIN products p ON p.id = srti.product_id
    WHERE p.has_multi_unit = true
      AND p.main_unit IS NOT NULL
      AND p.pcs_per_box IS NOT NULL
      AND p.pcs_per_box > 1
      AND LOWER(srti.unit) = LOWER(p.main_unit)
      AND srt.status IN ('completed', 'approved')
    GROUP BY srti.product_id
    HAVING SUM(srti.quantity * p.pcs_per_box - srti.quantity) > 0
)
UPDATE products p
SET 
    stock_toko = p.stock_toko - rd.total_diff,
    stock_gudang = p.stock_gudang + rd.total_diff
FROM return_diffs rd
WHERE p.id = rd.product_id;


-- =============================================
-- STEP 3: Fix PENDING request reservations
-- stock_reserved was increased by too little → increase more
-- This ensures when the fixed code processes them,
-- commit_stock_issue won't cause stock_reserved to go negative.
-- =============================================

WITH pending_diffs AS (
    SELECT 
        sri.product_id,
        SUM(sri.quantity * p.pcs_per_box - sri.quantity) AS total_diff
    FROM stock_request_items sri
    JOIN stock_requests sr ON sr.id = sri.stock_request_id
    JOIN products p ON p.id = sri.product_id
    WHERE p.has_multi_unit = true
      AND p.main_unit IS NOT NULL
      AND p.pcs_per_box IS NOT NULL
      AND p.pcs_per_box > 1
      AND LOWER(sri.unit) = LOWER(p.main_unit)
      AND sr.status IN ('pending_gudang', 'pending_main_office')
    GROUP BY sri.product_id
    HAVING SUM(sri.quantity * p.pcs_per_box - sri.quantity) > 0
)
UPDATE products p
SET 
    stock_reserved = COALESCE(p.stock_reserved, 0) + pd.total_diff
FROM pending_diffs pd
WHERE p.id = pd.product_id;


-- =============================================
-- STEP 4: Insert correction stock logs for audit trail
-- =============================================

-- 4a. Logs for completed request corrections
INSERT INTO stock_logs (product_id, type, quantity, location, note, reference_type)
SELECT 
    sri.product_id,
    'adjustment',
    (sri.quantity * p.pcs_per_box - sri.quantity),
    'gudang',
    '[AUTO-FIX] Koreksi bug multi-unit pada permintaan stok ' || COALESCE(sr.request_number, sr.id::text) 
        || '. Seharusnya ' || (sri.quantity * p.pcs_per_box) || ' ' || COALESCE(p.sell_unit, 'pcs')
        || ' bukan ' || sri.quantity || ' ' || sri.unit,
    'stock_request'
FROM stock_request_items sri
JOIN stock_requests sr ON sr.id = sri.stock_request_id
JOIN products p ON p.id = sri.product_id
WHERE p.has_multi_unit = true
  AND p.main_unit IS NOT NULL
  AND p.pcs_per_box IS NOT NULL
  AND p.pcs_per_box > 1
  AND LOWER(sri.unit) = LOWER(p.main_unit)
  AND sr.status = 'completed';

-- 4b. Logs for completed return corrections
INSERT INTO stock_logs (product_id, type, quantity, location, note, reference_type)
SELECT 
    srti.product_id,
    'adjustment',
    (srti.quantity * p.pcs_per_box - srti.quantity),
    'toko',
    '[AUTO-FIX] Koreksi bug multi-unit pada retur stok ' || COALESCE(srt.return_number, srt.id::text) 
        || '. Seharusnya ' || (srti.quantity * p.pcs_per_box) || ' ' || COALESCE(p.sell_unit, 'pcs')
        || ' bukan ' || srti.quantity || ' ' || srti.unit,
    'stock_return'
FROM stock_return_items srti
JOIN stock_returns srt ON srt.id = srti.stock_return_id
JOIN products p ON p.id = srti.product_id
WHERE p.has_multi_unit = true
  AND p.main_unit IS NOT NULL
  AND p.pcs_per_box IS NOT NULL
  AND p.pcs_per_box > 1
  AND LOWER(srti.unit) = LOWER(p.main_unit)
  AND srt.status IN ('completed', 'approved');
