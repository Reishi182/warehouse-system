-- Migration: add_po_discounts
ALTER TABLE purchase_orders
ADD COLUMN discount_1_percent numeric DEFAULT 0,
ADD COLUMN discount_2_percent numeric DEFAULT 0;
