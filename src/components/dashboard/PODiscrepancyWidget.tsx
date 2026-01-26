import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePODiscrepancyStats } from '@/hooks/usePODiscrepancies';

export default function PODiscrepancyWidget() {
    const { data: stats, isLoading } = usePODiscrepancyStats();

    if (isLoading) {
        return (
            <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-amber-200 dark:bg-amber-700 rounded w-1/2" />
                        <div className="h-8 bg-amber-200 dark:bg-amber-700 rounded w-1/3" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    const hasIssues = (stats?.discrepancyCount || 0) > 0 || (stats?.pendingClaimsCount || 0) > 0;

    if (!hasIssues) {
        return null; // Don't show widget if no issues
    }

    return (
        <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 overflow-hidden">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-5 h-5" />
                    Selisih PO & Klaim
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    {/* PO with Discrepancy */}
                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span className="text-xs text-muted-foreground">PO Selisih</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                                {stats?.discrepancyCount || 0}
                            </span>
                            {(stats?.discrepancyCount || 0) > 0 && (
                                <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700">Perlu Klaim</Badge>
                            )}
                        </div>
                    </div>

                    {/* Pending Claims */}
                    <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-orange-600" />
                            <span className="text-xs text-muted-foreground">Klaim Pending</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                                {stats?.pendingClaimsCount || 0}
                            </span>
                            {(stats?.totalPendingAmount || 0) > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    Rp {((stats?.totalPendingAmount || 0) / 1000).toFixed(0)}rb
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Link */}
                <Link to="/purchase-orders/discrepancy">
                    <Button
                        variant="outline"
                        className="w-full gap-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                    >
                        Kelola Selisih & Klaim
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
