-- Add split payment tracking columns
ALTER TABLE sales ADD COLUMN amount_cash numeric DEFAULT 0;
ALTER TABLE sales ADD COLUMN amount_transfer numeric DEFAULT 0;

-- Ensure constraints allow split payment if there is an enum or string constraint.
-- If payment_method is just a text column, nothing needs to be done.
-- (This step assumes text. No enum modifications directly)
