'use client';

/**
 * App Shell Component
 * 
 * Main layout wrapper with AppShell and Navbar (left sidebar only)
 */

import { AppShell as MantineAppShell } from '@mantine/core';
import { AppNavbar } from './Navbar';

interface AppShellWrapperProps {
  children: React.ReactNode;
}

export function AppShellWrapper({ children }: AppShellWrapperProps) {
  return (
    <MantineAppShell
      navbar={{ width: 260, breakpoint: 'sm' }}
      padding="md"
    >
      <AppNavbar />
      <MantineAppShell.Main style={{ transition: 'background-color 0.2s ease' }}>
        {children}
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}
