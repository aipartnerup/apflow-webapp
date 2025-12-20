'use client';

/**
 * App Shell Component
 * 
 * Main layout wrapper with AppShell and Navbar (left sidebar only)
 */

import { AppShell as MantineAppShell, Burger } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { AppNavbar } from './Navbar';
import { useAutoLoginContext } from '@/lib/contexts/AutoLoginContext';
import { useEffect } from 'react';

interface AppShellWrapperProps {
  children: React.ReactNode;
}

export function AppShellWrapper({ children }: AppShellWrapperProps) {
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  
  // Get auto-login status from context
  const autoLoginStatus = useAutoLoginContext();
  
  useEffect(() => {
    // Auto-login detection runs automatically via AutoLoginProvider
    // The status can be used for future features like showing notifications
    if (autoLoginStatus.enabled && autoLoginStatus.verified) {
      // Auto-login is enabled and verified
      // Future: Could show a notification or update UI state here
      console.debug('Auto-login enabled and verified');
    }
  }, [autoLoginStatus]);

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened },
      }}
      padding="md"
    >
      <MantineAppShell.Header>
        <Burger
          opened={mobileOpened}
          onClick={toggleMobile}
          hiddenFrom="sm"
          size="sm"
          style={{ margin: 'var(--mantine-spacing-md)' }}
        />
        <Burger
          opened={desktopOpened}
          onClick={toggleDesktop}
          visibleFrom="sm"
          size="sm"
          style={{ margin: 'var(--mantine-spacing-md)' }}
        />
      </MantineAppShell.Header>
      <AppNavbar onNavigate={closeMobile} />
      <MantineAppShell.Main style={{ transition: 'background-color 0.2s ease' }}>
        {children}
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}
