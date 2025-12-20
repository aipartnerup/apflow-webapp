'use client';

/**
 * Running Tasks Page
 * 
 * Display all currently running tasks with real-time updates
 */

import { Container, Title, Group, Card, Text, Badge, Stack, Progress, Button, ActionIcon } from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/aipartnerupflow';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { IconRefresh, IconX, IconEye } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

export default function RunningTasksPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: runningTasks, isLoading } = useQuery({
    queryKey: ['running-tasks'],
    queryFn: () => apiClient.getRunningTasks(),
    refetchInterval: 3000, // Refresh every 3 seconds
  });

  const cancelMutation = useMutation({
    mutationFn: (taskIds: string[]) => apiClient.cancelTasks(taskIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
      notifications.show({
        title: t('common.success'),
        message: 'Task cancelled successfully',
        color: 'green',
      });
    },
    onError: (error: any) => {
      notifications.show({
        title: t('common.error'),
        message: error.message || t('errors.apiError'),
        color: 'red',
      });
    },
  });

  const handleCancel = (taskId: string) => {
    cancelMutation.mutate([taskId]);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
  };

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>{t('tasks.running')}</Title>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={handleRefresh}
          loading={isLoading}
        >
          {t('common.refresh')}
        </Button>
      </Group>

      {isLoading ? (
        <Text c="dimmed">{t('common.loading')}</Text>
      ) : runningTasks && runningTasks.length > 0 ? (
        <Stack gap="md">
          {runningTasks.map((task) => (
            <Card key={task.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <div>
                  <Text fw={500} size="lg">{task.name}</Text>
                  <Text size="sm" c="dimmed" ff="monospace">{task.id}</Text>
                </div>
                <Group>
                  <Badge color="blue" size="lg">{task.status}</Badge>
                  <ActionIcon
                    variant="subtle"
                    onClick={() => router.push(`/tasks?id=${task.id}`)}
                  >
                    <IconEye size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => handleCancel(task.id)}
                    loading={cancelMutation.isPending}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              </Group>
              <Progress value={(task.progress || 0) * 100} size="lg" radius="xl" />
              <Text size="sm" c="dimmed" mt="xs">
                {Math.round((task.progress || 0) * 100)}% complete
              </Text>
            </Card>
          ))}
        </Stack>
      ) : (
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center">{t('tasks.noTasks')}</Text>
        </Card>
      )}
    </Container>
  );
}

