-- =====================================================
-- Add missing product units for warehouse operations
-- =====================================================
-- Adds: GRAM, BTG, PSG, KUBIK, KRG, BKS, PAIL, SET, IKAT, LEMBAR
-- Uses ON CONFLICT to skip units that already exist
-- =====================================================

INSERT INTO product_units (code, label, sort_order, is_active) VALUES
  ('pcs',   'PCS',    1, true),
  ('box',   'BOX',    2, true),
  ('kg',    'KG',     3, true),
  ('gr',    'GRAM',   4, true),
  ('meter', 'METER',  5, true),
  ('roll',  'ROLL',   6, true),
  ('sak',   'SAK',    7, true),
  ('pack',  'PACK',   8, true),
  ('lusin', 'LUSIN',  9, true),
  ('btg',   'BTG',   10, true),
  ('psg',   'PSG',   11, true),
  ('kubik', 'KUBIK', 12, true),
  ('krg',   'KRG',   13, true),
  ('bks',   'BKS',   14, true),
  ('pail',  'PAIL',  15, true),
  ('set',   'SET',   16, true),
  ('ikat',  'IKAT',  17, true),
  ('lbr',   'LEMBAR',18, true)
ON CONFLICT (code) DO NOTHING;
