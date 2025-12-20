'use client';

/**
 * General Settings Page
 * 
 * Configure API settings and authentication
 * Behavior controlled by environment variables:
 * - NEXT_PUBLIC_SHOW_AUTH_SETTINGS: Show/hide auth token settings
 * - NEXT_PUBLIC_AUTO_LOGIN_PATH: Path to auto-login endpoint (e.g., /auth/auto-login)
 */

import { Container, Title, Card, Stack, TextInput, Button, Text, Alert, Badge } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { useEffect } from 'react';
import { useAutoLoginContext } from '@/lib/contexts/AutoLoginContext';

interface SettingsFormValues {
  apiUrl: string;
  authToken: string;
}

export default function SettingsPage() {
  const { t } = useTranslation();

  // Read environment variables (with defaults)
  const showAuthSettings = process.env.NEXT_PUBLIC_SHOW_AUTH_SETTINGS !== 'false';
  // Use auto-login context to get auto-login status (includes verification)
  const autoLoginStatus = useAutoLoginContext();
  const autoLoginEnabled = autoLoginStatus.enabled;

  const form = useForm<SettingsFormValues>({
    initialValues: {
      apiUrl: typeof window !== 'undefined' ? localStorage.getItem('api_url') || 'http://localhost:8000' : 'http://localhost:8000',
      authToken: typeof window !== 'undefined' ? localStorage.getItem('auth_token') || '' : '',
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const apiUrl = localStorage.getItem('api_url') || 'http://localhost:8000';
      const authToken = localStorage.getItem('auth_token') || '';
      
      // Only update if values are different to avoid unnecessary re-renders
      if (form.values.apiUrl !== apiUrl || form.values.authToken !== authToken) {
        form.setValues({
          apiUrl,
          authToken,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (values: SettingsFormValues) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('api_url', values.apiUrl);
      if (values.authToken) {
        localStorage.setItem('auth_token', values.authToken);
      } else {
        localStorage.removeItem('auth_token');
      }
      notifications.show({
        title: t('common.success'),
        message: t('settings.saveSettings') + ' ' + t('common.success'),
        color: 'green',
      });
    }
  };

  return (
    <Container size="md">
      <Title order={1} mb="xl">{t('settings.title')}</Title>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {/* API URL Configuration */}
            <div>
              <Title order={3} mb="md">{t('settings.api')}</Title>
              <TextInput
                label={t('settings.apiUrl')}
                placeholder={t('settings.apiUrlPlaceholder')}
                {...form.getInputProps('apiUrl')}
              />
            </div>

            {/* Authentication Section */}
            <div>
              <Title order={3} mb="md">{t('settings.authentication')}</Title>
              
              {/* Auto-login enabled: Show friendly message */}
              {autoLoginEnabled && (
                <>
                  <Alert color="green" mb="md">
                    <Text size="sm" fw={500} mb="xs">
                      {t('settings.autoLoginEnabled')}
                    </Text>
                    <Text size="sm">
                      {t('settings.autoLoginMessage')}
                    </Text>
                  </Alert>
                  <Badge color="green" variant="light">
                    {t('settings.autoLoginBadge')}
                  </Badge>
                </>
              )}

              {/* Show auth settings: Developer mode */}
              {showAuthSettings && !autoLoginEnabled && (
                <>
                  <TextInput
                    label={t('settings.authToken')}
                    placeholder={t('settings.authTokenPlaceholder')}
                    type="password"
                    {...form.getInputProps('authToken')}
                  />
                  <Text size="sm" c="dimmed" mt="xs">
                    {t('settings.authTokenHelp')}
                  </Text>
                </>
              )}

              {/* Hide auth settings: User mode */}
              {!showAuthSettings && !autoLoginEnabled && (
                <Alert color="yellow">
                  <Text size="sm">
                    {t('settings.authRequired')}
                  </Text>
                </Alert>
              )}
            </div>

            <Button type="submit" mt="md">
              {t('settings.saveSettings')}
            </Button>
          </Stack>
        </form>
      </Card>
    </Container>
  );
}

