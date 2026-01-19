'use client';

/**
 * Navigation Bar Component
 * 
 * Left sidebar navigation with menu items, sub-menus, and bottom controls
 */

import { AppShell, NavLink, Group, Text, Select, Divider, Stack, Switch, Burger } from '@mantine/core';
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
  mobileOpened?: boolean;
  desktopOpened?: boolean;
  onToggleMobile?: () => void;
  onToggleDesktop?: () => void;
}

export function AppNavbar({ onNavigate, mobileOpened, desktopOpened, onToggleMobile, onToggleDesktop }: AppNavbarProps) {
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
  const isCollapsed = !desktopOpened;

  return (
    <AppShell.Navbar p="xs" style={{ overflowY: 'auto' }}>
      <AppShell.Section style={{ flexShrink: 0 }}>
        <Group 
          p="xs" 
          gap="xs" 
          wrap="nowrap" 
          style={{ 
            width: '100%',
            justifyContent: isCollapsed ? 'center' : 'flex-start'
          }}
        >
          {/* Burger button - always visible */}
          {onToggleMobile && (
            <Burger
              opened={mobileOpened}
              onClick={onToggleMobile}
              hiddenFrom="sm"
              size="sm"
              className="navbar-burger-button"
              style={{ flexShrink: 0 }}
            />
          )}
          {onToggleDesktop && (
            <Burger
              opened={desktopOpened}
              onClick={onToggleDesktop}
              visibleFrom="sm"
              size="sm"
              className="navbar-burger-button"
              style={{ flexShrink: 0 }}
            />
          )}
          <Image
            src="/logo.svg"
            alt="apflow Logo"
            width={32}
            height={32}
            style={{ objectFit: 'contain', flexShrink: 0 }}
            className="navbar-logo"
          />
          {!isCollapsed && (
            <Text 
              fw={700} 
              size="lg" 
              style={{ userSelect: 'none', flexShrink: 0 }}
              className="navbar-brand-text"
            >
              apflow
            </Text>
          )}
        </Group>
      </AppShell.Section>

      <AppShell.Section grow mt={0}>
        <NavLink
          label={isCollapsed ? '' : t('nav.dashboard')}
          leftSection={<IconDashboard size={18} />}
          active={isActive('/')}
          onClick={() => {
            router.push('/');
            onNavigate?.();
          }}
          style={{ 
            marginBottom: 2,
            justifyContent: isCollapsed ? 'center' : 'flex-start'
          }}
          className={isCollapsed ? 'collapsed-navlink' : ''}
        />

        {isCollapsed ? (
          <>
            <NavLink
              label=""
              leftSection={<IconList size={18} />}
              active={isActive('/tasks')}
              onClick={() => {
                router.push('/tasks');
                onNavigate?.();
              }}
              style={{ 
                marginBottom: 2,
                justifyContent: 'center'
              }}
              className="collapsed-navlink"
            />
            <NavLink
              label=""
              leftSection={<IconPlus size={18} />}
              active={isActive('/tasks/create')}
              onClick={() => {
                router.push('/tasks/create');
                onNavigate?.();
              }}
              style={{ 
                marginBottom: 2,
                justifyContent: 'center'
              }}
              className="collapsed-navlink"
            />
            <NavLink
              label=""
              leftSection={<IconPlayerPlay size={18} />}
              active={isActive('/tasks/running')}
              onClick={() => {
                router.push('/tasks/running');
                onNavigate?.();
              }}
              style={{ 
                marginBottom: 2,
                justifyContent: 'center'
              }}
              className="collapsed-navlink"
            />
          </>
        ) : (
          <NavLink
            label={t('nav.taskManagement')}
            leftSection={<IconList size={18} />}
            rightSection={<IconChevronRight size={16} />}
            style={{ marginBottom: 2 }}
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
        )}

        <NavLink
          label={isCollapsed ? '' : t('nav.settings')}
          leftSection={<IconSettings size={18} />}
          rightSection={!isCollapsed ? <IconChevronRight size={16} /> : undefined}
          style={{ 
            marginBottom: 2,
            justifyContent: isCollapsed ? 'center' : 'flex-start'
          }}
          className={isCollapsed ? 'collapsed-navlink' : ''}
        >
          {!isCollapsed && (
            <>
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
            </>
          )}
        </NavLink>
      </AppShell.Section>

      <AppShell.Section>
        {!isCollapsed && <Divider my={4} />}
        <Stack p="xs" gap={4}>
          <NavLink
            label={isCollapsed ? '' : (mounted && colorScheme === 'dark' ? t('common.lightMode') : t('common.darkMode'))}
            leftSection={mounted && colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            onClick={toggleColorScheme}
            style={{ 
              cursor: 'pointer',
              borderRadius: 'var(--mantine-radius-md)',
              justifyContent: isCollapsed ? 'center' : 'flex-start'
            }}
            className={isCollapsed ? 'collapsed-navlink' : ''}
          />
          {!isCollapsed && (
            <>
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
              <Divider my={4} />
              {mounted && (
                <Group gap="xs" p="xs" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
                  <IconTestPipe size={18} style={{ flexShrink: 0, color: colorScheme === 'dark' ? undefined : 'var(--mantine-color-gray-9)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} truncate c={colorScheme === 'dark' ? undefined : 'var(--mantine-color-gray-9)'}>
                      Demo Mode
                    </Text>
                    <Text size="xs" c={colorScheme === 'dark' ? 'dimmed' : 'gray.7'} truncate>
                      Use demo data for execution
                    </Text>
                  </div>
                  <Switch
                    checked={useDemo}
                    onChange={(event) => setUseDemo(event.currentTarget.checked)}
                    size="sm"
                  />
                </Group>
              )}
              <Divider my={4} />
              <NavLink
                label="WebApp"
                leftSection={<IconBrandGithub size={18} />}
                href="https://github.com/aipartnerup/apflow-webapp"
                target="_blank"
                rel="noopener noreferrer"
                component="a"
                style={{ 
                  cursor: 'pointer',
                  borderRadius: 'var(--mantine-radius-md)',
                  marginTop: 0,
                }}
              />
              <NavLink
                label="API Server"
                leftSection={<IconBrandGithub size={18} />}
                href="https://github.com/aipartnerup/apflow-demo"
                target="_blank"
                rel="noopener noreferrer"
                component="a"
                style={{ 
                  cursor: 'pointer',
                  borderRadius: 'var(--mantine-radius-md)',
                  marginTop: 0,
                }}
              />
            </>
          )}
          {isCollapsed && (
            <>
              <NavLink
                label=""
                leftSection={<IconLanguage size={18} />}
                style={{ 
                  justifyContent: 'center'
                }}
                className="collapsed-navlink"
              />
              <NavLink
                label=""
                leftSection={<IconTestPipe size={18} />}
                style={{ 
                  justifyContent: 'center'
                }}
                className="collapsed-navlink"
              />
              <NavLink
                label=""
                leftSection={<IconBrandGithub size={18} />}
                href="https://github.com/aipartnerup/apflow-webapp"
                target="_blank"
                rel="noopener noreferrer"
                component="a"
                style={{ 
                  cursor: 'pointer',
                  borderRadius: 'var(--mantine-radius-md)',
                  justifyContent: 'center'
                }}
                className="collapsed-navlink"
              />
            </>
          )}
        </Stack>
      </AppShell.Section>
    </AppShell.Navbar>
  );
}

