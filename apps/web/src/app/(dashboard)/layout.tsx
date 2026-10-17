'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppShell } from '@nexus/ui';
import { CommandPalette } from '@/components/command-palette';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);

  // Global Ctrl/Cmd + K shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus-token');
    router.push('/login');
  };

  return (
    <>
      <AppShell
        currentPath={pathname}
        workspaceName="Acme Corp"
        userName="Arthur Dent"
        userEmail="founder@acme.inc"
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        onSearchClick={() => setCommandPaletteOpen(true)}
      >
        {children}
      </AppShell>

      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </>
  );
}
