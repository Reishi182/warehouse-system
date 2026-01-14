import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-20 flex items-center justify-between px-8 border-b border-border bg-white/60 backdrop-blur-xl">
      {/* Breadcrumb */}
      <div className="hidden md:flex items-center text-muted-foreground text-sm font-medium">
        <span>Overview</span>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-foreground">{title}</span>
      </div>

      {/* Mobile Title */}
      <div className="md:hidden">
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
      </div>

      {/* Action Buttons */}
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}
