import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useGlobalRealtimeUpdates } from '@/hooks/useGlobalRealtimeUpdates';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  /** Action buttons to show in header (e.g., Export, Add New) */
  actions?: ReactNode;
}

export default function MainLayout({ children, title, subtitle, actions }: MainLayoutProps) {
  // Subscribe to real-time updates for all approval tables
  useGlobalRealtimeUpdates();
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:pl-20 flex flex-col h-screen overflow-hidden relative">
        {/* Decorative gradient background — lightweight, no blur filter */}
        <div
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 50% at 90% 10%, hsl(var(--primary) / 0.04), transparent),
              radial-gradient(ellipse 40% 40% at 15% 85%, hsl(199 89% 48% / 0.03), transparent),
              radial-gradient(ellipse 50% 50% at 50% 50%, hsl(38 92% 50% / 0.02), transparent)
            `,
          }}
        />

        <Header title={title} subtitle={subtitle} actions={actions} />
        <main className="flex-1 overflow-y-auto z-10 p-8 pb-28 md:pb-8 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
