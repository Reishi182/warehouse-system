import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    Search,
    ChevronDown,
    ChevronRight,
    BookOpen,
    ExternalLink,
    CheckCircle2,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useRole } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
    guideData,
    getProceduresByRole,
    getCategoriesByRole,
    searchProcedures,
    type GuideProcedure,
} from '@/data/guideData';

export default function Guide() {
    const role = useRole();
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedProcedures, setExpandedProcedures] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Get procedures and categories based on role
    const procedures = useMemo(() => {
        if (!role) return [];
        if (searchQuery) {
            return searchProcedures(searchQuery, role);
        }
        const allProcedures = getProceduresByRole(role);
        if (selectedCategory) {
            return allProcedures.filter(p => p.category === selectedCategory);
        }
        return allProcedures;
    }, [role, searchQuery, selectedCategory]);

    const categories = useMemo(() => {
        if (!role) return [];
        return getCategoriesByRole(role);
    }, [role]);

    const toggleProcedure = (id: string) => {
        setExpandedProcedures(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const getRoleTitle = () => {
        switch (role) {
            case 'admin': return 'Administrator';
            case 'auditor': return 'Auditor';
            case 'cashier': return 'Kasir';
            case 'warehouse': return 'Gudang';
            case 'main_office': return 'Kantor Pusat';
            default: return 'Pengguna';
        }
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            'Penjualan': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            'Stok': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            'Keuangan': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            'Laporan': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
            'Purchase Order': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
            'B2B': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
            'Master Data': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
            'Sistem': 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
            'Approval': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
        };
        return colors[category] || 'bg-muted text-muted-foreground';
    };

    const ProcedureCard = ({ procedure }: { procedure: GuideProcedure }) => {
        const isExpanded = expandedProcedures.includes(procedure.id);
        const Icon = procedure.icon;

        return (
            <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-300">
                {/* Gradient accent */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-0 group-hover:opacity-100 transition-opacity" />

                <Collapsible open={isExpanded} onOpenChange={() => toggleProcedure(procedure.id)}>
                    <CollapsibleTrigger className="w-full text-left">
                        <div className="p-5 flex items-start gap-4">
                            {/* Icon */}
                            <div className={cn(
                                "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                                getCategoryColor(procedure.category)
                            )}>
                                <Icon className="w-6 h-6" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-foreground truncate">
                                        {procedure.title}
                                    </h3>
                                    <Badge variant="outline" className={cn("text-xs", getCategoryColor(procedure.category))}>
                                        {procedure.category}
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {procedure.description}
                                </p>
                                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{procedure.steps.length} langkah</span>
                                </div>
                            </div>

                            {/* Expand indicator */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                            </div>
                        </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                        <div className="px-5 pb-5">
                            {/* Steps */}
                            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                                <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-primary" />
                                    Langkah-langkah:
                                </h4>
                                <div className="space-y-2">
                                    {procedure.steps.map((step, index) => (
                                        <div
                                            key={step.step}
                                            className="flex gap-3 p-3 bg-background rounded-lg border border-border/50"
                                        >
                                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-sm flex items-center justify-center">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-foreground">
                                                    {step.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {step.description}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Link to page */}
                            {procedure.href && (
                                <div className="mt-4 flex justify-end">
                                    <Button asChild size="sm" className="gap-2">
                                        <Link to={procedure.href}>
                                            Buka Halaman
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        );
    };

    return (
        <MainLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/10 p-8">
                    <div className="absolute inset-0 bg-grid-white/5 [mask-image:linear-gradient(0deg,transparent,white)]" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">
                                    Panduan Pengguna
                                </h1>
                                <p className="text-muted-foreground">
                                    SOP dan prosedur untuk role <span className="font-medium text-primary">{getRoleTitle()}</span>
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-4 max-w-2xl">
                            Temukan panduan lengkap untuk setiap fitur dan proses dalam sistem.
                            Klik pada prosedur untuk melihat langkah-langkah detail.
                        </p>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari prosedur..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setSelectedCategory(null);
                            }}
                            className="pl-10"
                        />
                    </div>

                    {/* Category filter */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={selectedCategory === null ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                                setSelectedCategory(null);
                                setSearchQuery('');
                            }}
                        >
                            Semua
                        </Button>
                        {categories.map(category => (
                            <Button
                                key={category}
                                variant={selectedCategory === category ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                    setSelectedCategory(category);
                                    setSearchQuery('');
                                }}
                                className={cn(
                                    selectedCategory !== category && getCategoryColor(category),
                                    "border"
                                )}
                            >
                                {category}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Procedures Grid */}
                {procedures.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {procedures.map(procedure => (
                            <ProcedureCard key={procedure.id} procedure={procedure} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                            <Search className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-medium text-foreground mb-1">
                            Tidak ada prosedur ditemukan
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Coba ubah kata kunci pencarian atau filter kategori
                        </p>
                    </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-card border border-border">
                        <div className="text-2xl font-bold text-foreground">
                            {procedures.length}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Total Prosedur
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                        <div className="text-2xl font-bold text-foreground">
                            {categories.length}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Kategori
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                        <div className="text-2xl font-bold text-foreground">
                            {procedures.reduce((acc, p) => acc + p.steps.length, 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Total Langkah
                        </div>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                        <div className="text-2xl font-bold text-primary">
                            {getRoleTitle()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Role Anda
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
