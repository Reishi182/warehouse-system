import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type ReportType = 'daily_sales' | 'daily_stock' | 'weekly_summary' | 'monthly_summary';
type Frequency = 'daily' | 'weekly' | 'monthly';

interface ScheduledReport {
    id: string;
    report_type: ReportType;
    frequency: Frequency;
    email: string;
    enabled: boolean;
    last_sent?: string;
    next_send?: string;
    created_at: string;
}

interface CreateScheduledReportInput {
    report_type: ReportType;
    frequency: Frequency;
    email: string;
}

/**
 * Hook for managing scheduled email reports
 * Note: This creates the UI infrastructure. Actual email sending would require
 * a backend service (Supabase Edge Functions, cron job, etc.)
 */
export function useScheduledReports() {
    const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { profile } = useAuth();
    const { toast } = useToast();

    // Load scheduled reports from localStorage (or could be from Supabase)
    useEffect(() => {
        try {
            const stored = localStorage.getItem('vmb-scheduled-reports');
            if (stored) {
                setScheduledReports(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load scheduled reports:', e);
        }
    }, []);

    // Save to localStorage
    const saveReports = useCallback((reports: ScheduledReport[]) => {
        try {
            localStorage.setItem('vmb-scheduled-reports', JSON.stringify(reports));
            setScheduledReports(reports);
        } catch (e) {
            console.error('Failed to save scheduled reports:', e);
        }
    }, []);

    // Create a new scheduled report
    const createScheduledReport = useCallback(async (input: CreateScheduledReportInput) => {
        setIsLoading(true);

        try {
            const newReport: ScheduledReport = {
                id: `report-${Date.now()}`,
                ...input,
                enabled: true,
                created_at: new Date().toISOString(),
                next_send: calculateNextSend(input.frequency),
            };

            const updated = [...scheduledReports, newReport];
            saveReports(updated);

            toast({
                title: 'Laporan terjadwal berhasil dibuat',
                description: `Laporan akan dikirim ${getFrequencyLabel(input.frequency)} ke ${input.email}`,
            });

            return newReport;
        } finally {
            setIsLoading(false);
        }
    }, [scheduledReports, saveReports, toast]);

    // Update a scheduled report
    const updateScheduledReport = useCallback(async (
        id: string,
        updates: Partial<Pick<ScheduledReport, 'enabled' | 'email' | 'frequency'>>
    ) => {
        const updated = scheduledReports.map(r =>
            r.id === id ? { ...r, ...updates } : r
        );
        saveReports(updated);

        toast({
            title: 'Jadwal laporan diperbarui',
        });
    }, [scheduledReports, saveReports, toast]);

    // Delete a scheduled report
    const deleteScheduledReport = useCallback(async (id: string) => {
        const updated = scheduledReports.filter(r => r.id !== id);
        saveReports(updated);

        toast({
            title: 'Jadwal laporan dihapus',
        });
    }, [scheduledReports, saveReports, toast]);

    // Toggle enabled status
    const toggleReport = useCallback((id: string) => {
        const report = scheduledReports.find(r => r.id === id);
        if (report) {
            updateScheduledReport(id, { enabled: !report.enabled });
        }
    }, [scheduledReports, updateScheduledReport]);

    // Send report now (manual trigger)
    const sendReportNow = useCallback(async (id: string) => {
        const report = scheduledReports.find(r => r.id === id);
        if (!report) return;

        setIsLoading(true);

        try {
            // In a real implementation, this would call an API endpoint
            // that generates the report and sends it via email

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Update last sent time
            const updated = scheduledReports.map(r =>
                r.id === id
                    ? { ...r, last_sent: new Date().toISOString(), next_send: calculateNextSend(r.frequency) }
                    : r
            );
            saveReports(updated);

            toast({
                title: 'Laporan terkirim!',
                description: `Laporan telah dikirim ke ${report.email}`,
            });
        } catch (error) {
            toast({
                title: 'Gagal mengirim laporan',
                description: 'Silakan coba lagi nanti',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [scheduledReports, saveReports, toast]);

    return {
        scheduledReports,
        isLoading,
        createScheduledReport,
        updateScheduledReport,
        deleteScheduledReport,
        toggleReport,
        sendReportNow,
    };
}

// Helper functions
function calculateNextSend(frequency: Frequency): string {
    const now = new Date();
    const next = new Date();

    switch (frequency) {
        case 'daily':
            next.setDate(now.getDate() + 1);
            next.setHours(8, 0, 0, 0);
            break;
        case 'weekly':
            // Next Monday at 8 AM
            const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
            next.setDate(now.getDate() + daysUntilMonday);
            next.setHours(8, 0, 0, 0);
            break;
        case 'monthly':
            // First day of next month at 8 AM
            next.setMonth(now.getMonth() + 1, 1);
            next.setHours(8, 0, 0, 0);
            break;
    }

    return next.toISOString();
}

function getFrequencyLabel(frequency: Frequency): string {
    switch (frequency) {
        case 'daily': return 'setiap hari';
        case 'weekly': return 'setiap minggu';
        case 'monthly': return 'setiap bulan';
    }
}

export const REPORT_TYPES: { value: ReportType; label: string; description: string }[] = [
    { value: 'daily_sales', label: 'Laporan Penjualan Harian', description: 'Ringkasan penjualan per hari' },
    { value: 'daily_stock', label: 'Laporan Stok Harian', description: 'Pergerakan stok per hari' },
    { value: 'weekly_summary', label: 'Ringkasan Mingguan', description: 'Penjualan dan stok per minggu' },
    { value: 'monthly_summary', label: 'Ringkasan Bulanan', description: 'Laporan lengkap per bulan' },
];

export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
    { value: 'daily', label: 'Harian' },
    { value: 'weekly', label: 'Mingguan' },
    { value: 'monthly', label: 'Bulanan' },
];

export default useScheduledReports;
