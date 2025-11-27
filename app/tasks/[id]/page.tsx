'use client';

/**
 * Task Detail Page
 * 
 * Display detailed information about a task, including tree structure
 */

import { Container, Title, Button, Group, Card, Text, Badge, Stack, Code, Tabs, Progress } from '@mantine/core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, Task } from '@/lib/api/aipartnerupflow';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { IconArrowLeft, IconTree, IconInfoCircle, IconCode, IconFileText, IconPlayerPlay } from '@tabler/icons-react';
import { TaskTreeView } from '@/components/tasks/TaskTreeView';
import { use, useEffect, useRef } from 'react';

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Handle params which might be a Promise in Next.js 15+
  const resolvedParams = 'then' in params ? use(params) : params;
  const taskId = resolvedParams?.id || '';

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => {
      if (!taskId) {
        throw new Error('Task ID is required');
      }
      return apiClient.getTask(taskId);
    },
    enabled: !!taskId,
  });

  const { data: taskTree } = useQuery({
    queryKey: ['task-tree', taskId],
    queryFn: () => apiClient.getTaskTree(taskId),
    enabled: !!task && !!taskId,
  });

  const executeMutation = useMutation({
    mutationFn: (taskId: string) => {
      return apiClient.executeTask(
        taskId,
        true, // Enable streaming
        (event: any) => {
          // Handle SSE events in real-time
          queryClient.setQueryData(['task', taskId], (oldData: Task | undefined) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              status: event.status || oldData.status,
              progress: event.progress !== undefined ? event.progress : oldData.progress,
              result: event.result !== undefined ? event.result : oldData.result,
              error: event.error || oldData.error,
            };
          });

          // Invalidate queries to refresh tree view
          queryClient.invalidateQueries({ queryKey: ['task-tree', taskId] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['running-tasks'] });

          // Show notification on completion or failure
          if (event.final || event.type === 'stream_end') {
            if (event.status === 'completed') {
              notifications.show({
                title: 'Task Completed',
                message: 'Task execution completed successfully',
                color: 'green',
              });
            } else if (event.status === 'failed') {
              notifications.show({
                title: 'Task Failed',
                message: event.error || 'Task execution failed',
                color: 'red',
              });
            }
          }
        }
      );
    },
    onSuccess: (data) => {
      notifications.show({
        title: 'Success',
        message: data.message || 'Task execution started',
        color: 'green',
      });
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['running-tasks'] });
    },
    onError: (error: any) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Failed to execute task',
        color: 'red',
      });
    },
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      case 'in_progress':
        return 'blue';
      case 'cancelled':
        return 'gray';
      default:
        return 'yellow';
    }
  };

  if (isLoading) {
    return (
      <Container size="xl">
        <Text c="dimmed">{t('common.loading')}</Text>
      </Container>
    );
  }

  if (!task) {
    return (
      <Container size="xl">
        <Text c="red">{t('errors.taskNotFound')}</Text>
      </Container>
    );
  }

  return (
    <Container size="xl">
      <Group mb="xl" justify="space-between">
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => router.back()}
        >
          {t('common.back')}
        </Button>
        {(task.status === 'pending' || task.status === 'failed') && (
          <Button
            leftSection={<IconPlayerPlay size={16} />}
            onClick={() => executeMutation.mutate(taskId)}
            loading={executeMutation.isPending}
            color="blue"
          >
            Execute Task
          </Button>
        )}
      </Group>

      <Title order={1} mb="xl">{task.name}</Title>

      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconInfoCircle size={16} />}>
            {t('tasks.detail')}
          </Tabs.Tab>
          <Tabs.Tab value="tree" leftSection={<IconTree size={16} />}>
            Tree View
          </Tabs.Tab>
          <Tabs.Tab value="inputs" leftSection={<IconCode size={16} />}>
            {t('taskForm.inputs')}
          </Tabs.Tab>
          <Tabs.Tab value="result" leftSection={<IconFileText size={16} />}>
            Result
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Stack gap="md">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Text fw={500}>{t('tasks.status')}</Text>
                <Badge color={getStatusColor(task.status)} size="lg">
                  {task.status || 'pending'}
                </Badge>
              </Group>
              {task.progress !== undefined && (
                <>
                  <Text fw={500} mb="xs">{t('tasks.progress')}</Text>
                  <Progress value={(task.progress || 0) * 100} mb="md" />
                </>
              )}
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">{t('tasks.id')}</Text>
                  <Code>{task.id}</Code>
                </div>
                {task.parent_id && (
                  <div>
                    <Text size="sm" c="dimmed">Parent ID</Text>
                    <Code>{task.parent_id}</Code>
                  </div>
                )}
              </Group>
              {task.created_at && (
                <Group justify="space-between" mt="md">
                  <div>
                    <Text size="sm" c="dimmed">{t('tasks.createdAt')}</Text>
                    <Text size="sm">{new Date(task.created_at).toLocaleString()}</Text>
                  </div>
                  {task.updated_at && (
                    <div>
                      <Text size="sm" c="dimmed">{t('tasks.updatedAt')}</Text>
                      <Text size="sm">{new Date(task.updated_at).toLocaleString()}</Text>
                    </div>
                  )}
                </Group>
              )}
            </Card>

            {task.error && (
              <Card shadow="sm" padding="lg" radius="md" withBorder style={{ borderColor: 'var(--mantine-color-red-6)' }}>
                <Text fw={500} c="red" mb="xs">Error</Text>
                <Code block>{task.error}</Code>
              </Card>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="tree" pt="md">
          {taskTree ? (
            <TaskTreeView task={taskTree} />
          ) : (
            <Text c="dimmed">No tree data available</Text>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="inputs" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Code block>{JSON.stringify(task.inputs || {}, null, 2)}</Code>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="result" pt="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Code block>{JSON.stringify(task.result || {}, null, 2)}</Code>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

