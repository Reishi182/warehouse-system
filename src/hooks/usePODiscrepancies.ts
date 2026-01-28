import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { POClaim, POClaimStatus, POClaimType, ClaimedItem, POReceiptWithDetails, PurchaseOrder } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendNotificationToRole } from '@/hooks/useRealtimeNotifications';

// =============================================
// DISCREPANCY QUERIES
// =============================================

/**
 * Fetch all POs with discrepancy status and their receipt details
 */
export function usePOsWithDiscrepancy() {
    return useQuery({
        queryKey: ['purchase_orders', 'with_discrepancy'],
        queryFn: async () => {
            // Fetch POs with completed_with_discrepancy status (includes those with in-progress claims)
            const { data: pos, error: poError } = await supabase
                .from('purchase_orders')
                .select(`
          *,
          supplier:suppliers(*)
        `)
                .eq('status', 'completed_with_discrepancy')
                .order('updated_at', { ascending: false });

            if (poError) throw poError;

            // For each PO, fetch the receipt with discrepancy details and active claim
            const posWithReceipts = await Promise.all(
                (pos || []).map(async (po) => {
                    const { data: receipts } = await supabase
                        .from('po_receipts')
                        .select('*')
                        .eq('purchase_order_id', po.id)
                        .eq('has_discrepancy', true)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    const receipt = receipts?.[0] || null;

                    // Fetch items for this PO
                    const { data: items } = await supabase
                        .from('purchase_order_items')
                        .select('*')
                        .eq('purchase_order_id', po.id);

                    // Fetch active claim for this PO (pending or in_progress)
                    const { data: activeClaims } = await supabase
                        .from('po_claims')
                        .select('id, claim_number, status')
                        .eq('purchase_order_id', po.id)
                        .in('status', ['pending', 'in_progress'])
                        .limit(1);

                    const activeClaim = activeClaims?.[0] || null;

                    return {
                        ...po,
                        items: items || [],
                        receipt: receipt ? {
                            ...receipt,
                            discrepancy_details: receipt.discrepancy_details || [],
                        } : null,
                        activeClaim,
                    };
                })
            );

            return posWithReceipts as (PurchaseOrder & { receipt: POReceiptWithDetails | null; activeClaim: { id: string; claim_number: string; status: string } | null })[];
        },
    });
}

/**
 * Aggregate discrepancy stats for dashboard
 */
export function usePODiscrepancyStats() {
    return useQuery({
        queryKey: ['po_discrepancy_stats'],
        queryFn: async () => {
            // Count POs with discrepancy
            const { count: discrepancyCount } = await supabase
                .from('purchase_orders')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'completed_with_discrepancy');

            // Count pending claims
            const { count: pendingClaimsCount } = await supabase
                .from('po_claims')
                .select('id', { count: 'exact', head: true })
                .in('status', ['pending', 'in_progress']);

            // Count resolved claims
            const { count: resolvedClaimsCount } = await supabase
                .from('po_claims')
                .select('id', { count: 'exact', head: true })
                .eq('status', 'resolved');

            // Total claimed amount (pending + in_progress)
            const { data: claimAmounts } = await supabase
                .from('po_claims')
                .select('total_claimed_amount')
                .in('status', ['pending', 'in_progress']);

            const totalPendingAmount = (claimAmounts || []).reduce(
                (sum, c) => sum + (Number(c.total_claimed_amount) || 0), 0
            );

            return {
                discrepancyCount: discrepancyCount || 0,
                pendingClaimsCount: pendingClaimsCount || 0,
                resolvedClaimsCount: resolvedClaimsCount || 0,
                totalPendingAmount,
            };
        },
        staleTime: 1000 * 60, // 1 minute
    });
}

// =============================================
// CLAIMS QUERIES
// =============================================

/**
 * Fetch all claims with optional status filter
 */
