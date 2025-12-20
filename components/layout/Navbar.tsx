'use client';

/**
 * Navigation Bar Component
 * 
 * Left sidebar navigation with menu items, sub-menus, and bottom controls
 */

import { AppShell, NavLink, Group, Text, Select, Divider, Stack, Switch } from '@mantine/core';
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
  IconBrandGithub,
  IconTestPipe,
} from '@tabler/icons-react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useUseDemo } from '@/lib/contexts/UseDemoContext';

interface AppNavbarProps {
  onNavigate?: () => void;
}

export function AppNavbar({ onNavigate }: AppNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, i18n } = useTranslation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { useDemo, setUseDemo } = useUseDemo();
  const [language, setLanguage] = useState(i18n.language);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
            src="/logo.svg"
            alt="AIPartnerUpFlow Logo"
            width={32}
            height={32}
            style={{ objectFit: 'contain' }}
          />
          <Text 
            fw={700} 
            size="lg" 
            style={{ userSelect: 'none' }}
            className="navbar-brand-text"
          >
            AIPartnerUpFlow
          </Text>
        </Group>
      </AppShell.Section>

      <AppShell.Section grow mt="md">
        <NavLink
          label={t('nav.dashboard')}
          leftSection={<IconDashboard size={18} />}
          active={isActive('/')}
          onClick={() => {
            router.push('/');
            onNavigate?.();
          }}
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
            onClick={() => {
              router.push('/tasks');
              onNavigate?.();
            }}
            pl="xl"
          />
          <NavLink
            label={t('nav.createTask')}
            leftSection={<IconPlus size={18} />}
            active={isActive('/tasks/create')}
            onClick={() => {
              router.push('/tasks/create');
              onNavigate?.();
            }}
            pl="xl"
          />
          <NavLink
            label={t('nav.runningTasks')}
            leftSection={<IconPlayerPlay size={18} />}
            active={isActive('/tasks/running')}
            onClick={() => {
              router.push('/tasks/running');
              onNavigate?.();
            }}
            pl="xl"
          />
        </NavLink>

        <NavLink
          label={t('nav.settings')}
          leftSection={<IconSettings size={18} />}
          rightSection={<IconChevronRight size={16} />}
          style={{ marginBottom: 'var(--mantine-spacing-xs)' }}
        >
          <NavLink
            label={t('nav.apiSettings')}
            active={isActive('/settings') && !isActive('/settings/llm')}
            onClick={() => {
              router.push('/settings');
              onNavigate?.();
            }}
            pl="xl"
          />
          <NavLink
            label={t('nav.llmSettings')}
            active={isActive('/settings/llm')}
            onClick={() => {
              router.push('/settings/llm');
              onNavigate?.();
            }}
            pl="xl"
          />
        </NavLink>
      </AppShell.Section>

      <AppShell.Section>
        <Divider my="md" />
        <Stack p="md" gap="sm">
          <NavLink
            label={mounted && colorScheme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
            leftSection={mounted && colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
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
          <Divider my="xs" />
          <Group gap="xs" p="xs" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
            <IconTestPipe size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={500} truncate>
                Demo Mode
              </Text>
              <Text size="xs" c="dimmed" truncate>
                Use demo data for execution
              </Text>
            </div>
            <Switch
              checked={useDemo}
              onChange={(event) => setUseDemo(event.currentTarget.checked)}
              size="sm"
            />
          </Group>
          <Divider my="xs" />
          <NavLink
            label="WebApp"
            leftSection={<IconBrandGithub size={18} />}
            href="https://github.com/aipartnerup/aipartnerupflow-webapp"
            target="_blank"
            rel="noopener noreferrer"
            component="a"
            style={{ 
              cursor: 'pointer',
              borderRadius: 'var(--mantine-radius-md)',
            }}
          />
          <NavLink
            label="API Server"
            leftSection={<IconBrandGithub size={18} />}
            href="https://github.com/aipartnerup/aipartnerupflow-demo"
            target="_blank"
            rel="noopener noreferrer"
            component="a"
            style={{ 
              cursor: 'pointer',
              borderRadius: 'var(--mantine-radius-md)',
            }}
          />
        </Stack>
      </AppShell.Section>
    </AppShell.Navbar>
  );
}

