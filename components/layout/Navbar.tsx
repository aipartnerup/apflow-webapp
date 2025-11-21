'use client';

/**
 * Navigation Bar Component
 * 
 * Left sidebar navigation with menu items, sub-menus, and bottom controls
 */

import { AppShell, NavLink, Group, Text, Select, Divider } from '@mantine/core';
import { useMantineColorScheme } from '@mantine/core';
import {
  IconDashboard,
  IconList,
  IconPlus,
  IconPlayerPlay,
  IconSettings,
  IconChevronRight,
  IconLanguage,
  IconSun,
  IconMoon,
} from '@tabler/icons-react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export function AppNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, i18n } = useTranslation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const [language, setLanguage] = useState(i18n.language);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') || 'en';
      setLanguage(savedLanguage);
      i18n.changeLanguage(savedLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLanguageChange = (value: string | null) => {
    if (value) {
      setLanguage(value);
      i18n.changeLanguage(value);
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', value);
      }
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <AppShell.Navbar p="md">
      <AppShell.Section>
        <Group p="md" gap="sm">
          <Image
            src="/logo.png"
            alt="AIPartnerUpFlow Logo"
            width={28}
            height={28}
            style={{ objectFit: 'contain' }}
          />
          <Text fw={700} size="lg" style={{ userSelect: 'none' }}>
            AIPartnerUpFlow
          </Text>
        </Group>
      </AppShell.Section>

      <AppShell.Section grow mt="md">
        <NavLink
          label={t('nav.dashboard')}
          leftSection={<IconDashboard size={18} />}
          active={isActive('/')}
          onClick={() => router.push('/')}
          style={{ marginBottom: 'var(--mantine-spacing-xs)' }}
        />

        <NavLink
          label={t('nav.taskManagement')}
          leftSection={<IconList size={18} />}
          rightSection={<IconChevronRight size={16} />}
          style={{ marginBottom: 'var(--mantine-spacing-xs)' }}
        >
          <NavLink
            label={t('nav.taskList')}
            active={isActive('/tasks')}
            onClick={() => router.push('/tasks')}
            pl="xl"
          />
          <NavLink
            label={t('nav.createTask')}
            leftSection={<IconPlus size={18} />}
            active={isActive('/tasks/create')}
            onClick={() => router.push('/tasks/create')}
            pl="xl"
          />
          <NavLink
            label={t('nav.runningTasks')}
            leftSection={<IconPlayerPlay size={18} />}
            active={isActive('/tasks/running')}
            onClick={() => router.push('/tasks/running')}
            pl="xl"
          />
        </NavLink>

        <NavLink
          label={t('nav.settings')}
          leftSection={<IconSettings size={18} />}
          active={isActive('/settings')}
          onClick={() => router.push('/settings')}
          style={{ marginBottom: 'var(--mantine-spacing-xs)' }}
        />
      </AppShell.Section>

      <AppShell.Section>
        <Divider my="md" />
        <Group p="md" gap="sm" direction="column">
          <NavLink
            label={colorScheme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
            leftSection={colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            onClick={toggleColorScheme}
            style={{ 
              cursor: 'pointer',
              borderRadius: 'var(--mantine-radius-md)',
            }}
          />
          <Select
            leftSection={<IconLanguage size={16} />}
            value={language}
            onChange={handleLanguageChange}
            data={[
              { value: 'en', label: 'English' },
              { value: 'zh', label: '中文' },
            ]}
            style={{ width: '100%' }}
          />
        </Group>
      </AppShell.Section>
    </AppShell.Navbar>
  );
}

