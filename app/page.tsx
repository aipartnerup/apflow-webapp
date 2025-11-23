'use client';

/**
 * Dashboard Page
 * 
 * Main dashboard showing task statistics and recent tasks
 */

import { Container, Title, Grid, Card, Text, Group, Badge, Stack } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/aipartnerupflow';
import { useTranslation } from 'react-i18next';
import { IconList, IconCheck, IconX, IconClock } from '@tabler/icons-react';

export default function DashboardPage() {
  const { t } = useTranslation();

  const { data: runningTasks, isLoading: loadingRunning } = useQuery({
    queryKey: ['running-tasks'],
    queryFn: () => apiClient.getRunningTasks(),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: runningCount } = useQuery({
    queryKey: ['running-count'],
    queryFn: () => apiClient.getRunningTaskCount(),
    refetchInterval: 5000,
  });

  // Get all tasks for statistics
  const { data: allTasks, isLoading: loadingAll } = useQuery({
    queryKey: ['all-tasks-stats'],
    queryFn: () => apiClient.listTasks({ limit: 1000 }), // Get up to 1000 tasks for stats
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Calculate statistics from all tasks
  const totalTasks = allTasks?.length || 0;
  const completedTasks = allTasks?.filter(task => task.status === 'completed').length || 0;
  const failedTasks = allTasks?.filter(task => task.status === 'failed').length || 0;

  return (
    <Container size="xl">
      <Title order={1} mb="xl">{t('dashboard.title')}</Title>

      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">{t('dashboard.runningTasks')}</Text>
                <Text fw={700} size="xl">
                  {loadingRunning ? '...' : runningCount?.count || 0}
                </Text>
              </div>
              <IconClock size={32} color="var(--mantine-color-blue-6)" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">{t('dashboard.totalTasks')}</Text>
                <Text fw={700} size="xl">
                  {loadingAll ? '...' : totalTasks}
                </Text>
              </div>
              <IconList size={32} color="var(--mantine-color-gray-6)" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">{t('dashboard.completedTasks')}</Text>
                <Text fw={700} size="xl">
                  {loadingAll ? '...' : completedTasks}
                </Text>
              </div>
              <IconCheck size={32} color="var(--mantine-color-green-6)" />
            </Group>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">{t('dashboard.failedTasks')}</Text>
                <Text fw={700} size="xl">
                  {loadingAll ? '...' : failedTasks}
                </Text>
              </div>
              <IconX size={32} color="var(--mantine-color-red-6)" />
            </Group>
          </Card>
        </Grid.Col>
      </Grid>

      <Card shadow="sm" padding="lg" radius="md" withBorder mt="xl">
        <Title order={3} mb="md">{t('dashboard.runningTasks')}</Title>
        {loadingRunning ? (
          <Text c="dimmed">{t('common.loading')}</Text>
        ) : runningTasks && runningTasks.length > 0 ? (
          <Stack gap="sm">
            {runningTasks.map((task) => (
              <Group key={task.id} justify="space-between" p="sm" style={{ border: '1px solid var(--mantine-color-gray-3)', borderRadius: '4px' }}>
                <div>
                  <Text fw={500}>{task.name}</Text>
                  <Text size="sm" c="dimmed">{task.id}</Text>
                </div>
                <Group>
                  <Badge color={task.status === 'in_progress' ? 'blue' : 'gray'}>
                    {task.status}
                  </Badge>
                  <Text size="sm" c="dimmed">
                    {Math.round((task.progress || 0) * 100)}%
                  </Text>
                </Group>
              </Group>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed">{t('tasks.noTasks')}</Text>
        )}
      </Card>
    </Container>
  );
}
