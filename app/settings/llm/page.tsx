'use client';

/**
 * LLM Key Settings Page
 * 
 * Manage LLM API keys for CrewAI tasks
 * Supports two methods:
 * - Request header: Stored in localStorage, sent with each request
 * - User config: Stored on server, requires [llm-key-config] extra
 * 
 * Note: Environment variables (OPENAI_API_KEY) are automatically read by CrewAI/LiteLLM
 */

import { Container, Title, TextInput, Button, Group, Text, Alert, Stack, Select } from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/aipartnerupflow';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle, IconKey } from '@tabler/icons-react';

export default function LLMKeySettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [headerKey, setHeaderKey] = useState('');
  const [headerProvider, setHeaderProvider] = useState<string>('');
  const [configKey, setConfigKey] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // Load header key from localStorage and parse provider:key format
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('llm_api_key');
      if (stored) {
        // Parse provider:key format
        const colonIndex = stored.indexOf(':');
        if (colonIndex > 0) {
          // Has provider prefix
          const provider = stored.substring(0, colonIndex);
          const key = stored.substring(colonIndex + 1);
          setHeaderProvider(provider);
          setHeaderKey(key);
        } else {
          // No provider prefix, just key (backward compatible)
          setHeaderProvider('');
          setHeaderKey(stored);
        }
      }
    }
  }, []);

  // Check if user config key exists
  const { data: keyStatus } = useQuery({
    queryKey: ['llm-key-status', selectedProvider],
    queryFn: () => apiClient.getLLMKeyStatus(selectedProvider || undefined),
    retry: false,
  });

  // Provider options for LLM providers
  const providerOptions = [
    { value: '', label: 'Auto-detect (default)' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic (Claude)' },
    { value: 'google', label: 'Google (Gemini)' },
    { value: 'mistral', label: 'Mistral AI' },
    { value: 'cohere', label: 'Cohere' },
    { value: 'groq', label: 'Groq' },
    { value: 'together', label: 'Together AI' },
    { value: 'ai21', label: 'AI21' },
    { value: 'replicate', label: 'Replicate' },
    { value: 'huggingface', label: 'Hugging Face' },
    { value: 'ollama', label: 'Ollama' },
  ];

  const setHeaderKeyMutation = useMutation({
    mutationFn: ({ key, provider }: { key: string; provider?: string }) => {
      if (typeof window !== 'undefined') {
        if (key) {
          // Format: provider:key if provider is specified, otherwise just key
          const formattedKey = provider ? `${provider}:${key}` : key;
          localStorage.setItem('llm_api_key', formattedKey);
        } else {
          localStorage.removeItem('llm_api_key');
        }
      }
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      notifications.show({
        title: t('common.success') || 'Success',
        message: 'LLM key saved to browser (sent with each request)',
        color: 'green',
      });
    },
  });

  const setConfigKeyMutation = useMutation({
    mutationFn: (key: string) => apiClient.setLLMKey(key, selectedProvider || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llm-key-status'] });
      setConfigKey('');
      notifications.show({
        title: t('common.success') || 'Success',
        message: `LLM key saved to server${selectedProvider ? ` for ${selectedProvider}` : ''}`,
        color: 'green',
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.message || 'Failed to save LLM key',
        color: 'red',
      });
    },
  });

  const deleteConfigKeyMutation = useMutation({
    mutationFn: () => apiClient.deleteLLMKey(selectedProvider || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['llm-key-status'] });
      notifications.show({
        title: t('common.success') || 'Success',
        message: `LLM key deleted from server${selectedProvider ? ` for ${selectedProvider}` : ''}`,
        color: 'green',
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error') || 'Error',
        message: error.message || 'Failed to delete LLM key',
        color: 'red',
      });
    },
  });

  return (
    <Container size="md">
      <Title order={1} mb="xl">LLM API Key Settings</Title>

      <Stack gap="xl">
        {/* Method 1: Request Header */}
        <div>
          <Title order={3} mb="md">Method 1: Request Header (Demo Usage)</Title>
          <Text c="dimmed" mb="md">
            Store LLM key in browser. Key is sent with each request via X-LLM-API-KEY header.
            Suitable for demo/one-time usage. Key is not stored on server.
          </Text>
          <Group>
            <Select
              placeholder="Select provider (optional)"
              label="Provider"
              value={headerProvider}
              onChange={(value) => setHeaderProvider(value || '')}
              data={providerOptions}
              clearable
              style={{ width: 200 }}
            />
            <TextInput
              placeholder="sk-..."
              label="API Key"
              value={headerKey}
              onChange={(e) => setHeaderKey(e.target.value)}
              type="password"
              style={{ flex: 1 }}
            />
            <Button
              onClick={() => setHeaderKeyMutation.mutate({ key: headerKey, provider: headerProvider || undefined })}
              loading={setHeaderKeyMutation.isPending}
              disabled={!headerKey}
            >
              Save
            </Button>
            {(headerKey || headerProvider) && (
              <Button
                variant="outline"
                color="red"
                onClick={() => {
                  setHeaderKey('');
                  setHeaderProvider('');
                  setHeaderKeyMutation.mutate({ key: '' });
                }}
              >
                Clear
              </Button>
            )}
          </Group>
        </div>

        {/* Method 2: User Config */}
        <div>
          <Title order={3} mb="md">Method 2: User Config (Multi-User)</Title>
          <Text c="dimmed" mb="md">
            Store LLM key on server. Requires aipartnerupflow[llm-key-config] extra.
            Suitable for multi-user scenarios. Key is stored in server memory (not database).
          </Text>
          
          {keyStatus?.has_key ? (
            <Alert icon={<IconInfoCircle size={16} />} color="blue" mb="md">
              You have a LLM key configured on the server.
            </Alert>
          ) : (
            <Alert icon={<IconInfoCircle size={16} />} color="yellow" mb="md">
              No LLM key configured on server.
            </Alert>
          )}

          <Group>
            <Select
              placeholder="Select provider (optional)"
              label="Provider"
              value={selectedProvider}
              onChange={(value) => setSelectedProvider(value || '')}
              data={providerOptions}
              clearable
              style={{ width: 200 }}
            />
            <TextInput
              placeholder="sk-..."
              label="API Key"
              value={configKey}
              onChange={(e) => setConfigKey(e.target.value)}
              type="password"
              style={{ flex: 1 }}
            />
            <Button
              onClick={() => setConfigKeyMutation.mutate(configKey)}
              loading={setConfigKeyMutation.isPending}
              disabled={!configKey}
            >
              Save to Server
            </Button>
            {keyStatus?.has_key && (
              <Button
                variant="outline"
                color="red"
                onClick={() => deleteConfigKeyMutation.mutate()}
                loading={deleteConfigKeyMutation.isPending}
              >
                Delete
              </Button>
            )}
          </Group>
          
          {keyStatus?.providers && Object.keys(keyStatus.providers).length > 0 && (
            <Alert icon={<IconInfoCircle size={16} />} color="blue" mt="md">
              <Text size="sm">
                <strong>Configured providers:</strong>{' '}
                {Object.keys(keyStatus.providers).join(', ')}
              </Text>
            </Alert>
          )}
        </div>

        {/* Priority Info */}
        <Alert icon={<IconInfoCircle size={16} />} color="blue">
          <Text size="sm">
            <strong>Priority:</strong> Request Header &gt; User Config &gt; Environment Variable (OPENAI_API_KEY)
            <br />
            If multiple methods are configured, the highest priority method will be used.
            <br />
            Note: Environment variables are automatically read by CrewAI/LiteLLM.
          </Text>
        </Alert>
      </Stack>
    </Container>
  );
}

