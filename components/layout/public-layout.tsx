import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className={cn('min-h-screen bg-background')}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-elevation-2"
      >
        Skip to content
      </a>
      <main id="main-content" className="min-h-screen">
        {children}
      </main>
    </div>
  );
}
