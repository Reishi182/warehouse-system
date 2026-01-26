import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { NotificationBell } from './NotificationBell';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 min-h-16 sm:h-20 flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-8 py-3 sm:py-0 border-b border-border bg-background/60 backdrop-blur-xl gap-2 sm:gap-0">
      {/* Title Section */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumb - Desktop */}
        <div className="hidden md:flex items-center text-muted-foreground text-sm font-medium">
          <span>Overview</span>
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-foreground">{title}</span>
        </div>

        {/* Mobile Title */}
        <div className="md:hidden">
          <h1 className="text-base sm:text-lg font-bold text-foreground truncate">{title}</h1>
        </div>
      </div>

      {/* Action Buttons & Notifications - Responsive */}
      <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end sm:justify-start">
        <NotificationBell />
        {actions}
      </div>
    </header>
  );
}