export function usePOClaims(statusFilter?: POClaimStatus | POClaimStatus[]) {
    return useQuery({
        queryKey: ['po_claims', statusFilter],
        queryFn: async () => {
            let query = supabase
                .from('po_claims')
                .select(`
          *,
          purchase_order:purchase_orders(*),
          supplier:suppliers(*)
        `)
                .order('created_at', { ascending: false });

            if (statusFilter) {
                if (Array.isArray(statusFilter)) {
                    query = query.in('status', statusFilter);
                } else {
                    query = query.eq('status', statusFilter);
                }
            }

            const { data, error } = await query;
            if (error) throw error;

            return (data || []).map(claim => ({
                ...claim,
                claimed_items: claim.claimed_items || [],
                evidence_urls: claim.evidence_urls || [],
            })) as POClaim[];
        },
    });
}

/**
 * Fetch single claim by ID
 */
export function usePOClaim(claimId: string) {
    return useQuery({
        queryKey: ['po_claim', claimId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('po_claims')
                .select(`
          *,
          purchase_order:purchase_orders(*, supplier:suppliers(*)),
          supplier:suppliers(*)
        `)
                .eq('id', claimId)
                .single();

            if (error) throw error;
            return data as POClaim;
        },
        enabled: !!claimId,
    });
}

// =============================================
// CLAIMS MUTATIONS
// =============================================

interface CreateClaimInput {
    purchaseOrderId: string;
    poReceiptId?: string;
    supplierId?: string;
    claimType: POClaimType;
    claimedItems: ClaimedItem[];
    evidenceUrls?: string[];
    createdBy: string;
    createdByName: string;
}

