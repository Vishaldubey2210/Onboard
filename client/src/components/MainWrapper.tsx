'use client';

import { usePathname } from 'next/navigation';

export function MainWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Full-width pages (no max-width constraint, no padding)
  const isFullWidth = pathname === '/' || pathname === '/login';

  if (isFullWidth) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
      {children}
    </main>
  );
}
