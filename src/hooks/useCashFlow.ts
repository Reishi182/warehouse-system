import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CashFlowDay {
    date: string;
    cashSales: number;
    transferSales: number;
    creditSettled: number; // credit settlements paid in cash
    openingCash: number;
    cashExpenses: number;
    transferExpenses: number;
    cashTransfers: number; // setoran
    cashIn: number;  // total cash inflow
    cashOut: number; // total cash outflow
    netCash: number; // cashIn - cashOut
}

export interface CashFlowSummary {
    days: CashFlowDay[];
    totalCashIn: number;
    totalCashOut: number;
    totalNet: number;
    totalOmzet: number;
    totalExpenses: number;
    totalProfit: number; // omzet - expenses (gross)
}

async function fetchCashFlowData(startDate: string, endDate: string): Promise<CashFlowSummary> {
    // Fetch all data sources in parallel
    const [salesRes, expensesRes, transfersRes, sessionsRes] = await Promise.all([
        supabase
            .from('sales')
            .select('total_amount, payment_method, is_credit, credit_settled_at, credit_payment_method, is_cancelled, is_exchanged, created_at, amount_cash, amount_transfer')
            .gte('created_at', `${startDate}T00:00:00`)
            .lte('created_at', `${endDate}T23:59:59`)
            .or('is_cancelled.is.null,is_cancelled.eq.false'),
        supabase
            .from('expenses')
            .select('amount, payment_method, expense_date')
            .gte('expense_date', startDate)
            .lte('expense_date', endDate),
        supabase
            .from('cash_transfers')
            .select('amount, transfer_date')
            .gte('transfer_date', startDate)
            .lte('transfer_date', endDate),
        supabase
            .from('cashier_sessions')
            .select('opening_cash, session_date')
            .gte('session_date', startDate)
            .lte('session_date', endDate),
    ]);

    const sales = (salesRes.data || []).filter((s: any) => !s.is_exchanged);
    const expenses = expensesRes.data || [];
    const transfers = transfersRes.data || [];
    const sessions = sessionsRes.data || [];

    // Build day-by-day map
    const dayMap = new Map<string, CashFlowDay>();

    // Initialize all days in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        dayMap.set(key, {
            date: key,
            cashSales: 0,
            transferSales: 0,
            creditSettled: 0,
            openingCash: 0,
            cashExpenses: 0,
            transferExpenses: 0,
            cashTransfers: 0,
            cashIn: 0,
            cashOut: 0,
            netCash: 0,
        });
    }

    // Aggregate sales
    for (const s of sales) {
        const day = (s as any).created_at?.slice(0, 10);
        const entry = dayMap.get(day);
        if (!entry) continue;

        if ((s as any).is_credit && !(s as any).credit_settled_at) {
            // Unsettled credit — no cash flow yet
            continue;
        }

        if ((s as any).is_credit && (s as any).credit_settled_at) {
            // Settled credit
            if ((s as any).credit_payment_method === 'cash') {
                entry.creditSettled += (s as any).total_amount;
            }
        } else if ((s as any).payment_method === 'cash') {
            entry.cashSales += (s as any).total_amount;
        } else if ((s as any).payment_method === 'split') {
            entry.cashSales += (s as any).amount_cash || 0;
            entry.transferSales += (s as any).amount_transfer || 0;
        } else {
            entry.transferSales += (s as any).total_amount;
        }
    }

    // Aggregate expenses
    for (const e of expenses) {
        const entry = dayMap.get((e as any).expense_date);
        if (!entry) continue;
        if ((e as any).payment_method === 'cash') {
            entry.cashExpenses += (e as any).amount;
        } else {
            entry.transferExpenses += (e as any).amount;
        }
    }

    // Aggregate cash transfers (setoran)
    for (const t of transfers) {
        const entry = dayMap.get((t as any).transfer_date);
        if (!entry) continue;
        entry.cashTransfers += (t as any).amount;
    }

    // Aggregate opening cash
    for (const s of sessions) {
        const entry = dayMap.get((s as any).session_date);
        if (!entry) continue;
        entry.openingCash += (s as any).opening_cash;
    }

    // Calculate totals per day
    const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    let totalCashIn = 0;
    let totalCashOut = 0;
    let totalOmzet = 0;
    let totalExpenses = 0;

    for (const day of days) {
        day.cashIn = day.cashSales + day.creditSettled + day.openingCash;
        day.cashOut = day.cashExpenses + day.cashTransfers;
        day.netCash = day.cashIn - day.cashOut;

        totalCashIn += day.cashIn;
        totalCashOut += day.cashOut;
        totalOmzet += day.cashSales + day.transferSales + day.creditSettled;
        totalExpenses += day.cashExpenses + day.transferExpenses;
    }

    return {
        days,
        totalCashIn,
        totalCashOut,
        totalNet: totalCashIn - totalCashOut,
        totalOmzet,
        totalExpenses,
        totalProfit: totalOmzet - totalExpenses,
    };
}

export function useCashFlow(startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['cash-flow', startDate, endDate],
        queryFn: () => fetchCashFlowData(startDate, endDate),
        enabled: !!startDate && !!endDate,
    });
}
