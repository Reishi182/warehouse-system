-- Enable Realtime for Marketplace tables
-- Run this in Supabase SQL Editor to enable realtime updates

-- Enable Realtime for marketplace_orders
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_orders;

-- Enable Realtime for marketplace_order_items
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_order_items;

-- Enable Realtime for marketplace_returns
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_returns;