export function useCreatePOClaim() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: CreateClaimInput) => {
            // Generate claim number
            const { data: claimNumber, error: numError } = await supabase
                .rpc('generate_claim_number');

            let finalClaimNumber = claimNumber;
            if (numError) {
                // Fallback
                const now = new Date();
                const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
                const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
                finalClaimNumber = `CLM-${dateStr}-${rand}`;
            }

            // Calculate total claimed amount
            const totalClaimedAmount = input.claimedItems.reduce((sum, item) => {
                const shortage = item.qty_ordered - item.qty_received;
                const totalMissing = shortage + item.qty_damaged;
                return sum + (totalMissing * item.unit_price);
            }, 0);

            // Create claim
            const { data: claim, error } = await supabase
                .from('po_claims')
                .insert([{
                    claim_number: finalClaimNumber,
                    purchase_order_id: input.purchaseOrderId,
                    po_receipt_id: input.poReceiptId || null,
                    supplier_id: input.supplierId || null,
                    claim_type: input.claimType,
                    status: 'pending',
                    total_claimed_amount: totalClaimedAmount,
                    claimed_items: input.claimedItems,
                    evidence_urls: input.evidenceUrls || [],
                    created_by: input.createdBy,
                    created_by_name: input.createdByName,
                }])
                .select()
                .single();

            if (error) throw error;

            // Update PO to mark it has a claim
            await supabase
                .from('purchase_orders')
                .update({ has_claim: true })
                .eq('id', input.purchaseOrderId);

            return claim;
        },
        onSuccess: (claim) => {
            queryClient.invalidateQueries({ queryKey: ['po_claims'] });
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            queryClient.invalidateQueries({ queryKey: ['purchase_orders', 'with_discrepancy'] });
            queryClient.invalidateQueries({ queryKey: ['po_discrepancy_stats'] });

            toast({
                title: 'Klaim Berhasil Dibuat',
                description: `Klaim ${claim.claim_number} telah dibuat dan menunggu proses`,
            });

            // Notify auditors
            sendNotificationToRole(['auditor', 'main_office'], {
                title: 'Klaim PO Baru',
                message: `Klaim ${claim.claim_number} membutuhkan tindakan follow-up`,
                type: 'warning',
                link: '/purchase-orders/discrepancy',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal Membuat Klaim',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}

interface UpdateClaimStatusInput {
    claimId: string;
    status: POClaimStatus;
    resolutionNotes?: string;
    resolutionType?: string;
    resolvedBy?: string;
    resolvedByName?: string;
}

export function useUpdatePOClaimStatus() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (input: UpdateClaimStatusInput) => {
            const updateData: Record<string, unknown> = {
                status: input.status,
                updated_at: new Date().toISOString(),
            };

            if (input.resolutionNotes) {
                updateData.resolution_notes = input.resolutionNotes;
            }

            if (input.resolutionType) {
                updateData.resolution_type = input.resolutionType;
            }

            if (input.status === 'resolved' || input.status === 'rejected') {
                updateData.resolved_by = input.resolvedBy;
                updateData.resolved_by_name = input.resolvedByName;
                updateData.resolved_at = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('po_claims')
                .update(updateData)
                .eq('id', input.claimId)
                .select(`*, purchase_order_id, claimed_items`)
                .single();

            if (error) throw error;

            // When claim is resolved with "replacement", update stock for each claimed item
            if (input.status === 'resolved' && input.resolutionType === 'replacement' && data.purchase_order_id) {
                // Fetch PO to get destination
                const { data: poData } = await supabase
                    .from('purchase_orders')
                    .select('destination, po_number, items:purchase_order_items(product_id, product_name)')
                    .eq('id', data.purchase_order_id)
                    .single();

                if (poData) {
                    const destination = poData.destination as 'gudang' | 'toko';
                    const claimedItems = (data.claimed_items || []) as ClaimedItem[];

                    for (const item of claimedItems) {
                        // Calculate replacement quantity (shortage + damaged)
                        const shortage = item.qty_ordered - item.qty_received;
                        const replacementQty = shortage + item.qty_damaged;

                        if (replacementQty <= 0) continue;

                        // Try to find product_id from claimed item or PO items
                        let productId = item.product_id;
                        if (!productId && poData.items) {
                            const matchingItem = poData.items.find((i: { product_name: string }) => i.product_name === item.product_name);
                            productId = matchingItem?.product_id || null;
                        }

                        if (!productId) continue;

                        // Get current stock
                        const { data: product } = await supabase
                            .from('products')
                            .select('stock_gudang, stock_toko')
                            .eq('id', productId)
                            .single();

                        if (!product) continue;

                        // Update stock
                        const stockField = destination === 'gudang' ? 'stock_gudang' : 'stock_toko';
                        const currentStock = destination === 'gudang' ? (product.stock_gudang || 0) : (product.stock_toko || 0);
                        const newStock = currentStock + replacementQty;

                        await supabase
                            .from('products')
                            .update({ [stockField]: newStock })
                            .eq('id', productId);

                        // Log stock change
                        await supabase.from('stock_logs').insert([{
                            product_id: productId,
                            type: 'in',
                            quantity: replacementQty,
                            location: destination,
                            user_id: input.resolvedBy || null,
                            note: `Penggantian dari Klaim PO: ${data.claim_number} (PO: ${poData.po_number})`,
                            reference_type: 'po_claim',
                            reference_id: data.id,
                            stock_before: currentStock,
                            stock_after: newStock,
                        }]);
                    }
                }
            }

            // When claim is resolved, update PO status to 'completed' so it disappears from discrepancy list
            if (input.status === 'resolved' && data.purchase_order_id) {
                await supabase
                    .from('purchase_orders')
                    .update({
                        status: 'completed',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', data.purchase_order_id);
            }

            return data;
        },
        onSuccess: (claim) => {
            queryClient.invalidateQueries({ queryKey: ['po_claims'] });
            queryClient.invalidateQueries({ queryKey: ['po_claim', claim.id] });
            queryClient.invalidateQueries({ queryKey: ['po_discrepancy_stats'] });
            queryClient.invalidateQueries({ queryKey: ['purchase_orders', 'with_discrepancy'] });
            queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
            queryClient.invalidateQueries({ queryKey: ['products'] }); // Refresh product stock

            const statusLabels: Record<string, string> = {
                pending: 'Pending',
                in_progress: 'Dalam Proses',
                resolved: 'Selesai',
                rejected: 'Ditolak',
            };

            toast({
                title: 'Status Klaim Diperbarui',
                description: `Klaim ${claim.claim_number} sekarang ${statusLabels[claim.status]}`,
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Gagal Update Status',
                description: error.message,
                variant: 'destructive',
            });
        },
    });
}
