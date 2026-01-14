import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  /** Action buttons to show in header (e.g., Export, Add New) */
  actions?: ReactNode;
}

export default function MainLayout({ children, title, subtitle, actions }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:pl-20 flex flex-col h-screen overflow-hidden relative">
        {/* Decorative gradient blobs */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-10%] left-[10%] w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-[120px]"></div>
          <div className="absolute top-[40%] left-[40%] w-[500px] h-[500px] bg-amber-50/60 rounded-full blur-[120px]"></div>
        </div>

        <Header title={title} subtitle={subtitle} actions={actions} />
        <main className="flex-1 overflow-y-auto z-10 p-8 pb-28 md:pb-8 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
