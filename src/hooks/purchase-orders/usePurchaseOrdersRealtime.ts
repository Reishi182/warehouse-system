import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to subscribe to real-time changes on purchase_orders table.
 * This will automatically invalidate and refetch PO data when changes occur.
 */
export function usePurchaseOrdersRealtime() {
    // Deprecated: handled in global context
}
